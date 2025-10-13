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
import { validateRequest, OrderSchema } from '../../utils/inputValidation';
import { withTransaction } from '../../utils/transactionManager';

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
        // Create new order with validation and transaction safety
        const newOrder = req.body as Partial<DonHang>;

        // ✅ Step 1: Validate and sanitize input
        const orderValidation = validateRequest(newOrder, OrderSchema);
        if (!orderValidation.valid) {
          console.warn('❌ Order validation failed:', orderValidation.errors);
          return res.status(400).json({
            error: 'Dữ liệu đơn hàng không hợp lệ',
            details: orderValidation.errors
          });
        }

        const sanitizedOrder = orderValidation.data!;

        // ✅ Step 2: Generate order ID if not provided
        const orderData = {
          ...sanitizedOrder,
          maDonHang: sanitizedOrder.maDonHang || await generateSequentialId('DH', SHEETS.DON_HANG, mappingDonHang, 'maDonHang'),
          ngayTao: sanitizedOrder.ngayTao || new Date().toISOString().split('T')[0],
          nhanVienTao: session.user?.name || session.user?.email || '',
          trangThaiThanhToan: sanitizedOrder.trangThaiThanhToan || 'Chưa thanh toán',
        };

        // ✅ Step 3: Use transaction for atomic order creation
        try {
          await withTransaction(async (tx) => {
            // Create order
            await tx.create(SHEETS.DON_HANG, mappingDonHang, orderData);

            // Create transaction record if payment is completed
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

              await tx.create(SHEETS.GIAO_DICH, mappingGiaoDich, transaction);

              console.log('✅ Order and transaction created in atomic transaction');
            }
          });

          // ✅ Step 4: Update inventory (outside transaction - can be retried separately)
          if (orderData.trangThaiThanhToan === 'Đã thanh toán') {
            const soldProducts = parseProductsFromOrder(orderData.danhSachSanPham || '[]');
            if (soldProducts.length > 0) {
              console.log('📦 Updating inventory for', soldProducts.length, 'products');
              const inventoryResult = await updateInventoryAfterSale(soldProducts);

              if (!inventoryResult.success && inventoryResult.errors.length > 0) {
                console.warn('⚠️ Inventory update had errors:', inventoryResult.errors);
                // Order and transaction are created, but inventory might need manual correction
                return res.status(201).json({
                  message: 'Tạo đơn hàng thành công',
                  warning: 'Có lỗi khi cập nhật kho hàng',
                  data: orderData,
                  inventoryErrors: inventoryResult.errors
                });
              }

              console.log('✅ Inventory updated successfully for order:', orderData.maDonHang);
            }
          }

          return res.status(201).json({
            message: 'Tạo đơn hàng thành công',
            data: orderData
          });
        } catch (error) {
          console.error('❌ Order creation failed, transaction rolled back:', error);
          return res.status(500).json({
            error: 'Không thể tạo đơn hàng',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

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