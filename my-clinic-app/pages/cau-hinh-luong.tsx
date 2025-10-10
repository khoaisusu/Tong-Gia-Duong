import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Layout from '../components/Layout';
import {
  UserGroupIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface NhanVien {
  maNhanVien: string;
  hoVaTen: string;
  chucVu: string;
  soDienThoai: string;
  email: string;
}

interface DichVu {
  maDichVu: string;
  tenDichVu: string;
  giaDichVu: string;
}

interface HoaHong {
  maHoaHong: string;
  maNhanVien: string;
  tenNhanVien: string;
  maDichVu: string;
  tenDichVu: string;
  tyLeHoaHong: string;
  ngayApDung: string;
  ghiChu: string;
}

const COMMISSION_RATES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export default function CommissionConfigPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<NhanVien | null>(null);
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/nhan-vien');
      if (!res.ok) throw new Error('Failed to fetch employees');
      return res.json();
    },
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await fetch('/api/dich-vu');
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    },
  });

  // Fetch commission records
  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const res = await fetch('/api/hoa-hong');
      if (!res.ok) throw new Error('Failed to fetch commissions');
      return res.json();
    },
  });

  if (loadingEmployees) {
    return (
      <Layout title="Cấu hình hoa hồng nhân viên">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Cấu hình hoa hồng nhân viên">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cấu hình hoa hồng nhân viên</h1>
              <p className="text-gray-600 mt-1">
                Quản lý tỷ lệ hoa hồng cho từng nhân viên theo từng dịch vụ cụ thể
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              <UserGroupIcon className="w-5 h-5" />
              <span>Tổng: {employees.length} nhân viên</span>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Danh sách nhân viên
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Nhấn vào nhân viên để xem và chỉnh sửa hoa hồng theo dịch vụ
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mã NV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Họ và tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chức vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Số dịch vụ đã cấu hình
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee: NhanVien) => {
                  const employeeCommissions = commissions.filter(
                    (c: HoaHong) => c.maNhanVien === employee.maNhanVien
                  );

                  return (
                    <tr key={employee.maNhanVien} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.maNhanVien}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.hoVaTen}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.chucVu}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {employeeCommissions.length} / {services.length} dịch vụ
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedEmployee(employee)}
                          className="text-primary-600 hover:text-primary-900 flex items-center"
                        >
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Cấu hình hoa hồng
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Commission Config Modal */}
      {selectedEmployee && (
        <CommissionConfigModal
          employee={selectedEmployee}
          services={services}
          commissions={commissions.filter(
            (c: HoaHong) => c.maNhanVien === selectedEmployee.maNhanVien
          )}
          onClose={() => setSelectedEmployee(null)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['commissions'] })}
        />
      )}
    </Layout>
  );
}

// Commission Config Modal
function CommissionConfigModal({
  employee,
  services,
  commissions,
  onClose,
  onRefresh,
}: {
  employee: NhanVien;
  services: DichVu[];
  commissions: HoaHong[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<number>(0);

  // Create or update commission
  const saveMutation = useMutation({
    mutationFn: async (data: { maDichVu: string; tyLeHoaHong: number }) => {
      const existing = commissions.find((c) => c.maDichVu === data.maDichVu);
      const service = services.find((s: DichVu) => s.maDichVu === data.maDichVu);

      if (existing) {
        // Update
        const res = await fetch('/api/hoa-hong', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maHoaHong: existing.maHoaHong,
            tyLeHoaHong: data.tyLeHoaHong.toString(),
          }),
        });
        if (!res.ok) throw new Error('Failed to update commission');
      } else {
        // Create
        const res = await fetch('/api/hoa-hong', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maNhanVien: employee.maNhanVien,
            tenNhanVien: employee.hoVaTen,
            maDichVu: data.maDichVu,
            tenDichVu: service?.tenDichVu || '',
            tyLeHoaHong: data.tyLeHoaHong.toString(),
          }),
        });
        if (!res.ok) throw new Error('Failed to create commission');
      }
    },
    onSuccess: () => {
      toast.success('Cập nhật hoa hồng thành công!');
      onRefresh();
      setEditingService(null);
    },
    onError: (error) => {
      toast.error('Có lỗi xảy ra: ' + (error as Error).message);
    },
  });

  const handleSave = (maDichVu: string) => {
    saveMutation.mutate({ maDichVu, tyLeHoaHong: editingRate });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg max-w-4xl w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Cấu hình hoa hồng: {employee.hoVaTen}
              </h3>
              <p className="text-gray-600 mt-1">
                {employee.chucVu} - {employee.maNhanVien}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Service Commission List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên dịch vụ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Giá dịch vụ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tỷ lệ hoa hồng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hoa hồng dự kiến
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service: DichVu) => {
                  const commission = commissions.find((c) => c.maDichVu === service.maDichVu);
                  const rate = commission ? parseInt(commission.tyLeHoaHong) : 0;
                  const isEditing = editingService === service.maDichVu;
                  const displayRate = isEditing ? editingRate : rate;
                  const estimatedCommission = (parseFloat(service.giaDichVu || '0') * displayRate) / 100;

                  return (
                    <tr key={service.maDichVu} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {service.tenDichVu}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {parseFloat(service.giaDichVu || '0').toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editingRate}
                            onChange={(e) => setEditingRate(parseInt(e.target.value))}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500"
                          >
                            {COMMISSION_RATES.map((percent) => (
                              <option key={percent} value={percent}>
                                {percent}%
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            rate > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {rate}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {estimatedCommission.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(service.maDichVu)}
                              disabled={saveMutation.isPending}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingService(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingService(service.maDichVu);
                              setEditingRate(rate);
                            }}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            Sửa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
