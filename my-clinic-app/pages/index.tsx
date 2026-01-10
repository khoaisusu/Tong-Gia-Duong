import React, { useState, useEffect, useRef } from 'react';
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
  CubeIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/formatting';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State for appointment date picker
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState<Date>(new Date());
  const [showAppointmentDatePicker, setShowAppointmentDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowAppointmentDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const [customers, orders, treatments, transactions, appointments] = await Promise.all([
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
          fetch('/api/lich-hen').then(async res => {
            console.log('✅ Lịch hẹn API:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log('📊 Lịch hẹn data:', Array.isArray(data) ? `${data.length} records` : 'Invalid data');
            return data;
          }).catch(err => {
            console.error('❌ Lỗi API lịch hẹn:', err);
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

        // Get today's appointments
        const todayAppointments = Array.isArray(appointments) ? appointments
          .filter((a: any) => {
            if (!a.ngayHen) return false;
            const appointmentDate = new Date(a.ngayHen);
            return appointmentDate.toDateString() === today.toDateString();
          })
          .sort((a: any, b: any) => {
            const timeA = a.gioHen || '00:00';
            const timeB = b.gioHen || '00:00';
            return timeA.localeCompare(timeB);
          })
          .slice(0, 4) : [];

        // Get recent activities
        const recentActivities: any[] = [];

        // Add new customers
        if (Array.isArray(customers)) {
          customers
            .filter((c: any) => c.ngayTao)
            .sort((a: any, b: any) => new Date(b.ngayTao).getTime() - new Date(a.ngayTao).getTime())
            .slice(0, 2)
            .forEach((c: any) => {
              recentActivities.push({
                type: 'customer',
                title: 'Khách hàng mới',
                description: `${c.hoVaTen} - ${c.soDienThoai}`,
                time: c.ngayTao,
                color: 'green'
              });
            });
        }

        // Add new treatments
        if (Array.isArray(treatments)) {
          treatments
            .filter((t: any) => t.ngayBatDau)
            .sort((a: any, b: any) => new Date(b.ngayBatDau).getTime() - new Date(a.ngayBatDau).getTime())
            .slice(0, 2)
            .forEach((t: any) => {
              recentActivities.push({
                type: 'treatment',
                title: 'Liệu trình mới',
                description: `${t.tenLieuTrinh || 'Liệu trình'} - ${t.soLuotDieuTri || 0} buổi`,
                time: t.ngayBatDau,
                color: 'blue'
              });
            });
        }

        // Add recent payments
        if (Array.isArray(transactions)) {
          transactions
            .filter((t: any) => t.ngayGiaoDich && t.loaiGiaoDich === 'Thu')
            .sort((a: any, b: any) => new Date(b.ngayGiaoDich).getTime() - new Date(a.ngayGiaoDich).getTime())
            .slice(0, 2)
            .forEach((t: any) => {
              recentActivities.push({
                type: 'payment',
                title: 'Thanh toán',
                description: `${t.noiDung || 'Thanh toán'} - ${formatCurrency(parseFloat(t.soTien || 0))}`,
                time: t.ngayGiaoDich,
                color: 'purple'
              });
            });
        }

        // Sort by time and take top 5
        recentActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        const topActivities = recentActivities.slice(0, 5);

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
          activeTreatments: Array.isArray(treatments) ? treatments.filter((t: any) => {
            const isActive = t.trangThai === 'Đang thực hiện';
            // Debug log to verify status values
            if (t.trangThai && t.trangThai.includes('thực hiện')) {
              console.log('🔍 Treatment status found:', t.trangThai, 'Match:', isActive);
            }
            return isActive;
          }).length : 0,
          monthlyRevenue: Array.isArray(orders) ? orders
            .filter((o: any) =>
              o.ngayTao &&
              new Date(o.ngayTao) >= startOfMonth
            )
            .reduce((sum: number, o: any) => sum + parseFloat(o.thanhTien || 0), 0) : 0,
          weeklyRevenue: Array.isArray(orders) ? orders
            .filter((o: any) =>
              o.ngayTao &&
              new Date(o.ngayTao) >= startOfWeek
            )
            .reduce((sum: number, o: any) => sum + parseFloat(o.thanhTien || 0), 0) : 0,
          pendingPayments: Array.isArray(orders) ? orders
            .filter((o: any) => o.trangThaiThanhToan === 'Chưa thanh toán')
            .reduce((sum: number, o: any) => sum + parseFloat(o.thanhTien || 0), 0) : 0,
          todayAppointments,
          recentActivities: topActivities,
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
          todayAppointments: [],
          recentActivities: [],
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

  // Query for appointments on selected date from treatment sessions
  const { data: selectedDateAppointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['appointments-by-date', selectedAppointmentDate.toDateString()],
    queryFn: async () => {
      const res = await fetch('/api/luot-tri-lieu');
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const sessions = await res.json();

      // Filter sessions for the selected date
      const filtered = Array.isArray(sessions) ? sessions
        .filter((s: any) => {
          if (!s.ngayThucHien) return false;
          const sessionDate = new Date(s.ngayThucHien);
          return sessionDate.toDateString() === selectedAppointmentDate.toDateString();
        })
        .map((s: any) => ({
          ...s,
          // Map fields for consistent display
          gioHen: s.gioBatDau || '00:00',
          tenKhachHang: s.tenKhachHang || 'Khách hàng',
          dichVu: s.dichVuThucHien || 'Không có thông tin dịch vụ',
          trangThai: s.trangThai || 'Chờ',
        }))
        .sort((a: any, b: any) => {
          const timeA = a.gioHen || '00:00';
          const timeB = b.gioHen || '00:00';
          return timeA.localeCompare(timeB);
        }) : [];

      return filtered;
    },
    enabled: !!session,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Helper function to check if selected date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Format the selected date for display
  const formatSelectedDate = (date: Date) => {
    if (isToday(date)) return 'hôm nay';
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric'
    });
  };

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
    { label: 'Sản phẩm', href: '/san-pham', icon: CubeIcon, color: 'bg-purple-500' },
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
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity: any, index: number) => {
                  const timeAgo = (() => {
                    const now = new Date();
                    const activityTime = new Date(activity.time);
                    const diffMs = now.getTime() - activityTime.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 60) return `${diffMins} phút trước`;
                    if (diffHours < 24) return `${diffHours} giờ trước`;
                    return `${diffDays} ngày trước`;
                  })();

                  const colorClasses = {
                    green: 'bg-green-500',
                    blue: 'bg-blue-500',
                    purple: 'bg-purple-500',
                    orange: 'bg-orange-500',
                    red: 'bg-red-500',
                  };

                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 ${colorClasses[activity.color as keyof typeof colorClasses] || 'bg-gray-500'} rounded-full mr-3`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{timeAgo}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Chưa có hoạt động nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Appointments with Date Picker */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Lịch hẹn {formatSelectedDate(selectedAppointmentDate)}
              </h2>
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setShowAppointmentDatePicker(!showAppointmentDatePicker)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                  title="Chọn ngày"
                >
                  <CalendarDaysIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                </button>

                {/* Date Picker Dropdown */}
                {showAppointmentDatePicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border p-4 z-50 w-72">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedAppointmentDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setSelectedAppointmentDate(newDate);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAppointmentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedAppointmentDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setSelectedAppointmentDate(newDate);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => {
                          setSelectedAppointmentDate(new Date());
                          setShowAppointmentDatePicker(false);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-primary-50 text-primary-600 rounded hover:bg-primary-100"
                      >
                        Hôm nay
                      </button>
                      <button
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          setSelectedAppointmentDate(yesterday);
                          setShowAppointmentDatePicker(false);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                      >
                        Hôm qua
                      </button>
                      <button
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setSelectedAppointmentDate(tomorrow);
                          setShowAppointmentDatePicker(false);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                      >
                        Ngày mai
                      </button>
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                        <div key={day} className="py-1 font-medium text-gray-500">{day}</div>
                      ))}
                      {(() => {
                        const year = selectedAppointmentDate.getFullYear();
                        const month = selectedAppointmentDate.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const today = new Date();

                        const days = [];
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<div key={`empty-${i}`} className="py-1"></div>);
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const date = new Date(year, month, day);
                          const isSelected = date.toDateString() === selectedAppointmentDate.toDateString();
                          const isTodayDate = date.toDateString() === today.toDateString();

                          days.push(
                            <button
                              key={day}
                              onClick={() => {
                                setSelectedAppointmentDate(date);
                                setShowAppointmentDatePicker(false);
                              }}
                              className={`py-1 rounded hover:bg-gray-100 ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' :
                                isTodayDate ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                                }`}
                            >
                              {day}
                            </button>
                          );
                        }
                        return days;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {isLoadingAppointments ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-sm">Đang tải...</p>
                </div>
              ) : selectedDateAppointments.length > 0 ? (
                selectedDateAppointments.slice(0, 4).map((appointment: any, index: number) => {
                  const currentTime = new Date().toTimeString().slice(0, 5);
                  const appointmentTime = appointment.gioHen || '00:00';
                  const isPast = appointmentTime < currentTime && isToday(selectedAppointmentDate);
                  const isUpcoming = !isPast && isToday(selectedAppointmentDate) &&
                    (parseInt(appointmentTime.split(':')[0]) - parseInt(currentTime.split(':')[0])) <= 1;

                  const statusConfig = appointment.trangThai === 'Hoàn thành'
                    ? { label: 'Hoàn thành', bg: 'bg-green-100', text: 'text-green-800' }
                    : appointment.trangThai === 'Đã hủy'
                      ? { label: 'Đã hủy', bg: 'bg-red-100', text: 'text-red-800' }
                      : isUpcoming
                        ? { label: 'Sắp tới', bg: 'bg-yellow-100', text: 'text-yellow-800' }
                        : { label: 'Chờ', bg: 'bg-gray-100', text: 'text-gray-600' };

                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appointmentTime} - {appointment.tenKhachHang || 'Khách hàng'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appointment.dichVu || 'Không có thông tin dịch vụ'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} rounded-full`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Không có lịch hẹn nào {formatSelectedDate(selectedAppointmentDate)}</p>
                </div>
              )}
            </div>

            {selectedDateAppointments.length > 4 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                +{selectedDateAppointments.length - 4} lịch hẹn khác
              </p>
            )}

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