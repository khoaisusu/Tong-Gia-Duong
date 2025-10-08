import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  EyeIcon,
  PrinterIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { DonHang } from '../../utils/columnMapping';
import { formatCurrency } from '../../utils/formatting';
import toast from 'react-hot-toast';

export default function DonHangPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedOrder, setSelectedOrder] = useState<DonHang | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/don-hang');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      console.log('🔍 Orders data from API:', data);
      console.log('🔍 Sample order structure:', data[0]);
      console.log('🔍 Payment statuses found:', Array.from(new Set(data.map((o: any) => o.trangThaiThanhToan))));
      return data;
    },
  });

  // Fetch customers for mapping
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/khach-hang');
      return res.json();
    },
  });

  // Payment status options
  const paymentStatuses = [
    'Tất cả',
    'Đã thanh toán',
    'Chưa thanh toán',
    'Thanh toán một phần'
  ];

  // Filter and sort orders
  const filteredOrders = orders
    .filter((order: DonHang) => {
      const matchesSearch =
        order.maDonHang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tenKhachHang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.maKhachHang?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'Tất cả' || order.trangThaiThanhToan === selectedStatus;

      const orderDate = new Date(order.ngayTao);
      const matchesDateRange =
        orderDate >= new Date(dateRange.start) &&
        orderDate <= new Date(dateRange.end + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesDateRange;
    })
    .sort((a: DonHang, b: DonHang) => {
      // Sort by creation date descending (newest first)
      const dateA = new Date(a.ngayTao);
      const dateB = new Date(b.ngayTao);
      return dateB.getTime() - dateA.getTime();
    });

  // Calculate statistics
  const stats = {
    totalOrders: filteredOrders.length,
    totalRevenue: filteredOrders.reduce((sum: number, order: DonHang) => {
      const amount = parseFloat(order.thanhTien || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0),
    paidOrders: filteredOrders.filter((o: DonHang) => o.trangThaiThanhToan === 'Đã thanh toán').length,
    pendingPayment: filteredOrders.filter((o: DonHang) => o.trangThaiThanhToan === 'Chưa thanh toán').length,
  };

  // View order details
  const viewOrderDetails = (order: DonHang) => {
    setSelectedOrder(order);
  };


  // Update payment status
  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    // Prevent duplicate calls
    if (updatingOrderId === orderId) {
      console.log('⚠️ Update already in progress for order:', orderId);
      return;
    }

    try {
      setUpdatingOrderId(orderId);
      console.log('🔄 Updating payment status for order:', orderId, 'to:', newStatus);

      const res = await fetch(`/api/don-hang`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maDonHang: orderId,
          trangThaiThanhToan: newStatus,
        }),
      });

      if (res.ok) {
        const result = await res.json();

        // Check if there were inventory warnings
        if (result.warning && result.inventoryErrors) {
          toast.success('Cập nhật trạng thái thành công!');
          toast.error(`Cảnh báo kho hàng: ${result.inventoryErrors.join(', ')}`, {
            duration: 6000
          });
          console.log('⚠️ Inventory warnings:', result.inventoryErrors);
        } else {
          toast.success('Cập nhật trạng thái thành công!');
        }

        // Refetch orders to get updated data
        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        console.log('✅ Orders data refreshed');
      } else {
        throw new Error('Failed to update payment status');
      }
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      toast.error('Có lỗi xảy ra!');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <Layout title="Quản lý đơn hàng">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã đơn, tên khách hàng..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-gray-500">đến</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              
              <button
                onClick={() => router.push('/don-hang/tao-moi')}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Tạo đơn hàng
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng đơn hàng</p>
                <p className="text-2xl font-bold text-primary-700">{stats.totalOrders}</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng doanh thu</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã thanh toán</p>
                <p className="text-2xl font-bold text-blue-600">{stats.paidOrders}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ thanh toán</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingPayment}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            {paymentStatuses.map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên thường gọi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giảm giá
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thành tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phương thức
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái thanh toán
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order: DonHang) => {
                    console.log('🔍 Rendering order:', {
                      maDonHang: order.maDonHang,
                      trangThaiThanhToan: order.trangThaiThanhToan,
                      ghiChu: order.ghiChu
                    });

                    // Find customer by maKhachHang to get tenThuongGoi
                    const customer = customers.find((c: any) => c.maKhachHang === order.maKhachHang);

                    return (
                    <tr key={order.maDonHang} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer?.tenThuongGoi || order.tenKhachHang}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.tenKhachHang}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.ngayTao).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.tongTien)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {order.giamGia && parseFloat(order.giamGia) > 0 
                          ? `-${formatCurrency(order.giamGia)}` 
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-600">
                        {formatCurrency(order.thanhTien)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.phuongThucThanhToan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.trangThaiThanhToan === 'Đã thanh toán'
                            ? 'bg-green-100 text-green-800'
                            : order.trangThaiThanhToan === 'Chưa thanh toán'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.trangThaiThanhToan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => viewOrderDetails(order)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="text-gray-600 hover:text-gray-900"
                          title="In đơn hàng"
                        >
                          <PrinterIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Không tìm thấy đơn hàng nào
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updatePaymentStatus}
          updatingOrderId={updatingOrderId}
        />
      )}
    </Layout>
  );
}

