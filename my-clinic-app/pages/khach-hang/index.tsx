import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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
                      Mã KH
                    </th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.maKhachHang}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.hoVaTen}
                        
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
    </Layout>
  );
}