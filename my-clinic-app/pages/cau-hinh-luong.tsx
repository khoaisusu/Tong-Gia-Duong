import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import {
  CurrencyDollarIcon,
  BriefcaseIcon,
  InformationCircleIcon,
  ChartBarIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/formatting';

interface PositionSalaryConfig {
  chucVu: string;
  hoaHongMacDinh: number;
  luongCoBanMacDinh?: number;
  phuCapMacDinh?: number;
  moTa?: string;
}

export default function PositionSalaryConfigPage() {
  const [selectedPosition, setSelectedPosition] = useState<PositionSalaryConfig | null>(null);

  // Fetch position salary configs
  const { data: configs, isLoading, error } = useQuery<PositionSalaryConfig[]>({
    queryKey: ['position-salary-config'],
    queryFn: async () => {
      const res = await fetch('/api/position-salary-config');
      if (!res.ok) throw new Error('Failed to fetch position salary config');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Layout title="Cấu hình lương theo chức vụ">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Cấu hình lương theo chức vụ">
        <div className="text-center py-8">
          <p className="text-red-600">Lỗi tải dữ liệu: {(error as Error).message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Cấu hình lương theo chức vụ">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cấu hình lương theo chức vụ</h1>
              <p className="text-gray-600 mt-1">
                Quản lý cấu hình lương cơ bản, phụ cấp và tỷ lệ hoa hồng cho từng chức vụ
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
              <InformationCircleIcon className="w-5 h-5" />
              <span>Cấu hình hiện tại là read-only</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BriefcaseIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng chức vụ</p>
                <p className="text-2xl font-bold text-gray-900">
                  {configs?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Hoa hồng TB</p>
                <p className="text-2xl font-bold text-gray-900">
                  {configs ? (configs.reduce((sum, c) => sum + c.hoaHongMacDinh, 0) / configs.length).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Lương CB TB</p>
                <p className="text-lg font-bold text-gray-900">
                  {configs ? formatCurrency(configs.reduce((sum, c) => sum + (c.luongCoBanMacDinh || 0), 0) / configs.length) : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Phụ cấp TB</p>
                <p className="text-lg font-bold text-gray-900">
                  {configs ? formatCurrency(configs.reduce((sum, c) => sum + (c.phuCapMacDinh || 0), 0) / configs.length) : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Position Salary Config Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Danh sách cấu hình chức vụ
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chức vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoa hồng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lương cơ bản
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phụ cấp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng lương
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mô tả
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configs?.map((config) => {
                  const totalSalary = (config.luongCoBanMacDinh || 0) + (config.phuCapMacDinh || 0);

                  return (
                    <tr key={config.chucVu} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BriefcaseIcon className="w-5 h-5 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {config.chucVu}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-semibold text-green-600">
                            {config.hoaHongMacDinh}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-blue-600 font-medium">
                          {config.luongCoBanMacDinh ? formatCurrency(config.luongCoBanMacDinh) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-orange-600 font-medium">
                          {config.phuCapMacDinh ? formatCurrency(config.phuCapMacDinh) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {totalSalary > 0 ? formatCurrency(totalSalary) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {config.moTa || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedPosition(config)}
                          className="text-primary-600 hover:text-primary-900 flex items-center"
                        >
                          <InformationCircleIcon className="w-4 h-4 mr-1" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Information Note */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Lưu ý về cấu hình</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Cấu hình hiện tại được quản lý trong code tại file <code className="bg-blue-100 px-1 rounded">positionSalaryConfig.ts</code></li>
                  <li>Khi tạo nhân viên mới, hệ thống sẽ tự động áp dụng cấu hình lương theo chức vụ</li>
                  <li>Nhân viên có thể có lương tùy chỉnh riêng, khác với cấu hình mặc định</li>
                  <li>Hoa hồng nhân viên ưu tiên: Tùy chỉnh cá nhân → Theo chức vụ → 0%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPosition && (
        <PositionDetailModal
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
        />
      )}
    </Layout>
  );
}

// Position Detail Modal Component
function PositionDetailModal({ position, onClose }: {
  position: PositionSalaryConfig;
  onClose: () => void;
}) {
  const totalSalary = (position.luongCoBanMacDinh || 0) + (position.phuCapMacDinh || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Chi tiết cấu hình: {position.chucVu}
              </h3>
              <p className="text-gray-600 mt-1">
                {position.moTa}
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Hoa hồng mặc định</p>
              <p className="text-2xl font-bold text-green-700">
                {position.hoaHongMacDinh}%
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Tổng lương cố định</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalSalary > 0 ? formatCurrency(totalSalary) : '-'}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Chi tiết lương cố định</h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Lương cơ bản:</span>
                  <span className="font-semibold text-blue-600">
                    {position.luongCoBanMacDinh ? formatCurrency(position.luongCoBanMacDinh) : 'Chưa cấu hình'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Phụ cấp:</span>
                  <span className="font-semibold text-orange-600">
                    {position.phuCapMacDinh ? formatCurrency(position.phuCapMacDinh) : 'Chưa cấu hình'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-gray-50 px-3 rounded">
                  <span className="font-semibold text-gray-700">Tổng lương cố định:</span>
                  <span className="font-bold text-gray-900">
                    {totalSalary > 0 ? formatCurrency(totalSalary) : 'Chưa cấu hình'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Hoa hồng biến động</h4>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 mb-2">
                  Nhân viên ở chức vụ này sẽ nhận được <strong>{position.hoaHongMacDinh}%</strong> hoa hồng từ giá trị dịch vụ thực hiện
                </p>
                <p className="text-xs text-green-600">
                  Ví dụ: Dịch vụ 1.000.000đ → Hoa hồng nhận được: {formatCurrency(1000000 * position.hoaHongMacDinh / 100)}
                </p>
              </div>
            </div>
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
