import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  getAllRows,
  appendRow,
  updateRow,
  SHEETS,
  generateId,
  generateSequentialId
} from '../../utils/googleSheets';
import { mappingDonHang, mappingGiaoDich, DonHang, GiaoDich } from '../../utils/columnMapping';
import { getCompletedTransactionMap, updatePaymentStatusBasedOnTransactions } from '../../utils/paymentStatusSync';
import { updateInventoryAfterSale, parseProductsFromOrder } from '../../utils/inventoryManager';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all orders
        const orders = await getAllRows(SHEETS.DON_HANG, mappingDonHang);
        console.log('🔍 Raw orders from Google Sheets:', orders);

        // Get completed transactions map
        const completedTransactions = await getCompletedTransactionMap();

        // Update payment status based on transactions and fallback logic
        const ordersWithStatus = updatePaymentStatusBasedOnTransactions(
          orders,
          completedTransactions,
          'maDonHang',
          'trangThaiThanhToan',
          (order: DonHang) => order.ghiChu?.includes('Đã Thanh Toán') ? 'Đã thanh toán' : 'Chưa thanh toán'
        );

        console.log('🔍 Orders after processing:', ordersWithStatus.map((o: any) => ({
          maDonHang: o.maDonHang,
          trangThaiThanhToan: o.trangThaiThanhToan
        })));

        return res.status(200).json(ordersWithStatus);

      case 'POST':
        // Create new order
        const newOrder = req.body as Partial<DonHang>;
        
        // Validate required fields
        if (!newOrder.maKhachHang || !newOrder.danhSachSanPham) {
          return res.status(400).json({ 
            error: 'Thông tin khách hàng và sản phẩm là bắt buộc' 
          });
        }

        // Generate order ID if not provided
        const orderData = {
          ...newOrder,
          maDonHang: newOrder.maDonHang || await generateSequentialId('DH', SHEETS.DON_HANG, mappingDonHang, 'maDonHang'),
          ngayTao: newOrder.ngayTao || new Date().toISOString().split('T')[0],
          nhanVienTao: session.user?.name || session.user?.email || '',
          trangThaiThanhToan: newOrder.trangThaiThanhToan || 'Chưa thanh toán',
        };

        // Create order
        await appendRow(SHEETS.DON_HANG, mappingDonHang, orderData);
        
        // Create transaction record and update inventory if payment is completed
        if (orderData.trangThaiThanhToan === 'Đã thanh toán') {
          const transaction: Partial<GiaoDich> = {
            maGiaoDich: generateId('GD'),
            loaiGiaoDich: 'Thu',
            maThamChieu: orderData.maDonHang,
            maKhachHang: orderData.maKhachHang,
            tenKhachHang: orderData.tenKhachHang,
            soTien: orderData.thanhTien,
            phuongThuc: orderData.phuongThucThanhToan,
            ngayGiaoDich: orderData.ngayTao,
            noiDung: `Thanh toán đơn hàng ${orderData.maDonHang}`,
            trangThai: 'Hoàn thành',
            nhanVienXuLy: orderData.nhanVienTao,
          };

          await appendRow(SHEETS.GIAO_DICH, mappingGiaoDich, transaction);

          // Update inventory for sold products
          const soldProducts = parseProductsFromOrder(orderData.danhSachSanPham || '[]');
          if (soldProducts.length > 0) {
            console.log('📦 Updating inventory for', soldProducts.length, 'products');
            const inventoryResult = await updateInventoryAfterSale(soldProducts);

            if (!inventoryResult.success && inventoryResult.errors.length > 0) {
              console.log('⚠️ Inventory update had errors:', inventoryResult.errors);
              // Note: We don't fail the order creation, just log the errors
              // The order is still created but inventory might not be perfectly accurate
            } else {
              console.log('✅ Inventory updated successfully for order:', orderData.maDonHang);
            }
          }
        }
        
        return res.status(201).json({ 
          message: 'Tạo đơn hàng thành công',
          data: orderData 
        });

      case 'PUT':
        // Update order
        const { maDonHang, ...updates } = req.body;
        
        if (!maDonHang) {
          return res.status(400).json({ error: 'Mã đơn hàng là bắt buộc' });
        }

        // Get current order data
        const orders_list = await getAllRows(SHEETS.DON_HANG, mappingDonHang);
        const currentOrder = orders_list.find((o: DonHang) => o.maDonHang === maDonHang);
        
        if (!currentOrder) {
          return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
        }

        // Update order
        const updated = await updateRow(
          SHEETS.DON_HANG,
          mappingDonHang,
          'maDonHang',
          maDonHang,
          updates
        );
        
        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật đơn hàng' });
        }
        
        // Create transaction and update inventory if payment status changed to paid
        if (currentOrder.trangThaiThanhToan !== 'Đã thanh toán' &&
            updates.trangThaiThanhToan === 'Đã thanh toán') {
          const transaction: Partial<GiaoDich> = {
            maGiaoDich: generateId('GD'),
            loaiGiaoDich: 'Thu',
            maThamChieu: maDonHang,
            maKhachHang: currentOrder.maKhachHang,
            tenKhachHang: currentOrder.tenKhachHang,
            soTien: updates.thanhTien || currentOrder.thanhTien,
            phuongThuc: updates.phuongThucThanhToan || currentOrder.phuongThucThanhToan,
            ngayGiaoDich: new Date().toISOString().split('T')[0],
            noiDung: `Thanh toán đơn hàng ${maDonHang}`,
            trangThai: 'Hoàn thành',
            nhanVienXuLy: session.user?.name || session.user?.email || '',
          };

          await appendRow(SHEETS.GIAO_DICH, mappingGiaoDich, transaction);

          // Update inventory for sold products
          const soldProducts = parseProductsFromOrder(currentOrder.danhSachSanPham || '[]');
          if (soldProducts.length > 0) {
            console.log('📦 Updating inventory for payment confirmation of order:', maDonHang);
            const inventoryResult = await updateInventoryAfterSale(soldProducts);

            if (!inventoryResult.success && inventoryResult.errors.length > 0) {
              console.log('⚠️ Inventory update had errors:', inventoryResult.errors);
              // Return warning but don't fail the payment update
              return res.status(200).json({
                message: 'Cập nhật đơn hàng thành công',
                warning: 'Có lỗi khi cập nhật kho hàng',
                inventoryErrors: inventoryResult.errors
              });
            } else {
              console.log('✅ Inventory updated successfully for order:', maDonHang);
            }
          }
        }
        
        return res.status(200).json({ 
          message: 'Cập nhật đơn hàng thành công' 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi xử lý dữ liệu',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}