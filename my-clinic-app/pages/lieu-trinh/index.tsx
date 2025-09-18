import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  HeartIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { LieuTrinh, LuotTriLieu, KhachHang } from '../../utils/columnMapping';
import { formatCurrency } from '../../utils/formatting';
import toast from 'react-hot-toast';

export default function LieuTrinhPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [selectedTreatment, setSelectedTreatment] = useState<LieuTrinh | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Fetch treatments
  const { data: treatments = [], isLoading } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const res = await fetch('/api/lieu-trinh');
      if (!res.ok) throw new Error('Failed to fetch treatments');
      return res.json();
    },
  });

  // Fetch customers to get phone numbers for search
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/khach-hang');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });

  // Fetch treatment sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await fetch('/api/luot-tri-lieu');
      return res.json();
    },
  });

  // Status options
  const statuses = [
    'Tất cả',
    'Đang thực hiện',
    'Hoàn thành',
    'Tạm dừng',
    'Hủy'
  ];

  // Filter treatments
  const filteredTreatments = treatments.filter((treatment: LieuTrinh) => {
    const searchLower = searchTerm.toLowerCase();

    // Find customer by customer code to get phone number
    const customer = customers.find((c: KhachHang) => c.maKhachHang === treatment.maKhachHang);

    const matchesSearch =
      treatment.maLieuTrinh?.toLowerCase().includes(searchLower) ||
      treatment.tenKhachHang?.toLowerCase().includes(searchLower) ||
      customer?.soDienThoai?.includes(searchTerm) ||
      customer?.hoVaTen?.toLowerCase().includes(searchLower) ||
      customer?.tenThuongGoi?.toLowerCase().includes(searchLower);

    const matchesStatus = selectedStatus === 'Tất cả' || treatment.trangThai === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: filteredTreatments.length,
    active: filteredTreatments.filter((t: LieuTrinh) => t.trangThai === 'Đang thực hiện').length,
    completed: filteredTreatments.filter((t: LieuTrinh) => t.trangThai === 'Hoàn thành').length,
    totalValue: filteredTreatments.reduce((sum: number, t: LieuTrinh) => {
      const amount = parseFloat(t.tongTien || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0),
  };

  // Calculate progress percentage
  const calculateProgress = (treatment: LieuTrinh) => {
    const completed = parseInt(treatment.soBuoiDaThucHien || '0');
    const total = parseInt(treatment.soBuoi || '0');
    return total > 0 ? (completed / total) * 100 : 0;
  };


  // Add new session
  const addSession = async (treatmentId: string) => {
    setSelectedTreatment(treatments.find((t: LieuTrinh) => t.maLieuTrinh === treatmentId));
    setShowSessionModal(true);
  };

  return (
    <Layout title="Quản lý liệu trình">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc số điện thoại khách hàng..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng liệu trình</p>
                <p className="text-2xl font-bold text-primary-700">{stats.total}</p>
              </div>
              <HeartIcon className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang thực hiện</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <PlayIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hoàn thành</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng giá trị</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
              </div>
              <HeartIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Treatments Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTreatments.map((treatment: LieuTrinh) => {
                const progress = calculateProgress(treatment);
                const treatmentSessions = sessions.filter((s: LuotTriLieu) => 
                  s.maLieuTrinh === treatment.maLieuTrinh
                );
                
                return (
                  <div key={treatment.maLieuTrinh} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Treatment Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{treatment.tenLieuTrinh}</h3>
                        <p className="text-sm text-gray-600">{treatment.tenKhachHang}</p>
                        <p className="text-xs text-gray-500">#{treatment.maLieuTrinh}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        treatment.trangThai === 'Đang thực hiện'
                          ? 'bg-green-100 text-green-800'
                          : treatment.trangThai === 'Hoàn thành'
                          ? 'bg-blue-100 text-blue-800'
                          : treatment.trangThai === 'Tạm dừng'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {treatment.trangThai}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Tiến độ</span>
                        <span>{treatment.soBuoiDaThucHien}/{treatment.soBuoi} buổi</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Treatment Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarDaysIcon className="w-4 h-4 mr-2" />
                        <span>{new Date(treatment.ngayBatDau).toLocaleDateString('vi-VN')}</span>
                        {treatment.ngayKetThuc && (
                          <>
                            <span className="mx-1">→</span>
                            <span>{new Date(treatment.ngayKetThuc).toLocaleDateString('vi-VN')}</span>
                          </>
                        )}
                      </div>
                      
                    </div>
                    
                    {/* Recent Sessions */}
                    {treatmentSessions.length > 0 && (
                      <div className="mb-3 pt-3 border-t">
                        <p className="text-xs text-gray-600 mb-1">Buổi gần nhất:</p>
                        <p className="text-sm">
                          {treatmentSessions[0].dichVuThucHien} - {new Date(treatmentSessions[0].ngayThucHien).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedTreatment(treatment)}
                          className="p-1 text-primary-600 hover:text-primary-800"
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {treatment.trangThai === 'Đang thực hiện' && (
                        <button
                          onClick={() => addSession(treatment.maLieuTrinh)}
                          className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                        >
                          + Thêm buổi
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {filteredTreatments.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              Không tìm thấy liệu trình nào
            </div>
          )}
        </div>
      </div>

      {/* Treatment Details Modal */}
      {selectedTreatment && !showSessionModal && (
        <TreatmentDetailsModal
          treatment={selectedTreatment}
          sessions={sessions.filter((s: LuotTriLieu) => s.maLieuTrinh === selectedTreatment.maLieuTrinh)}
          onClose={() => setSelectedTreatment(null)}
        />
      )}


      {/* Add Session Modal */}
      {showSessionModal && selectedTreatment && (
        <AddSessionModal
          treatment={selectedTreatment}
          onClose={() => setShowSessionModal(false)}
          onSuccess={() => {
            setShowSessionModal(false);
            toast.success('Đã thêm buổi trị liệu thành công!');
          }}
        />
      )}
    </Layout>
  );
}

// Treatment Details Modal Component
function TreatmentDetailsModal({ treatment, sessions, onClose }: any) {
  let services = [];
  let products = [];
  
  try {
    services = JSON.parse(treatment.danhSachDichVu || '[]');
    products = JSON.parse(treatment.danhSachSanPham || '[]');
  } catch (e) {
    console.error('Error parsing data:', e);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Chi tiết liệu trình</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Khách hàng</p>
              <p className="font-medium">{treatment.tenKhachHang}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tên liệu trình</p>
              <p className="font-medium">{treatment.tenLieuTrinh}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tiến độ</p>
              <p className="font-medium">{treatment.soBuoiDaThucHien}/{treatment.soBuoi} buổi</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Trạng thái</p>
              <p className="font-medium">{treatment.trangThai}</p>
            </div>
          </div>
          
          {services.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Dịch vụ trong liệu trình</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Dịch vụ</th>
                    <th className="px-4 py-2 text-right">Số lần</th>
                    <th className="px-4 py-2 text-right">Đơn giá</th>
                    <th className="px-4 py-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{item.tenDichVu}</td>
                      <td className="px-4 py-2 text-right">{item.soLan}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.gia)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.thanhTien)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {sessions.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Lịch sử buổi trị liệu</h4>
              <div className="space-y-2">
                {sessions.map((session: LuotTriLieu) => (
                  <div key={session.maLuot} className="border rounded p-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{session.dichVuThucHien}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(session.ngayThucHien).toLocaleDateString('vi-VN')} - {session.gioBatDau} → {session.gioKetThuc}
                        </p>
                        <p className="text-sm text-gray-600">Nhân viên: {session.nhanVienThucHien}</p>
                      </div>
                      <span className="text-sm font-medium text-green-600">✓ Hoàn thành</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Session Modal Component
function AddSessionModal({ treatment, onClose, onSuccess }: any) {
  const [sessionData, setSessionData] = useState({
    dichVuThucHien: '',
    ngayThucHien: new Date().toISOString().split('T')[0],
    gioBatDau: '',
    gioKetThuc: '',
    nhanVienThucHien: '',
    danhGia: '',
    ghiChu: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/luot-tri-lieu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maLieuTrinh: treatment.maLieuTrinh,
        ...sessionData,
      }),
    });
    
    if (res.ok) {
      onSuccess();
    } else {
      toast.error('Có lỗi xảy ra!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Thêm buổi trị liệu</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dịch vụ thực hiện <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sessionData.dichVuThucHien}
                onChange={(e) => setSessionData({ ...sessionData, dichVuThucHien: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="VD: Xoa bóp toàn thân"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày thực hiện
              </label>
              <input
                type="date"
                value={sessionData.ngayThucHien}
                onChange={(e) => setSessionData({ ...sessionData, ngayThucHien: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giờ bắt đầu
                </label>
                <input
                  type="time"
                  value={sessionData.gioBatDau}
                  onChange={(e) => setSessionData({ ...sessionData, gioBatDau: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giờ kết thúc
                </label>
                <input
                  type="time"
                  value={sessionData.gioKetThuc}
                  onChange={(e) => setSessionData({ ...sessionData, gioKetThuc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhân viên thực hiện
              </label>
              <input
                type="text"
                value={sessionData.nhanVienThucHien}
                onChange={(e) => setSessionData({ ...sessionData, nhanVienThucHien: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                rows={3}
                value={sessionData.ghiChu}
                onChange={(e) => setSessionData({ ...sessionData, ghiChu: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Thêm buổi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}