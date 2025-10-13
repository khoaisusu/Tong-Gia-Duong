import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon, UserIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import CustomerForm from '../../components/forms/CustomerForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { KhachHang } from '../../utils/columnMapping';

export default function KhachHangPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<KhachHang | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<KhachHang | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<KhachHang | null>(null);

  // Fetch customers
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/khach-hang');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });

  // Create/Update customer mutation
  const saveMutation = useMutation({
    mutationFn: async (customer: Partial<KhachHang>) => {
      const url = editingCustomer 
        ? `/api/khach-hang/${editingCustomer.maKhachHang}`
        : '/api/khach-hang';
      
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      
      if (!res.ok) throw new Error('Failed to save customer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editingCustomer ? 'Cập nhật khách hàng thành công!' : 'Thêm khách hàng thành công!');
      setShowForm(false);
      setEditingCustomer(null);
    },
    onError: () => {
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const res = await fetch(`/api/khach-hang/${customerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete customer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Xóa khách hàng thành công!');
      setDeletingCustomer(null);
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xóa khách hàng!');
    },
  });

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer: KhachHang) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.hoVaTen?.toLowerCase().includes(searchLower) ||
      customer.tenThuongGoi?.toLowerCase().includes(searchLower) ||
      customer.soDienThoai?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (customer: KhachHang) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = (customer: KhachHang) => {
    setDeletingCustomer(customer);
  };

  const handleSave = (customer: Partial<KhachHang>) => {
    saveMutation.mutate(customer);
  };

  const confirmDelete = () => {
    if (deletingCustomer) {
      deleteMutation.mutate(deletingCustomer.maKhachHang);
    }
  };

  return (
    <Layout title="Quản lý khách hàng">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, tên thường gọi, SĐT, email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Add button */}
            <button
              onClick={() => {
                setEditingCustomer(null);
                setShowForm(true);
              }}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Thêm khách hàng
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Tổng khách hàng</p>
            <p className="text-2xl font-bold text-primary-700">{customers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Khách hàng mới (tháng này)</p>
            <p className="text-2xl font-bold text-green-600">
              {customers.filter((c: KhachHang) => {
                const date = new Date(c.ngayTao);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Khách VIP</p>
            <p className="text-2xl font-bold text-purple-600">
              {customers.filter((c: KhachHang) => c.trangThai === 'VIP').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Khách thường xuyên</p>
            <p className="text-2xl font-bold text-blue-600">
              {customers.filter((c: KhachHang) => c.trangThai === 'Thường xuyên').length}
            </p>
          </div>
        </div>

        {/* Customer table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              <p>Có lỗi xảy ra khi tải dữ liệu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ và tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên thường gọi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số điện thoại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer: KhachHang) => (
                    <tr key={customer.maKhachHang} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setViewingCustomer(customer)}
                          className="text-primary-600 hover:text-primary-900 font-medium hover:underline"
                        >
                          {customer.hoVaTen}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.tenThuongGoi || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.soDienThoai}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          customer.trangThai === 'VIP' 
                            ? 'bg-purple-100 text-purple-800'
                            : customer.trangThai === 'Thường xuyên'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {customer.trangThai || 'Mới'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredCustomers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          onSave={handleSave}
          isLoading={saveMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCustomer && (
        <ConfirmDialog
          title="Xác nhận xóa"
          message={`Bạn có chắc chắn muốn xóa khách hàng "${deletingCustomer.hoVaTen}"? Hành động này không thể hoàn tác.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingCustomer(null)}
          isLoading={deleteMutation.isPending}
          confirmText="Xóa"
          confirmClassName="bg-red-600 hover:bg-red-700"
        />
      )}

      {/* Customer Detail Modal */}
      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onEdit={() => {
            setEditingCustomer(viewingCustomer);
            setViewingCustomer(null);
            setShowForm(true);
          }}
        />
      )}
    </Layout>
  );
}