// Order Details Modal Component
function OrderDetailsModal({ order, onClose, onUpdateStatus, updatingOrderId }: any) {
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalSessions, setTotalSessions] = useState(1);

  useEffect(() => {
    // Fetch treatment data to get services
    const fetchTreatmentData = async () => {
      try {
        const res = await fetch('/api/lieu-trinh');
        if (res.ok) {
          const treatments = await res.json();
          // Find treatment that matches this order (by customer and similar timeframe)
          const matchingTreatment = treatments.find((t: any) =>
            t.maKhachHang === order.maKhachHang &&
            t.ngayBatDau === order.ngayTao
          );

          if (matchingTreatment) {
            // Get total sessions from treatment
            const sessions = parseInt(matchingTreatment.soBuoi || '1');
            setTotalSessions(sessions);

            // Parse services from treatment and multiply by total sessions
            const treatmentServices = JSON.parse(matchingTreatment.danhSachDichVu || '[]');
            const servicesWithSessionCalculation = treatmentServices.map((service: any) => ({
              ...service,
              soLuong: sessions, // Show total sessions as quantity
              thanhTienTotal: parseFloat(service.thanhTien || service.gia || '0') * sessions // Calculate total for all sessions
            }));
            setServices(servicesWithSessionCalculation);

            // Get products from order's danhSachSanPham (with correct quantities)
            try {
              const orderProducts = JSON.parse(order.danhSachSanPham || '[]');
              // Filter out treatment name entry, keep only actual products
              const actualProducts = orderProducts.filter((item: any) =>
                !item.tenSanPham?.includes('Liệu trình') &&
                (item.maSanPham || item.tenSanPham)
              );

              const productsWithCorrectAmount = actualProducts.map((product: any) => ({
                ...product,
                thanhTienTotal: parseFloat(product.thanhTien || (product.gia || product.giaBan || '0') * (product.soLuong || 1))
              }));
              setProducts(productsWithCorrectAmount);
            } catch (e) {
              console.error('Error parsing order products:', e);
              setProducts([]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching treatment data:', error);
        // Fallback to order products if treatment fetch fails
        try {
          const orderProducts = JSON.parse(order.danhSachSanPham || '[]');
          setProducts(orderProducts);
        } catch (e) {
          console.error('Error parsing order products:', e);
        }
      }
    };

    fetchTreatmentData();
  }, [order]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-3xl w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Chi tiết đơn hàng #{order.maDonHang}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Khách hàng</p>
              <p className="font-medium">{order.tenKhachHang}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ngày tạo</p>
              <p className="font-medium">{new Date(order.ngayTao).toLocaleDateString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phương thức thanh toán</p>
              <p className="font-medium">{order.phuongThucThanhToan}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Trạng thái</p>
              <p className="font-medium">{order.trangThaiThanhToan}</p>
            </div>
          </div>
          
          {/* Services Section */}
          {services.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Dịch vụ điều trị</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Dịch vụ</th>
                    <th className="px-4 py-2 text-right">Số buổi</th>
                    <th className="px-4 py-2 text-right">Đơn giá/buổi</th>
                    <th className="px-4 py-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{service.tenDichVu}</td>
                      <td className="px-4 py-2 text-right">{service.soLuong}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(service.gia)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(service.thanhTienTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Products Section */}
          {products.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Sản phẩm kèm theo</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Sản phẩm</th>
                    <th className="px-4 py-2 text-right">Số lượng</th>
                    <th className="px-4 py-2 text-right">Đơn giá</th>
                    <th className="px-4 py-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{item.tenSanPham}</td>
                      <td className="px-4 py-2 text-right">{item.soLuong}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.gia || item.giaBan)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.thanhTienTotal || item.thanhTien)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Section */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <tfoot>
                <tr className="font-medium">
                  <td colSpan={3} className="px-4 py-2 text-right">Tổng cộng:</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(order.tongTien)}</td>
                </tr>
                {order.giamGia && parseFloat(order.giamGia) > 0 && (
                  <tr className="text-red-600">
                    <td colSpan={3} className="px-4 py-2 text-right">Giảm giá:</td>
                    <td className="px-4 py-2 text-right">-{formatCurrency(order.giamGia)}</td>
                  </tr>
                )}
                <tr className="text-lg font-bold text-primary-600">
                  <td colSpan={3} className="px-4 py-2 text-right">Thành tiền:</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(order.thanhTien)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {order.ghiChu && (
            <div className="mb-6">
              <p className="text-sm text-gray-600">Ghi chú</p>
              <p className="mt-1">{order.ghiChu}</p>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}