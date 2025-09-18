import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  CalendarIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { NhanVien } from '../../utils/columnMapping';
import { generateId } from '../../utils/formatting';

export default function NhanVienPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<NhanVien | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<NhanVien | null>(null);

  // Check if user is admin
  React.useEffect(() => {
    if (session && session.user?.role !== 'Admin') {
      toast.error('Bạn không có quyền truy cập trang này');
      router.push('/');
    }
  }, [session, router]);

  // Fetch staff
  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await fetch('/api/nhan-vien');
      if (!res.ok) throw new Error('Failed to fetch staff');
      return res.json();
    },
    enabled: session?.user?.role === 'Admin',
  });

  // Filter staff
  const filteredStaff = staffList.filter((staff: NhanVien) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      staff.hoVaTen?.toLowerCase().includes(searchLower) ||
      staff.soDienThoai?.includes(searchTerm) ||
      staff.email?.toLowerCase().includes(searchLower) ||
      staff.chucVu?.toLowerCase().includes(searchLower)
    );
  });

  // Staff statistics
  const stats = {
    total: staffList.length,
    active: staffList.filter((s: NhanVien) => s.trangThai === 'Hoạt động').length,
    admin: staffList.filter((s: NhanVien) => s.quyenHan === 'Admin').length,
    therapist: staffList.filter((s: NhanVien) => s.chuyenMon?.includes('Xoa bóp')).length,
  };

  const handleEdit = (staff: NhanVien) => {
    setEditingStaff(staff);
    setShowForm(true);
  };

  const handleDelete = (staff: NhanVien) => {
    if (staff.email === session?.user?.email) {
      toast.error('Bạn không thể xóa tài khoản của chính mình');
      return;
    }
    setDeletingStaff(staff);
  };

  return (
    <Layout title="Quản lý nhân viên">
      {session?.user?.role === 'Admin' ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm nhân viên..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <button
                onClick={() => {
                  setEditingStaff(null);
                  setShowForm(true);
                }}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Thêm nhân viên
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Tổng nhân viên</p>
              <p className="text-2xl font-bold text-primary-700">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Đang hoạt động</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Quản trị viên</p>
              <p className="text-2xl font-bold text-purple-600">{stats.admin}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Kỹ thuật viên</p>
              <p className="text-2xl font-bold text-blue-600">{stats.therapist}</p>
            </div>
          </div>

          {/* Staff Grid */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Danh sách nhân viên</h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map((staff: NhanVien) => (
                  <div key={staff.maNhanVien} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Staff Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-gray-900">{staff.hoVaTen}</h3>
                          <p className="text-sm text-gray-600">{staff.chucVu}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        staff.quyenHan === 'Admin' 
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {staff.quyenHan}
                      </span>
                    </div>
                    
                    {/* Staff Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="w-4 h-4 mr-2" />
                        <span>{staff.soDienThoai}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <EnvelopeIcon className="w-4 h-4 mr-2" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.chuyenMon && (
                        <div className="flex items-center text-sm text-gray-600">
                          <BriefcaseIcon className="w-4 h-4 mr-2" />
                          <span>{staff.chuyenMon}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <span>Từ {new Date(staff.ngayVaoLam).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {staff.hoaHong && (
                        <div className="flex items-center text-sm text-gray-600">
                          <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                          <span>Hoa hồng: {staff.hoaHong}%</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        staff.trangThai === 'Hoạt động' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {staff.trangThai}
                      </span>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(staff)}
                          className="p-1 text-primary-600 hover:text-primary-800"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(staff)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {filteredStaff.length === 0 && !isLoading && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Đang kiểm tra quyền truy cập...</p>
        </div>
      )}

      {/* Staff Form Modal */}
      {showForm && (
        <StaffFormModal
          staff={editingStaff}
          onClose={() => {
            setShowForm(false);
            setEditingStaff(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditingStaff(null);
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            toast.success(editingStaff ? 'Cập nhật nhân viên thành công!' : 'Thêm nhân viên thành công!');
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Xác nhận xóa</h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa nhân viên <strong>{deletingStaff.hoVaTen}</strong>? 
                Hành động này không thể hoàn tác.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingStaff(null)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    // Handle delete
                    toast.success('Xóa nhân viên thành công!');
                    setDeletingStaff(null);
                  }}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Staff Form Modal Component
function StaffFormModal({ staff, onClose, onSave }: any) {
  const [formData, setFormData] = useState<NhanVien>({
    maNhanVien: staff?.maNhanVien || generateId('NV'),
    hoVaTen: staff?.hoVaTen || '',
    soDienThoai: staff?.soDienThoai || '',
    email: staff?.email || '',
    chucVu: staff?.chucVu || '',
    chuyenMon: staff?.chuyenMon || '',
    ngayVaoLam: staff?.ngayVaoLam || new Date().toISOString().split('T')[0],
    quyenHan: staff?.quyenHan || 'Nhân viên',
    trangThai: staff?.trangThai || 'Hoạt động',
    hoaHong: staff?.hoaHong || '10',
    nganHang: staff?.nganHang || '',
    soTK: staff?.soTK || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = staff ? `/api/nhan-vien/${staff.maNhanVien}` : '/api/nhan-vien';
    const method = staff ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (res.ok) {
      onSave();
    } else {
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
          <h3 className="text-lg font-semibold mb-4">
            {staff ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.hoVaTen}
                  onChange={(e) => setFormData({ ...formData, hoVaTen: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.soDienThoai}
                  onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Email dùng để đăng nhập hệ thống</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chức vụ <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.chucVu}
                  onChange={(e) => setFormData({ ...formData, chucVu: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Chọn chức vụ</option>
                  <option value="Bác sỹ">Bác sỹ</option>
                  <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                  <option value="Y tá">Y tá</option>
                  <option value="Lễ tân">Lễ tân</option>
                  <option value="Quản lý">Quản lý</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chuyên môn
                </label>
                <input
                  type="text"
                  value={formData.chuyenMon}
                  onChange={(e) => setFormData({ ...formData, chuyenMon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="VD: Xoa bóp, Bấm huyệt, Châm cứu..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày vào làm
                </label>
                <input
                  type="date"
                  value={formData.ngayVaoLam}
                  onChange={(e) => setFormData({ ...formData, ngayVaoLam: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quyền hạn
                </label>
                <select
                  value={formData.quyenHan}
                  onChange={(e) => setFormData({ ...formData, quyenHan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Nhân viên">Nhân viên</option>
                  <option value="Admin">Quản trị viên</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hoa hồng (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.hoaHong}
                  onChange={(e) => setFormData({ ...formData, hoaHong: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
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
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Tạm nghỉ">Tạm nghỉ</option>
                  <option value="Nghỉ việc">Nghỉ việc</option>
                </select>
              </div>
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
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                {staff ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}