// Customer Detail Modal Component
function CustomerDetailModal({ customer, onClose, onEdit }: { customer: KhachHang; onClose: () => void; onEdit: () => void }) {
  const [activeTab, setActiveTab] = React.useState<'info' | 'treatments' | 'orders' | 'medical'>('info');

  // Fetch customer's orders
  const { data: orders = [] } = useQuery({
    queryKey: ['customer-orders', customer.maKhachHang],
    queryFn: async () => {
      const res = await fetch('/api/don-hang');
      if (!res.ok) return [];
      const allOrders = await res.json();
      return allOrders.filter((order: any) => order.maKhachHang === customer.maKhachHang);
    },
  });

  // Fetch customer's treatment plans
  const { data: treatments = [] } = useQuery({
    queryKey: ['customer-treatments', customer.maKhachHang],
    queryFn: async () => {
      const res = await fetch('/api/lieu-trinh');
      if (!res.ok) return [];
      const allTreatments = await res.json();
      return allTreatments.filter((treatment: any) => treatment.maKhachHang === customer.maKhachHang);
    },
  });

  // Calculate statistics
  const totalSpent = orders.reduce((sum: number, order: any) => {
    const amount = parseFloat(order.thanhTien || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const completedTreatments = treatments.filter((t: any) => t.trangThai === 'Hoàn thành').length;
  const activeTreatments = treatments.filter((t: any) => t.trangThai === 'Đang tiến hành').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{customer.hoVaTen}</h3>
                {customer.tenThuongGoi && (
                  <p className="text-sm text-gray-600">({customer.tenThuongGoi})</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Status Badge & Statistics */}
          <div className="mb-6 flex items-center gap-4 flex-wrap">
            <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
              customer.trangThai === 'VIP'
                ? 'bg-purple-100 text-purple-800'
                : customer.trangThai === 'Thường xuyên'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {customer.trangThai || 'Mới'}
            </span>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>📦 {orders.length} đơn hàng</span>
              <span>💊 {treatments.length} liệu trình</span>
              <span className="font-semibold text-green-600">💰 {totalSpent.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'info'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Thông tin liên hệ
              </button>
              <button
                onClick={() => setActiveTab('treatments')}
                className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'treatments'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Liệu trình ({treatments.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'orders'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Đơn hàng ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('medical')}
                className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'medical'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Thông tin điều trị
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Tab 1: Contact Info */}
            {activeTab === 'info' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Số điện thoại</p>
                    <p className="font-medium text-gray-900">{customer.soDienThoai}</p>
                  </div>
                </div>

                {customer.email && (
                  <div className="flex items-start gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{customer.email}</p>
                    </div>
                  </div>
                )}
              </div>

                {/* Address & DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.diaChi && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Địa chỉ</p>
                    <p className="font-medium text-gray-900">{customer.diaChi}</p>
                  </div>
                </div>
              )}

              {customer.ngaySinh && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Ngày sinh</p>
                    <p className="font-medium text-gray-900">
                      {new Date(customer.ngaySinh).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              )}
                </div>

                {/* Registration Date */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Ngày tạo: {new Date(customer.ngayTao).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </>
            )}

            {/* Tab 2: Treatment Plans */}
            {activeTab === 'treatments' && (
              <>
                {treatments.length > 0 ? (
                  <div className="space-y-2">
                    {treatments.map((treatment: any) => (
                    <div key={treatment.maLieuTrinh} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{treatment.tenLieuTrinh}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(treatment.ngayBatDau).toLocaleDateString('vi-VN')} • {treatment.soBuoi} buổi
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        treatment.trangThai === 'Hoàn thành'
                          ? 'bg-green-100 text-green-800'
                          : treatment.trangThai === 'Đang tiến hành'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {treatment.trangThai}
                      </span>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Chưa có liệu trình điều trị nào
                  </div>
                )}
              </>
            )}

            {/* Tab 3: Orders */}
            {activeTab === 'orders' && (
              <>
                {orders.length > 0 ? (
                  <div className="space-y-2">
                    {orders.map((order: any) => (
                    <div key={order.maDonHang} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">#{order.maDonHang}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(order.ngayTao).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-gray-900">
                          {parseFloat(order.thanhTien || '0').toLocaleString('vi-VN')}đ
                        </p>
                        <span className={`text-xs ${
                          order.trangThaiThanhToan === 'Đã thanh toán'
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}>
                          {order.trangThaiThanhToan}
                        </span>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Chưa có đơn hàng nào
                  </div>
                )}
              </>
            )}

            {/* Tab 4: Medical Treatment Information */}
            {activeTab === 'medical' && (
              <>
                {(customer.tienSuBenh || customer.chanDoan || customer.dieuTri || customer.ketQua) ? (
                  <div className="space-y-4">
                    {customer.tienSuBenh && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Tiền sử bệnh</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap bg-red-50 border border-red-200 p-3 rounded-lg">
                        {customer.tienSuBenh}
                      </p>
                    </div>
                    )}

                    {customer.chanDoan && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Chẩn đoán</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                        {customer.chanDoan}
                      </p>
                    </div>
                    )}

                    {customer.dieuTri && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Điều trị</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                        {customer.dieuTri}
                      </p>
                    </div>
                    )}

                    {customer.ketQua && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Kết quả</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                        {customer.ketQua}
                      </p>
                    </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Chưa có thông tin điều trị
                  </div>
                )}

                {/* Notes */}
                {customer.ghiChu && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Ghi chú</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{customer.ghiChu}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Đóng
            </button>
            <button
              onClick={onEdit}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}