import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import {
  CurrencyDollarIcon,
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatting';
import { EmployeeSalarySummary, SalarySummaryResponse } from '../api/salary-summary';

interface SalaryFilters {
  from: string;
  to: string;
  employeeId: string;
  searchTerm: string;
}



export default function SalaryManagementPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SalaryFilters>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    employeeId: '',
    searchTerm: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSalarySummary | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch salary data
  const { data: salaryData, isLoading, error, refetch } = useQuery<SalarySummaryResponse>({
    queryKey: ['salary-summary', filters.from, filters.to, filters.employeeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);

      const res = await fetch(`/api/salary-summary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch salary data');
      return res.json();
    },
  });


  // Filter employees by search term
  const filteredEmployees = salaryData?.employees.filter(emp =>
    emp.hoVaTen.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
    emp.maNhanVien.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
    emp.chucVu.toLowerCase().includes(filters.searchTerm.toLowerCase())
  ) || [];

  const exportToCSV = () => {
    if (!salaryData?.employees) return;

    const headers = [
      'Mã NV',
      'Họ và tên',
      'Chức vụ',
      'Lương cơ bản (VNĐ)',
      'Phụ cấp (VNĐ)',
      'Hoa hồng (VNĐ)',
      'Lương quản lý (VNĐ)',
      'Tổng lương (VNĐ)',
      'Số buổi làm'
    ];

    const rows = salaryData.employees.map(emp => [
      emp.maNhanVien,
      emp.hoVaTen,
      emp.chucVu,
      emp.totalBasicSalary.toString(),
      emp.totalAllowance.toString(),
      emp.totalCommission.toString(),
      emp.totalManagementSalary.toString(),
      (emp.totalBasicSalary + emp.totalAllowance + emp.totalCommission + emp.totalManagementSalary).toString(),
      emp.totalSessions.toString()
    ]);

    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bang-luong-${filters.from}-${filters.to}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <Layout title="Quản lý lương nhân viên">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Đang tải dữ liệu lương...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Quản lý lương nhân viên">
        <div className="text-center py-8">
          <p className="text-red-600">Lỗi tải dữ liệu: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Thử lại
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Quản lý lương nhân viên">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý lương</h1>
              <p className="text-gray-600">
                Theo dõi hoa hồng và lương quản lý nhân viên
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/cau-hinh-luong')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Cog6ToothIcon className="w-5 h-5 mr-2" />
                Cấu hình lương
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FunnelIcon className="w-5 h-5 mr-2" />
                Bộ lọc
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                Xuất Excel
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tìm kiếm
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={filters.searchTerm}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                      placeholder="Tên, mã NV, chức vụ..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => refetch()}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Nhân viên</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredEmployees.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="w-6 h-6 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Lương cơ bản</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(salaryData?.totalBasicSalary || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="w-6 h-6 text-orange-500" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Phụ cấp</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(salaryData?.totalAllowance || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Hoa hồng</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(salaryData?.totalCommission || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Lương QL</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(salaryData?.totalManagementSalary || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Tổng buổi</p>
                <p className="text-lg font-bold text-gray-900">
                  {salaryData?.totalSessions || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Salary Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Bảng lương chi tiết ({filteredEmployees.length} nhân viên)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lương CB
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phụ cấp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoa hồng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lương QL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng lương
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buổi làm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => {
                  const totalSalary = employee.totalBasicSalary + employee.totalAllowance + employee.totalCommission + employee.totalManagementSalary;

                  return (
                    <tr key={employee.maNhanVien} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {employee.hoVaTen}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.maNhanVien} • {employee.chucVu}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">
                          {formatCurrency(employee.totalBasicSalary)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-orange-600">
                          {formatCurrency(employee.totalAllowance)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(employee.totalCommission)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-purple-600">
                          {formatCurrency(employee.totalManagementSalary)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(totalSalary)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {employee.totalSessions} buổi
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedEmployee(employee)}
                          className="text-primary-600 hover:text-primary-900 flex items-center"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Không có dữ liệu lương trong khoảng thời gian đã chọn</p>
            </div>
          )}
        </div>
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeSalaryDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </Layout>
  );
}

// Employee Salary Detail Modal Component
function EmployeeSalaryDetailModal({ employee, onClose }: {
  employee: EmployeeSalarySummary;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'monthly'>('sessions');

  const monthlyData = Object.entries(employee.periodSummary)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, data]) => ({
      month,
      ...data,
      total: data.basicSalary + data.allowance + data.commission + data.managementSalary
    }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Chi tiết lương: {employee.hoVaTen}
              </h3>
              <p className="text-gray-600">
                {employee.maNhanVien} • {employee.chucVu}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Lương cơ bản</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(employee.totalBasicSalary)}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-600">Phụ cấp</p>
              <p className="text-xl font-bold text-orange-700">
                {formatCurrency(employee.totalAllowance)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Hoa hồng</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(employee.totalCommission)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Lương quản lý</p>
              <p className="text-xl font-bold text-purple-700">
                {formatCurrency(employee.totalManagementSalary)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Tổng lương</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(employee.totalBasicSalary + employee.totalAllowance + employee.totalCommission + employee.totalManagementSalary)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sessions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Chi tiết theo buổi ({employee.sessionDetails.length})
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'monthly'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Tổng hợp theo tháng ({monthlyData.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dịch vụ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hoa hồng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lương QL</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employee.sessionDetails.map((session, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{session.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{session.customer}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{session.service}</td>
                      <td className="px-4 py-3 text-sm text-green-600">
                        {formatCurrency(session.commission)}
                      </td>
                      <td className="px-4 py-3 text-sm text-purple-600">
                        {formatCurrency(session.managementSalary || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tháng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lương CB</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phụ cấp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hoa hồng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lương QL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng cộng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buổi làm</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyData.map((month) => (
                    <tr key={month.month}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{month.month}</td>
                      <td className="px-4 py-3 text-sm text-blue-600">
                        {formatCurrency(month.basicSalary)}
                      </td>
                      <td className="px-4 py-3 text-sm text-orange-600">
                        {formatCurrency(month.allowance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600">
                        {formatCurrency(month.commission)}
                      </td>
                      <td className="px-4 py-3 text-sm text-purple-600">
                        {formatCurrency(month.managementSalary)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {formatCurrency(month.total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{month.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}