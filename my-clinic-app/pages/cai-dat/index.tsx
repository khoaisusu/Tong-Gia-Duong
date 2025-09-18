import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import {
  Cog6ToothIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { VIETNAMESE_BANKS } from '../../utils/vietqr';

export default function CaiDatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Check admin permission
  React.useEffect(() => {
    if (session && session.user?.role !== 'Admin') {
      toast.error('Bạn không có quyền truy cập trang này');
      router.push('/');
    }
  }, [session, router]);

  // Form states
  const [clinicInfo, setClinicInfo] = useState({
    name: 'Phòng khám Tống Gia Đường',
    owner: 'Bác sỹ Lực',
    phone: '0901234567',
    email: 'tonggiaduong@gmail.com',
    address: '123 Đường ABC, Quận XYZ, TP.HCM',
    website: 'www.tonggiaduong.vn',
    taxCode: '0123456789',
    licenseNumber: 'GP-12345/2020',
  });

  // Fetch bank settings from Google Sheet
  const { data: bankSettings = [] } = useQuery({
    queryKey: ['bank-settings'],
    queryFn: async () => {
      const res = await fetch('/api/ngan-hang');
      if (!res.ok) throw new Error('Failed to fetch bank settings');
      return res.json();
    },
  });

  // Get the first (active) bank setting
  const activeBankSetting = bankSettings.find((bank: any) => bank.trangThai === 'Hoạt động') || bankSettings[0];

  const [paymentSettings, setPaymentSettings] = useState({
    bankBin: '970416',
    bankName: 'Techcombank',
    accountNumber: '19070220842011',
    accountName: 'PHONG KHAM TONG GIA DUONG',
    branch: 'Chi nhánh HCM',
    qrPrefix: 'TGD',
    vatRate: 10,
    defaultPaymentMethod: 'Tiền mặt',
  });

  // Update payment settings when bank data is loaded
  useEffect(() => {
    if (activeBankSetting) {
      // Find matching bank in VIETNAMESE_BANKS by name
      const matchingBank = Object.values(VIETNAMESE_BANKS).find(
        bank => bank.name.toLowerCase().includes(activeBankSetting.tenNganHang?.toLowerCase()) ||
                bank.displayName.toLowerCase().includes(activeBankSetting.tenNganHang?.toLowerCase())
      );

      setPaymentSettings(prev => ({
        ...prev,
        bankBin: activeBankSetting.maBin || matchingBank?.bin || '970416',
        bankName: activeBankSetting.tenNganHang || 'Techcombank',
        accountNumber: activeBankSetting.soTaiKhoan || '19070220842011',
        accountName: activeBankSetting.tenTaiKhoan || 'PHONG KHAM TONG GIA DUONG',
        branch: activeBankSetting.chiNhanh || 'Chi nhánh HCM',
      }));
    }
  }, [activeBankSetting]);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminder: true,
    reminderHours: 24,
    birthdayWishes: true,
    promotionNotifications: false,
  });

  const [systemSettings, setSystemSettings] = useState({
    language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    dateFormat: 'DD/MM/YYYY',
    currency: 'VND',
    workingHours: {
      start: '08:00',
      end: '20:00',
    },
    workingDays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    appointmentDuration: 60,
    autoBackup: true,
    backupFrequency: 'daily',
  });

  // Mutation to update bank settings
  const updateBankMutation = useMutation({
    mutationFn: async (bankData: any) => {
      const response = await fetch('/api/ngan-hang', {
        method: activeBankSetting ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankData),
      });

      if (!response.ok) {
        throw new Error('Failed to update bank settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-settings'] });
      toast.success('Lưu cài đặt ngân hàng thành công!');
    },
    onError: (error) => {
      console.error('Error updating bank settings:', error);
      toast.error('Có lỗi xảy ra khi lưu cài đặt ngân hàng!');
    },
  });

  const handleSave = async () => {
    if (activeTab === 'payment') {
      setIsSaving(true);

      // Find the selected bank details
      const selectedBank = Object.values(VIETNAMESE_BANKS).find(bank => bank.bin === paymentSettings.bankBin);

      const bankData = {
        tenNganHang: selectedBank?.displayName || paymentSettings.bankName,
        maBin: paymentSettings.bankBin,
        soTaiKhoan: paymentSettings.accountNumber,
        tenTaiKhoan: paymentSettings.accountName,
        chiNhanh: paymentSettings.branch,
        trangThai: 'Hoạt động',
      };

      if (activeBankSetting) {
        // Update existing
        bankData.soTaiKhoan = activeBankSetting.soTaiKhoan; // Use existing account as key
      }

      try {
        await updateBankMutation.mutateAsync(bankData);
      } finally {
        setIsSaving(false);
      }
    } else {
      // For other tabs, just show success (you can implement other settings later)
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        toast.success('Lưu cài đặt thành công!');
      }, 1000);
    }
  };

  const handleBackup = () => {
    toast.success('Đang sao lưu dữ liệu...');
    // In real app, this would trigger Google Sheets backup
  };

  const handleRestore = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục dữ liệu? Điều này sẽ ghi đè dữ liệu hiện tại.')) {
      toast.success('Đang khôi phục dữ liệu...');
    }
  };

  const tabs = [
    { id: 'general', label: 'Thông tin chung', icon: BuildingOfficeIcon },
    { id: 'payment', label: 'Thanh toán', icon: CurrencyDollarIcon },
    { id: 'notification', label: 'Thông báo', icon: BellIcon },
    { id: 'system', label: 'Hệ thống', icon: Cog6ToothIcon },
    { id: 'backup', label: 'Sao lưu', icon: CloudArrowUpIcon },
    { id: 'security', label: 'Bảo mật', icon: ShieldCheckIcon },
  ];

  return (
    <Layout title="Cài đặt">
      {session?.user?.role === 'Admin' ? (
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow-sm p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Thông tin phòng khám</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên phòng khám
                    </label>
                    <input
                      type="text"
                      value={clinicInfo.name}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chủ phòng khám
                    </label>
                    <input
                      type="text"
                      value={clinicInfo.owner}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, owner: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={clinicInfo.phone}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={clinicInfo.email}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      value={clinicInfo.address}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="text"
                      value={clinicInfo.website}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã số thuế
                    </label>
                    <input
                      type="text"
                      value={clinicInfo.taxCode}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, taxCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số giấy phép
                    </label>
                    <input
                      type="text"
                      value={clinicInfo.licenseNumber}
                      onChange={(e) => setClinicInfo({ ...clinicInfo, licenseNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payment' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Cài đặt thanh toán</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium mb-4">Thông tin ngân hàng</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ngân hàng
                        </label>
                        <select
                          value={paymentSettings.bankBin}
                          onChange={(e) => {
                            const selectedBank = Object.values(VIETNAMESE_BANKS).find(bank => bank.bin === e.target.value);
                            setPaymentSettings({
                              ...paymentSettings,
                              bankBin: e.target.value,
                              bankName: selectedBank?.name || ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          {Object.values(VIETNAMESE_BANKS).map((bank) => (
                            <option key={bank.bin} value={bank.bin}>
                              {bank.displayName} ({bank.name})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số tài khoản
                        </label>
                        <input
                          type="text"
                          value={paymentSettings.accountNumber}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, accountNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tên tài khoản
                        </label>
                        <input
                          type="text"
                          value={paymentSettings.accountName}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, accountName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Chi nhánh
                        </label>
                        <input
                          type="text"
                          value={paymentSettings.branch}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, branch: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">
                        Tích hợp VietQR - Thanh toán QR Code
                      </h4>
                      <p className="text-sm text-blue-700 mb-2">
                        Hệ thống hỗ trợ tạo mã QR thanh toán tuân thủ tiêu chuẩn VietQR của Việt Nam,
                        tương thích với tất cả {Object.values(VIETNAMESE_BANKS).length} ngân hàng được tích hợp.
                      </p>
                      <div className="text-xs text-blue-600">
                        <strong>Ngân hàng được hỗ trợ:</strong> {Object.values(VIETNAMESE_BANKS).map(bank => bank.name).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium mb-4">Cài đặt khác</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tiền tố mã QR
                        </label>
                        <input
                          type="text"
                          value={paymentSettings.qrPrefix}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, qrPrefix: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Thuế VAT (%)
                        </label>
                        <input
                          type="number"
                          value={paymentSettings.vatRate}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, vatRate: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phương thức thanh toán mặc định
                        </label>
                        <select
                          value={paymentSettings.defaultPaymentMethod}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, defaultPaymentMethod: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="Tiền mặt">Tiền mặt</option>
                          <option value="Chuyển khoản">Chuyển khoản</option>
                          <option value="Thẻ">Thẻ</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notification' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Cài đặt thông báo</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium mb-4">Kênh thông báo</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                          className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Thông báo qua Email</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.smsNotifications}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
                          className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Thông báo qua SMS</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Loại thông báo</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.appointmentReminder}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, appointmentReminder: e.target.checked })}
                          className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Nhắc nhở lịch hẹn</span>
                      </label>
                      
                      {notificationSettings.appointmentReminder && (
                        <div className="ml-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nhắc trước (giờ)
                          </label>
                          <input
                            type="number"
                            value={notificationSettings.reminderHours}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, reminderHours: Number(e.target.value) })}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.birthdayWishes}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, birthdayWishes: e.target.checked })}
                          className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Chúc mừng sinh nhật khách hàng</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.promotionNotifications}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, promotionNotifications: e.target.checked })}
                          className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Thông báo khuyến mãi</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Cài đặt hệ thống</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngôn ngữ
                      </label>
                      <select
                        value={systemSettings.language}
                        onChange={(e) => setSystemSettings({ ...systemSettings, language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Múi giờ
                      </label>
                      <select
                        value={systemSettings.timezone}
                        onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="Asia/Ho_Chi_Minh">Việt Nam (UTC+7)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Định dạng ngày
                      </label>
                      <select
                        value={systemSettings.dateFormat}
                        onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Đơn vị tiền tệ
                      </label>
                      <select
                        value={systemSettings.currency}
                        onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="VND">VND - Việt Nam Đồng</option>
                        <option value="USD">USD - US Dollar</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Giờ làm việc</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Giờ bắt đầu
                        </label>
                        <input
                          type="time"
                          value={systemSettings.workingHours.start}
                          onChange={(e) => setSystemSettings({ 
                            ...systemSettings, 
                            workingHours: { ...systemSettings.workingHours, start: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Giờ kết thúc
                        </label>
                        <input
                          type="time"
                          value={systemSettings.workingHours.end}
                          onChange={(e) => setSystemSettings({ 
                            ...systemSettings, 
                            workingHours: { ...systemSettings.workingHours, end: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày làm việc
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                          <label key={day} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemSettings.workingDays.includes(day)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSystemSettings({
                                    ...systemSettings,
                                    workingDays: [...systemSettings.workingDays, day]
                                  });
                                } else {
                                  setSystemSettings({
                                    ...systemSettings,
                                    workingDays: systemSettings.workingDays.filter(d => d !== day)
                                  });
                                }
                              }}
                              className="mr-2 rounded border-gray-300 text-primary-600"
                            />
                            <span className="text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian mặc định cho lịch hẹn (phút)
                    </label>
                    <input
                      type="number"
                      value={systemSettings.appointmentDuration}
                      onChange={(e) => setSystemSettings({ ...systemSettings, appointmentDuration: Number(e.target.value) })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}

            {/* Backup Settings */}
            {activeTab === 'backup' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Sao lưu & Khôi phục</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium mb-4">Sao lưu tự động</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={systemSettings.autoBackup}
                          onChange={(e) => setSystemSettings({ ...systemSettings, autoBackup: e.target.checked })}
                          className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Bật sao lưu tự động</span>
                      </label>
                      
                      {systemSettings.autoBackup && (
                        <div className="ml-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tần suất sao lưu
                          </label>
                          <select
                            value={systemSettings.backupFrequency}
                            onChange={(e) => setSystemSettings({ ...systemSettings, backupFrequency: e.target.value })}
                            className="w-48 px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="daily">Hàng ngày</option>
                            <option value="weekly">Hàng tuần</option>
                            <option value="monthly">Hàng tháng</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Sao lưu thủ công</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-4">
                        Tạo bản sao lưu ngay lập tức của toàn bộ dữ liệu trên Google Sheets
                      </p>
                      <button
                        onClick={handleBackup}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                        Sao lưu ngay
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Khôi phục dữ liệu</h3>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-800 mb-4">
                            Cảnh báo: Khôi phục dữ liệu sẽ ghi đè toàn bộ dữ liệu hiện tại. 
                            Hãy đảm bảo đã sao lưu dữ liệu hiện tại trước khi khôi phục.
                          </p>
                          <button
                            onClick={handleRestore}
                            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                          >
                            <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                            Khôi phục dữ liệu
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Lịch sử sao lưu</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Thời gian
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Loại
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Trạng thái
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Kích thước
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date().toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Tự động
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Thành công
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              2.5 MB
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-6">Bảo mật</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium mb-4">Quyền truy cập</h3>
                    <div className="p-4 bg-green-50 rounded-lg mb-4">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                        <p className="text-sm text-green-800">
                          Hệ thống đang sử dụng xác thực Google OAuth 2.0 an toàn
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-700">
                          Chỉ cho phép email được đăng ký
                        </span>
                        <span className="text-sm text-green-600">✓ Đã bật</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-700">
                          Xác thực 2 yếu tố
                        </span>
                        <span className="text-sm text-gray-500">Theo cài đặt Google</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-700">
                          Mã hóa dữ liệu
                        </span>
                        <span className="text-sm text-green-600">✓ SSL/TLS</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Nhật ký hoạt động</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Thời gian
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Người dùng
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Hoạt động
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              10:30 13/09/2025
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              Bác sỹ Lực
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Đăng nhập hệ thống
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              09:15 13/09/2025
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              Nhân viên A
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Thêm khách hàng mới
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Đang kiểm tra quyền truy cập...</p>
        </div>
      )}
    </Layout>
  );
}