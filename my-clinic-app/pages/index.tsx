import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import {
  UserGroupIcon,
  ShoppingBagIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/formatting';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    }
  }, [session, status, router]);

  // Fetch dashboard statistics
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      console.log('🔄 Bắt đầu fetch dashboard data...');
      const startTime = Date.now();
      
      try {
        console.log('📡 Gọi API parallel...');
        const [customers, orders, treatments, transactions] = await Promise.all([
          fetch('/api/khach-hang').then(async res => {
            console.log('✅ Khách hàng API:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log('📊 Khách hàng data:', Array.isArray(data) ? `${data.length} records` : 'Invalid data');
            return data;
          }).catch(err => {
            console.error('❌ Lỗi API khách hàng:', err);
            return [];
          }),
          fetch('/api/don-hang').then(async res => {
            console.log('✅ Đơn hàng API:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log('📊 Đơn hàng data:', Array.isArray(data) ? `${data.length} records` : 'Invalid data');
            return data;
          }).catch(err => {
            console.error('❌ Lỗi API đơn hàng:', err);
            return [];
          }),
          fetch('/api/lieu-trinh').then(async res => {
            console.log('✅ Liệu trình API:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log('📊 Liệu trình data:', Array.isArray(data) ? `${data.length} records` : 'Invalid data');
            return data;
          }).catch(err => {
            console.error('❌ Lỗi API liệu trình:', err);
            return [];
          }),
          fetch('/api/giao-dich').then(async res => {
            console.log('✅ Giao dịch API:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log('📊 Giao dịch data:', Array.isArray(data) ? `${data.length} records` : 'Invalid data');
            return data;
          }).catch(err => {
            console.error('❌ Lỗi API giao dịch:', err);
            return [];
          }),
        ]);

        // Calculate statistics
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const endTime = Date.now();
        console.log(`⏱️ Dashboard data fetch hoàn thành trong ${endTime - startTime}ms`);
        
        const stats = {
          totalCustomers: Array.isArray(customers) ? customers.length : 0,
          newCustomersMonth: Array.isArray(customers) ? customers.filter((c: any) => 
            c.ngayTao && new Date(c.ngayTao) >= startOfMonth
          ).length : 0,
          totalOrders: Array.isArray(orders) ? orders.length : 0,
          ordersToday: Array.isArray(orders) ? orders.filter((o: any) => {
            if (!o.ngayTao) return false;
            const orderDate = new Date(o.ngayTao);
            return orderDate.toDateString() === today.toDateString();
          }).length : 0,
          activeTreatments: Array.isArray(treatments) ? treatments.filter((t: any) => 
            t.trangThai === 'Đang thực hiện'
          ).length : 0,
          monthlyRevenue: Array.isArray(transactions) ? transactions
            .filter((t: any) => t.ngayGiaoDich && new Date(t.ngayGiaoDich) >= startOfMonth)
            .reduce((sum: number, t: any) => sum + parseFloat(t.soTien || 0), 0) : 0,
          weeklyRevenue: Array.isArray(transactions) ? transactions
            .filter((t: any) => t.ngayGiaoDich && new Date(t.ngayGiaoDich) >= startOfWeek)
            .reduce((sum: number, t: any) => sum + parseFloat(t.soTien || 0), 0) : 0,
          pendingPayments: Array.isArray(orders) ? orders
            .filter((o: any) => o.trangThaiThanhToan === 'Chưa thanh toán')
            .reduce((sum: number, o: any) => sum + parseFloat(o.thanhTien || 0), 0) : 0,
        };
        
        console.log('📈 Stats tính toán:', stats);
        return stats;
      } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        // Return default stats on error
        return {
          totalCustomers: 0,
          newCustomersMonth: 0,
          totalOrders: 0,
          ordersToday: 0,
          activeTreatments: 0,
          monthlyRevenue: 0,
          weeklyRevenue: 0,
          pendingPayments: 0,
        };
      }
    },
    enabled: !!session,
    retry: 1, // Only retry once
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  if (status === 'loading') {
    return (
      <Layout title="Tổng quan">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang xác thực người dùng...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout title="Tổng quan">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">Đang tải dữ liệu trang tổng quan...</p>
            <p className="text-sm text-gray-500">Vui lòng kiểm tra console để xem chi tiết</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Tổng quan">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Có lỗi xảy ra</h3>
            <p className="text-gray-600 mb-4">Không thể tải dữ liệu trang tổng quan</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const quickActions = [
    { label: 'Thêm khách hàng', href: '/khach-hang', icon: UserGroupIcon, color: 'bg-blue-500' },
    { label: 'Tạo đơn hàng', href: '/don-hang/tao-moi', icon: ShoppingBagIcon, color: 'bg-green-500' },
    { label: 'Tạo liệu trình', href: '/lieu-trinh/tao-moi', icon: HeartIcon, color: 'bg-purple-500' },
    { label: 'Lịch hẹn hôm nay', href: '/lich-hen', icon: CalendarDaysIcon, color: 'bg-orange-500' },
  ];

  return (
    <Layout title="Tổng quan">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Chào mừng trở lại, {session?.user?.name}!
          </h1>
          <p className="text-primary-100">
            {new Date().toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Customers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng khách hàng</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalCustomers || 0}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +{stats?.newCustomersMonth || 0} tháng này
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Doanh thu tháng</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.monthlyRevenue || 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Tuần này: {formatCurrency(stats?.weeklyRevenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Active Treatments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Liệu trình đang thực hiện</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.activeTreatments || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Đang điều trị
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <HeartIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ thanh toán</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.pendingPayments || 0)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Cần thu
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ClockIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-3 ${action.color} rounded-full mb-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 text-center">
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent Activities & Today's Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h2>
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Khách hàng mới</p>
                    <p className="text-xs text-gray-500">Nguyễn Văn A - 10:30</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">2 giờ trước</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Liệu trình mới</p>
                    <p className="text-xs text-gray-500">Gói xoa bóp toàn thân - 5 buổi</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">3 giờ trước</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Thanh toán</p>
                    <p className="text-xs text-gray-500">Đơn hàng #DH001 - 500,000đ</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">4 giờ trước</span>
              </div>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Lịch hẹn hôm nay</h2>
              <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">09:00 - Trần Thị B</p>
                  <p className="text-xs text-gray-500">Xoa bóp bấm huyệt</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  Sắp tới
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">10:30 - Lê Văn C</p>
                  <p className="text-xs text-gray-500">Châm cứu</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  Chờ
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">14:00 - Phạm Thị D</p>
                  <p className="text-xs text-gray-500">Điều trị đau lưng</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  Chờ
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">16:00 - Hoàng Văn E</p>
                  <p className="text-xs text-gray-500">Phục hồi chức năng</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  Chờ
                </span>
              </div>
            </div>
            <Link
              href="/lich-hen"
              className="mt-4 block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Xem tất cả lịch hẹn →
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}