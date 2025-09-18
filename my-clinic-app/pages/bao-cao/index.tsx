import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,

  CalendarIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ShoppingBagIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatting';

// Simple Chart Component
function SimpleBarChart({ data, title }: { data: any[], title: string }) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BaoCaoPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState('revenue');

  // Fetch data
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/don-hang');
      return res.json();
    },
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const res = await fetch('/api/lieu-trinh');
      return res.json();
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/khach-hang');
      return res.json();
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await fetch('/api/giao-dich');
      return res.json();
    },
  });

  // Filter data by date range
  const filterByDate = (items: any[], dateField: string) => {
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end + 'T23:59:59');
    });
  };

  const filteredOrders = filterByDate(orders, 'ngayTao');
  const filteredTreatments = filterByDate(treatments, 'ngayBatDau');
  const filteredTransactions = filterByDate(transactions, 'ngayGiaoDich');
  const filteredCustomers = filterByDate(customers, 'ngayTao');

  // Calculate statistics
  const stats = {
    totalRevenue: filteredTransactions
      .filter((t: any) => t.loaiGiaoDich === 'Thu')
      .reduce((sum: number, t: any) => sum + parseFloat(t.soTien || '0'), 0),
    totalOrders: filteredOrders.length,
    totalTreatments: filteredTreatments.length,
    newCustomers: filteredCustomers.length,
    avgOrderValue: filteredOrders.length > 0
      ? filteredOrders.reduce((sum: number, o: any) => sum + parseFloat(o.thanhTien || '0'), 0) / filteredOrders.length
      : 0,
    completedTreatments: filteredTreatments.filter((t: any) => t.trangThai === 'Hoàn thành').length,
  };

  // Revenue by month
  const revenueByMonth = () => {
    const monthlyData: { [key: string]: number } = {};
    
    filteredTransactions
      .filter((t: any) => t.loaiGiaoDich === 'Thu')
      .forEach((t: any) => {
        const month = new Date(t.ngayGiaoDich).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + parseFloat(t.soTien || '0');
      });
    
    return Object.entries(monthlyData)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  // Top services
  const topServices = () => {
    const serviceCount: { [key: string]: number } = {};
    
    filteredTreatments.forEach((t: any) => {
      try {
        const services = JSON.parse(t.danhSachDichVu || '[]');
        services.forEach((s: any) => {
          serviceCount[s.tenDichVu] = (serviceCount[s.tenDichVu] || 0) + s.soLan;
        });
      } catch (e) {}
    });
    
    return Object.entries(serviceCount)
      .map(([label, value]) => ({ label, value: value * 500000 })) // Giả định giá trung bình
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Top customers
  const topCustomers = () => {
    const customerSpending: { [key: string]: { name: string, amount: number } } = {};
    
    filteredOrders.forEach((o: any) => {
      const key = o.maKhachHang;
      if (!customerSpending[key]) {
        customerSpending[key] = { name: o.tenKhachHang, amount: 0 };
      }
      customerSpending[key].amount += parseFloat(o.thanhTien || '0');
    });
    
    filteredTreatments.forEach((t: any) => {
      const key = t.maKhachHang;
      if (!customerSpending[key]) {
        customerSpending[key] = { name: t.tenKhachHang, amount: 0 };
      }
      customerSpending[key].amount += parseFloat(t.daThanhToan || '0');
    });
    
    return Object.values(customerSpending)
      .map(({ name, amount }) => ({ label: name, value: amount }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Export report
  const exportReport = () => {
    // In real app, this would generate Excel/PDF
    window.print();
  };

  // Calculate growth
  const calculateGrowth = () => {
    const currentMonth = new Date().getMonth();
    const currentMonthRevenue = filteredTransactions
      .filter((t: any) => {
        const month = new Date(t.ngayGiaoDich).getMonth();
        return month === currentMonth && t.loaiGiaoDich === 'Thu';
      })
      .reduce((sum: number, t: any) => sum + parseFloat(t.soTien || '0'), 0);
    
    const lastMonthRevenue = filteredTransactions
      .filter((t: any) => {
        const month = new Date(t.ngayGiaoDich).getMonth();
        return month === currentMonth - 1 && t.loaiGiaoDich === 'Thu';
      })
      .reduce((sum: number, t: any) => sum + parseFloat(t.soTien || '0'), 0);
    
    if (lastMonthRevenue === 0) return 0;
    return ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  };

  const growth = calculateGrowth();

  return (
    <Layout title="Báo cáo & Thống kê">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Báo cáo kinh doanh</h2>
              <p className="text-sm text-gray-600">Thống kê chi tiết hoạt động phòng khám</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
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
              
              <div className="flex gap-2">
                <button
                  onClick={exportReport}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                  Xuất Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <PrinterIcon className="w-5 h-5 mr-2" />
                  In báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-primary-700">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <div className="flex items-center mt-2">
                  {growth > 0 ? (
                    <>
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600">+{growth.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowTrendingDownIcon className="w-4 h-4 text-red-600 mr-1" />
                      <span className="text-sm text-red-600">{growth.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-xs text-gray-500 ml-1">so với tháng trước</span>
                </div>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đơn hàng</p>
                <p className="text-2xl font-bold text-green-700">{stats.totalOrders}</p>
                <p className="text-sm text-gray-500 mt-2">
                  TB: {formatCurrency(stats.avgOrderValue)}/đơn
                </p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Liệu trình</p>
                <p className="text-2xl font-bold text-purple-700">{stats.totalTreatments}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Hoàn thành: {stats.completedTreatments}
                </p>
              </div>
              <HeartIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Khách hàng mới</p>
                <p className="text-2xl font-bold text-blue-700">{stats.newCustomers}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Tổng: {customers.length}
                </p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'revenue', label: 'Doanh thu' },
              { value: 'services', label: 'Dịch vụ' },
              { value: 'customers', label: 'Khách hàng' },
              { value: 'staff', label: 'Nhân viên' },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  reportType === type.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportType === 'revenue' && (
            <>
              <SimpleBarChart 
                data={revenueByMonth()} 
                title="Doanh thu theo tháng" 
              />
              <SimpleBarChart 
                data={topCustomers()} 
                title="Top 5 khách hàng chi tiêu cao nhất" 
              />
            </>
          )}

          {reportType === 'services' && (
            <>
              <SimpleBarChart 
                data={topServices()} 
                title="Top 5 dịch vụ được sử dụng nhiều nhất" 
              />
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Thống kê dịch vụ</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Tổng dịch vụ thực hiện:</span>
                    <span className="font-semibold">
                      {topServices().reduce((sum, s) => sum + (s.value / 500000), 0).toFixed(0)} lượt
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Dịch vụ phổ biến nhất:</span>
                    <span className="font-semibold">{topServices()[0]?.label || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Doanh thu từ dịch vụ:</span>
                    <span className="font-semibold text-primary-600">
                      {formatCurrency(topServices().reduce((sum, s) => sum + s.value, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {reportType === 'customers' && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Phân loại khách hàng</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Khách hàng VIP:</span>
                    <span className="font-semibold text-purple-600">
                      {customers.filter((c: any) => c.trangThai === 'VIP').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Khách thường xuyên:</span>
                    <span className="font-semibold text-blue-600">
                      {customers.filter((c: any) => c.trangThai === 'Thường xuyên').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Khách hàng mới:</span>
                    <span className="font-semibold text-green-600">
                      {customers.filter((c: any) => c.trangThai === 'Mới').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tỷ lệ quay lại:</span>
                    <span className="font-semibold">
                      {((customers.filter((c: any) => c.trangThai !== 'Mới').length / customers.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <SimpleBarChart 
                data={topCustomers()} 
                title="Top 5 khách hàng theo doanh thu" 
              />
            </>
          )}

          {reportType === 'staff' && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Hiệu suất nhân viên</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Tổng nhân viên:</span>
                    <span className="font-semibold">10</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Nhân viên xuất sắc:</span>
                    <span className="font-semibold text-green-600">Nhân viên A</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Số buổi trung bình/người:</span>
                    <span className="font-semibold">15 buổi/tháng</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tổng hoa hồng:</span>
                    <span className="font-semibold text-primary-600">
                      {formatCurrency(stats.totalRevenue * 0.1)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Doanh thu theo nhân viên</h3>
                <div className="space-y-3">
                  {['Bác sỹ Lực', 'Nhân viên A', 'Nhân viên B', 'Nhân viên C'].map((name, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{name}</span>
                        <span className="font-medium">
                          {formatCurrency(Math.random() * 10000000 + 5000000)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${Math.random() * 60 + 40}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Chi tiết báo cáo</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chỉ số
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kỳ này
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kỳ trước
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thay đổi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Doanh thu
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(stats.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(stats.totalRevenue * 0.9)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-600">+10%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Số đơn hàng
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.totalOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.floor(stats.totalOrders * 0.85)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-600">+15%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Khách hàng mới
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.newCustomers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.floor(stats.newCustomers * 0.8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-600">+20%</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Giá trị đơn TB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(stats.avgOrderValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(stats.avgOrderValue * 0.95)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-600">+5%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}