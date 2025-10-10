import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SalaryPaymentQR from '../components/SalaryPaymentQR';
import {
  CurrencyDollarIcon,
  CalendarIcon,
  ChevronDownIcon,
  UserIcon,
  Cog6ToothIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

interface NhanVien {
  maNhanVien: string;
  hoVaTen: string;
  chucVu: string;
  luongCoBan: string;
  phuCap: string;
  trangThai: string;
  nganHang: string;
  soTK: string;
}

interface LuotTriLieu {
  maLuot: string;
  nhanVienThucHien: string;
  nguoiChinh: string;
  hoaHongNhanVien: string;
  luongQuanLy: string;
  dichVuThem: string;
  nhanVienThucHienDVThem: string;
  hoaHongDichVuThem: string;
  ngayThucHien: string;
  trangThai: string;
}

interface SalaryDetail {
  maNhanVien: string;
  tenNhanVien: string;
  chucVu: string;
  luongCoBan: number;
  phuCap: number;
  tongHoaHong: number;
  hoaHongDichVuThem: number;
  luongQuanLy: number;
  soLuotThucHien: number;
  tongLuong: number;
}

export default function SalaryDetailPage() {
  const router = useRouter();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<{
    employee: NhanVien;
    salary: SalaryDetail;
  } | null>(null);

  // Fetch employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/nhan-vien');
      if (!res.ok) throw new Error('Failed to fetch employees');
      return res.json();
    },
  });

  // Fetch treatment sessions
  const { data: treatmentSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['treatment-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/luot-tri-lieu');
      if (!res.ok) throw new Error('Failed to fetch treatment sessions');
      return res.json();
    },
  });

  // Calculate salary details for each employee
  const salaryDetails: SalaryDetail[] = useMemo(() => {
    if (!employees.length || !treatmentSessions.length) return [];

    return employees
      .filter((emp: NhanVien) => emp.trangThai === 'Hoạt động')
      .map((employee: NhanVien) => {
        // Filter sessions for the selected month/year
        const employeeSessions = treatmentSessions.filter((session: LuotTriLieu) => {
          if (!session.ngayThucHien) return false;

          const sessionDate = new Date(session.ngayThucHien);
          const sessionMonth = sessionDate.getMonth() + 1;
          const sessionYear = sessionDate.getFullYear();

          // Check if this employee performed the session
          const isPerformer = session.nhanVienThucHien === employee.hoVaTen;
          // Check if this employee is the supervisor
          const isSupervisor = session.nguoiChinh === employee.hoVaTen;

          return (
            (isPerformer || isSupervisor) &&
            sessionMonth === selectedMonth &&
            sessionYear === selectedYear &&
            session.trangThai === 'Hoàn thành'
          );
        });

        // Calculate total commission (as performer)
        const tongHoaHong = employeeSessions
          .filter((s: LuotTriLieu) => s.nhanVienThucHien === employee.hoVaTen)
          .reduce((sum: number, session: LuotTriLieu) => {
            const commission = parseFloat(session.hoaHongNhanVien || '0');
            return sum + commission;
          }, 0);

        // Calculate commission from additional services
        // Only calculate if the columns exist in Google Sheet (nhanVienThucHienDVThem and hoaHongDichVuThem)
        const hoaHongDichVuThem = treatmentSessions
          .filter((session: LuotTriLieu) => {
            // Skip if the additional service columns don't exist yet
            if (!session.nhanVienThucHienDVThem || !session.hoaHongDichVuThem) return false;
            if (!session.ngayThucHien) return false;

            const sessionDate = new Date(session.ngayThucHien);
            const sessionMonth = sessionDate.getMonth() + 1;
            const sessionYear = sessionDate.getFullYear();

            // Check if session is in selected month/year and completed
            if (sessionMonth !== selectedMonth || sessionYear !== selectedYear || session.trangThai !== 'Hoàn thành') {
              return false;
            }

            // Parse staff list and commission list
            const staffList = session.nhanVienThucHienDVThem.split(',').map(s => s.trim());
            return staffList.includes(employee.hoVaTen);
          })
          .reduce((sum: number, session: LuotTriLieu) => {
            // Parse staff list and commission list
            const staffList = session.nhanVienThucHienDVThem.split(',').map(s => s.trim());
            const commissionList = session.hoaHongDichVuThem.split(',').map(s => s.trim());

            // Find index of this employee in the staff list
            const staffIndex = staffList.indexOf(employee.hoVaTen);
            if (staffIndex !== -1 && staffIndex < commissionList.length) {
              const commission = parseFloat(commissionList[staffIndex] || '0');
              return sum + commission;
            }

            return sum;
          }, 0);

        // Calculate total supervisor salary
        const luongQuanLy = employeeSessions
          .filter((s: LuotTriLieu) => s.nguoiChinh === employee.hoVaTen)
          .reduce((sum: number, session: LuotTriLieu) => {
            const supervisorSalary = parseFloat(session.luongQuanLy || '0');
            return sum + supervisorSalary;
          }, 0);

        // Count sessions performed
        const soLuotThucHien = employeeSessions.filter(
          (s: LuotTriLieu) => s.nhanVienThucHien === employee.hoVaTen
        ).length;

        const luongCoBan = parseFloat(employee.luongCoBan || '0');
        const phuCap = parseFloat(employee.phuCap || '0');
        const tongLuong = luongCoBan + phuCap + tongHoaHong + hoaHongDichVuThem + luongQuanLy;

        return {
          maNhanVien: employee.maNhanVien,
          tenNhanVien: employee.hoVaTen,
          chucVu: employee.chucVu,
          luongCoBan,
          phuCap,
          tongHoaHong,
          hoaHongDichVuThem,
          luongQuanLy,
          soLuotThucHien,
          tongLuong,
        };
      })
      .sort((a: SalaryDetail, b: SalaryDetail) => b.tongLuong - a.tongLuong); // Sort by total salary descending
  }, [employees, treatmentSessions, selectedMonth, selectedYear]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return salaryDetails.reduce(
      (acc, detail) => ({
        tongLuongCoBan: acc.tongLuongCoBan + detail.luongCoBan,
        tongPhuCap: acc.tongPhuCap + detail.phuCap,
        tongHoaHong: acc.tongHoaHong + detail.tongHoaHong,
        tongHoaHongDichVuThem: acc.tongHoaHongDichVuThem + detail.hoaHongDichVuThem,
        tongLuongQuanLy: acc.tongLuongQuanLy + detail.luongQuanLy,
        tongLuongToanBo: acc.tongLuongToanBo + detail.tongLuong,
      }),
      {
        tongLuongCoBan: 0,
        tongPhuCap: 0,
        tongHoaHong: 0,
        tongHoaHongDichVuThem: 0,
        tongLuongQuanLy: 0,
        tongLuongToanBo: 0,
      }
    );
  }, [salaryDetails]);

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  if (loadingEmployees || loadingSessions) {
    return (
      <Layout title="Bảng lương chi tiết">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Bảng lương chi tiết">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bảng lương chi tiết nhân viên</h1>
              <p className="text-gray-600 mt-1">
                Xem chi tiết lương của từng nhân viên theo tháng
              </p>
            </div>

            {/* Month/Year Filter and Config Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={() => router.push('/cau-hinh-luong')}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5 mr-2" />
                Cấu hình hoa hồng
              </button>

              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      Tháng {month}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lương cơ bản</p>
                <p className="text-xl font-bold text-blue-600">
                  {summary.tongLuongCoBan.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Phụ cấp</p>
                <p className="text-xl font-bold text-purple-600">
                  {summary.tongPhuCap.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoa hồng</p>
                <p className="text-xl font-bold text-green-600">
                  {summary.tongHoaHong.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">HH DV thêm</p>
                <p className="text-xl font-bold text-teal-600">
                  {summary.tongHoaHongDichVuThem.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-teal-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lương quản lý</p>
                <p className="text-xl font-bold text-orange-600">
                  {summary.tongLuongQuanLy.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Tổng lương</p>
                <p className="text-xl font-bold text-white">
                  {summary.tongLuongToanBo.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Salary Detail Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Chi tiết lương nhân viên - Tháng {selectedMonth}/{selectedYear}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Tổng số nhân viên: {salaryDetails.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chức vụ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Số buổi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Lương CB
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Phụ cấp
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Hoa hồng
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    HH DV thêm
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Lương QL
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Tổng lương
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Thanh toán
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaryDetails.length > 0 ? (
                  salaryDetails.map((detail) => {
                    const employee = employees.find((emp: NhanVien) => emp.maNhanVien === detail.maNhanVien);

                    return (
                      <tr key={detail.maNhanVien} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {detail.tenNhanVien}
                              </div>
                              <div className="text-sm text-gray-500">{detail.maNhanVien}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {detail.chucVu}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {detail.soLuotThucHien}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {detail.luongCoBan.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-purple-600">
                          {detail.phuCap.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                          {detail.tongHoaHong.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-teal-600">
                          {detail.hoaHongDichVuThem.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-orange-600">
                          {detail.luongQuanLy.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-primary-600">
                          {detail.tongLuong.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {employee && employee.soTK && detail.tongLuong > 0 ? (
                            <button
                              onClick={() =>
                                setSelectedEmployeeForPayment({
                                  employee,
                                  salary: detail,
                                })
                              }
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                              title="Thanh toán qua QR"
                            >
                              <QrCodeIcon className="w-4 h-4 mr-1" />
                              QR
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {!employee?.soTK ? 'Chưa có TK' : 'Không có lương'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      Không có dữ liệu lương cho tháng {selectedMonth}/{selectedYear}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Ghi chú:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Lương cơ bản và phụ cấp được lấy từ thông tin nhân viên</li>
            <li>Hoa hồng được tính từ các lượt trị liệu đã hoàn thành trong tháng</li>
            <li><strong>HH DV thêm</strong>: Hoa hồng từ các dịch vụ thêm mà nhân viên thực hiện (châm cứu, thủy châm, ...)</li>
            <li>Lương quản lý (20%) được tính cho nhân viên làm &quot;Người chính&quot; giám sát</li>
            <li>Chỉ tính lương cho các buổi điều trị đã hoàn thành</li>
            <li>Số buổi là tổng số lượt trị liệu mà nhân viên thực hiện</li>
            <li>Tổng lương = Lương CB + Phụ cấp + Hoa hồng + HH DV thêm + Lương QL</li>
            <li>Nhấn nút QR để tạo mã thanh toán lương qua VietQR</li>
          </ul>
        </div>
      </div>

      {/* Payment QR Modal */}
      {selectedEmployeeForPayment && (
        <SalaryPaymentQR
          employeeName={selectedEmployeeForPayment.employee.hoVaTen}
          employeeId={selectedEmployeeForPayment.employee.maNhanVien}
          bankName={selectedEmployeeForPayment.employee.nganHang || ''}
          accountNumber={selectedEmployeeForPayment.employee.soTK}
          amount={selectedEmployeeForPayment.salary.tongLuong}
          onClose={() => setSelectedEmployeeForPayment(null)}
        />
      )}
    </Layout>
  );
}
