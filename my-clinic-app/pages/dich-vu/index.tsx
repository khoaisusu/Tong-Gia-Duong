import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { DichVu } from '../../utils/columnMapping';
import { formatCurrency } from '../../utils/formatting';

export default function DichVuPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<DichVu | null>(null);

  // Fetch services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await fetch('/api/dich-vu');
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    },
  });

  // Create/Update service mutation
  const saveServiceMutation = useMutation({
    mutationFn: async (serviceData: DichVu) => {
      const url = '/api/dich-vu';
      const method = serviceData.maDichVu && editingService ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });

      if (!res.ok) throw new Error('Failed to save service');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowForm(false);
      setEditingService(null);
      toast.success(editingService ? 'Cập nhật dịch vụ thành công!' : 'Thêm dịch vụ thành công!');
    },
    onError: (error) => {
      console.error('Error saving service:', error);
      toast.error('Có lỗi xảy ra khi lưu dịch vụ!');
    },
  });

  // Filter services
  const filteredServices = services.filter((service: DichVu) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      service.tenDichVu?.toLowerCase().includes(searchLower) ||
      service.loaiDichVu?.toLowerCase().includes(searchLower) ||
      service.moTa?.toLowerCase().includes(searchLower)
    );
  });

  // Service categories for better organization
  const serviceCategories = [
    { value: 'Xoa bóp', label: 'Xoa bóp', icon: '💆', color: 'bg-blue-100 text-blue-800' },
    { value: 'Bấm huyệt', label: 'Bấm huyệt', icon: '👐', color: 'bg-purple-100 text-purple-800' },
    { value: 'Châm cứu', label: 'Châm cứu', icon: '🏥', color: 'bg-green-100 text-green-800' },
    { value: 'Phục hồi chức năng', label: 'Phục hồi chức năng', icon: '🏃', color: 'bg-orange-100 text-orange-800' },
    { value: 'Điều trị đau', label: 'Điều trị đau', icon: '💊', color: 'bg-red-100 text-red-800' },
    { value: 'Thư giãn', label: 'Thư giãn', icon: '🧘', color: 'bg-indigo-100 text-indigo-800' },
  ];

  return (
    <Layout title="Quản lý dịch vụ">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm dịch vụ..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {session?.user?.role === 'Admin' && (
              <button
                onClick={() => {
                  setEditingService(null);
                  setShowForm(true);
                }}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Thêm dịch vụ
              </button>
            )}
          </div>
        </div>

        {/* Service Categories Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {serviceCategories.map((category) => {
            const count = services.filter((s: DichVu) => s.loaiDichVu === category.value).length;
            return (
              <div key={category.value} className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className="text-2xl mb-2">{category.icon}</div>
                <p className="text-xs text-gray-600">{category.label}</p>
                <p className="text-lg font-bold text-gray-900">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Services Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Danh sách dịch vụ</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service: DichVu) => {
                const category = serviceCategories.find(c => c.value === service.loaiDichVu);
                return (
                  <div key={service.maDichVu} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{service.tenDichVu}</h3>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${category?.color || 'bg-gray-100 text-gray-800'}`}>
                          {service.loaiDichVu}
                        </span>
                      </div>
                      <div className="text-2xl">{category?.icon}</div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="w-4 h-4 mr-2" />
                        <span>{service.thoiGian} phút</span>
                      </div>
                      <div className="flex items-center text-sm font-semibold text-primary-700">
                        <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                        <span>{formatCurrency(service.giaDichVu)}</span>
                      </div>
                    </div>
                    
                    {service.moTa && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {service.moTa}
                      </p>
                    )}
                    
                    {service.loiIch && (
                      <div className="mb-3">
                        <div className="flex items-center mb-1">
                          <SparklesIcon className="w-4 h-4 mr-1 text-yellow-500" />
                          <p className="text-xs font-medium text-gray-700">Lợi ích:</p>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{service.loiIch}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        service.trangThai === 'Đang Kinh Doanh' || service.trangThai === 'Hoạt động'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {service.trangThai}
                      </span>
                      
                      {session?.user?.role === 'Admin' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingService(service);
                              setShowForm(true);
                            }}
                            className="p-1 text-primary-600 hover:text-primary-800"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Handle delete
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {filteredServices.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'Không tìm thấy dịch vụ phù hợp' : 'Chưa có dịch vụ nào'}
            </div>
          )}
        </div>
      </div>

      {/* Service Form Modal */}
      {showForm && (
        <ServiceForm
          service={editingService}
          categories={serviceCategories}
          isLoading={saveServiceMutation.isPending}
          onClose={() => {
            setShowForm(false);
            setEditingService(null);
          }}
          onSave={async (service: DichVu) => {
            saveServiceMutation.mutate(service);
          }}
        />
      )}
    </Layout>
  );
}

// Service Form Component
function ServiceForm({ service, categories, isLoading, onClose, onSave }: any) {
  const [formData, setFormData] = useState<DichVu>({
    maDichVu: service?.maDichVu || '',
    tenDichVu: service?.tenDichVu || '',
    loaiDichVu: service?.loaiDichVu || '',
    thoiGian: service?.thoiGian || '15',
    giaDichVu: service?.giaDichVu || '',
    moTa: service?.moTa || '',
    loiIch: service?.loiIch || '',
    trangThai: service?.trangThai || 'Đang Kinh Doanh',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">
            {service ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên dịch vụ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.tenDichVu}
                onChange={(e) => setFormData({ ...formData, tenDichVu: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại dịch vụ <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.loaiDichVu}
                onChange={(e) => setFormData({ ...formData, loaiDichVu: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Chọn loại dịch vụ</option>
                {categories.map((cat: any) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời gian (phút) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="5"
                  step="5"
                  value={formData.thoiGian}
                  onChange={(e) => setFormData({ ...formData, thoiGian: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá dịch vụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.giaDichVu}
                  onChange={(e) => setFormData({ ...formData, giaDichVu: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                rows={3}
                value={formData.moTa}
                onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lợi ích
              </label>
              <textarea
                rows={2}
                value={formData.loiIch}
                onChange={(e) => setFormData({ ...formData, loiIch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Giảm đau, thư giãn cơ bắp..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái
              </label>
              <select
                value={formData.trangThai}
                onChange={(e) => setFormData({ ...formData, trangThai: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="Đang Kinh Doanh">Đang Kinh Doanh</option>
                <option value="Ngừng Kinh Doanh">Ngừng Kinh Doanh</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xử lý...' : (service ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}