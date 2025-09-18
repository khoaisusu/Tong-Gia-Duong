import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  QrCodeIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  SparklesIcon,
  ShoppingBagIcon,
  CalendarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, generateId } from '../../utils/formatting';
import { KhachHang, DichVu, SanPham, LieuTrinh, DonHang } from '../../utils/columnMapping';

interface TreatmentService {
  dichVu: DichVu;
  soLan: number;
  thanhTien: number;
}

interface TreatmentProduct {
  sanPham: SanPham;
  soLuong: number;
  thanhTien: number;
}

export default function CreateTreatmentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  // States
  const [selectedCustomer, setSelectedCustomer] = useState<KhachHang | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  // Format date for display (dd/mm/yyyy)
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Convert dd/mm/yyyy to yyyy-mm-dd for input value
  const parseDateFromDisplay = (displayDate: string) => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return '';
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    return `${year}-${month}-${day}`;
  };
  const [totalSessions, setTotalSessions] = useState(5);

  // Auto calculate end date based on sessions
  const calculateEndDate = (sessions: number, startDate: string) => {
    if (!startDate) return '';

    const start = new Date(startDate);
    let monthsToAdd = 0;

    switch (sessions) {
      case 1:
        monthsToAdd = 0; // Same day
        break;
      case 5:
        monthsToAdd = 3; // 3 months
        break;
      case 10:
        monthsToAdd = 6; // 6 months
        break;
      default:
        monthsToAdd = 0;
    }

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);
    return endDate.toISOString().split('T')[0];
  };
  const [selectedServices, setSelectedServices] = useState<TreatmentService[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<TreatmentProduct[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [prepaidAmount, setPrepaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [treatmentData, setTreatmentData] = useState<LieuTrinh | null>(null);

  // Auto-update end date when sessions or start date changes
  useEffect(() => {
    if (startDate) {
      const newEndDate = calculateEndDate(totalSessions, startDate);
      setEndDate(newEndDate);
    }
  }, [totalSessions, startDate]);

  // Fetch data
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/khach-hang');
      return res.json();
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('🏥 Fetching services...');
      const res = await fetch('/api/dich-vu');
      if (!res.ok) {
        console.error('❌ Services API error:', res.status, res.statusText);
        throw new Error('Failed to fetch services');
      }
      const data = await res.json();
      console.log('🏥 Services data:', data);
      console.log('🏥 Services count:', data.length);
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/san-pham');
      return res.json();
    },
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const res = await fetch('/api/lieu-trinh');
      return res.json();
    },
  });

  // Calculate next treatment plan number
  const getNextTreatmentNumber = () => {
    console.log('🔍 All treatments:', treatments);

    if (!treatments || treatments.length === 0) {
      console.log('📭 No treatments found, starting with 0001');
      return '0001';
    }

    const allNames = treatments.map((t: LieuTrinh) => t.tenLieuTrinh);
    console.log('📝 All treatment names:', allNames);

    // Filter for valid numbers (both 4-digit like 0001 and regular numbers like 1, 2, 3)
    const validNames = allNames.filter((name: string) => {
      if (!name || name.trim() === '') return false;
      // Accept both formats: 4-digit (0001) or regular numbers (1, 2, 3, etc.)
      return /^\d+$/.test(name.trim());
    });
    console.log('✅ Valid numeric names:', validNames);

    if (validNames.length === 0) {
      console.log('📭 No valid numeric names found, starting with 0001');
      return '0001';
    }

    const treatmentNumbers = validNames.map((name: string) => parseInt(name.trim()));
    console.log('🔢 Numbers:', treatmentNumbers);

    const sortedNumbers = treatmentNumbers.sort((a: number, b: number) => b - a);
    console.log('📊 Sorted numbers (desc):', sortedNumbers);

    const nextNumber = sortedNumbers[0] + 1;
    console.log('➡️ Next number:', nextNumber);

    const formatted = nextNumber.toString().padStart(4, '0');
    console.log('🎯 Formatted result:', formatted);

    return formatted;
  };

  const nextTreatmentName = getNextTreatmentNumber();

  // Filter customers
  const filteredCustomers = customers.filter((customer: KhachHang) => {
    const searchLower = customerSearch.toLowerCase();
    return (
      customer.hoVaTen?.toLowerCase().includes(searchLower) ||
      customer.soDienThoai?.includes(customerSearch) ||
      customer.tenThuongGoi?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 5);

  // Calculate totals
  const servicesTotal = selectedServices.reduce((sum, item) => sum + (item.thanhTien * totalSessions), 0);
  const productsTotal = selectedProducts.reduce((sum, item) => sum + item.thanhTien, 0);
  const subtotal = servicesTotal + productsTotal;
  const discountAmount = discountType === 'percent' ? (subtotal * discount) / 100 : discount;
  const total = subtotal - discountAmount;
  const remaining = total - prepaidAmount;

  // Add service
  const addService = (service: DichVu) => {
    const existing = selectedServices.find(s => s.dichVu.maDichVu === service.maDichVu);
    
    if (existing) {
      updateServiceQuantity(service.maDichVu, existing.soLan + 1);
    } else {
      setSelectedServices([...selectedServices, {
        dichVu: service,
        soLan: 1,
        thanhTien: parseFloat(service.giaDichVu),
      }]);
    }
  };

  // Update service quantity
  const updateServiceQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeService(serviceId);
      return;
    }

    setSelectedServices(selectedServices.map(item => {
      if (item.dichVu.maDichVu === serviceId) {
        return {
          ...item,
          soLan: quantity,
          thanhTien: parseFloat(item.dichVu.giaDichVu) * quantity,
        };
      }
      return item;
    }));
  };

  // Remove service
  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.dichVu.maDichVu !== serviceId));
  };

  // Add product
  const addProduct = (product: SanPham) => {
    const existing = selectedProducts.find(p => p.sanPham.maSanPham === product.maSanPham);
    
    if (existing) {
      updateProductQuantity(product.maSanPham, existing.soLuong + 1);
    } else {
      setSelectedProducts([...selectedProducts, {
        sanPham: product,
        soLuong: 1,
        thanhTien: parseFloat(product.giaBan),
      }]);
    }
  };

  // Update product quantity
  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }

    setSelectedProducts(selectedProducts.map(item => {
      if (item.sanPham.maSanPham === productId) {
        return {
          ...item,
          soLuong: quantity,
          thanhTien: parseFloat(item.sanPham.giaBan) * quantity,
        };
      }
      return item;
    }));
  };

  // Remove product
  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.sanPham.maSanPham !== productId));
  };

  // Create order and treatment mutation
  const createTreatmentMutation = useMutation({
    mutationFn: async (data: { order: Partial<DonHang>, treatment: Partial<LieuTrinh> }) => {
      // Save to Order sheet first
      const orderRes = await fetch('/api/don-hang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.order),
      });
      if (!orderRes.ok) throw new Error('Failed to create order');

      // Save to Treatment sheet
      const treatmentRes = await fetch('/api/lieu-trinh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.treatment),
      });
      if (!treatmentRes.ok) throw new Error('Failed to create treatment');

      return await treatmentRes.json();
    },
    onSuccess: (data) => {
      setTreatmentData(data.data);
      setShowQR(true);
      toast.success('Tạo đơn hàng thành công!');
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi tạo đơn hàng!');
    },
  });

  // Handle create treatment
  const handleCreateTreatment = () => {
    if (!selectedCustomer) {
      toast.error('Vui lòng chọn khách hàng!');
      return;
    }


    const servicesData = selectedServices.map(item => ({
      maDichVu: item.dichVu.maDichVu,
      tenDichVu: item.dichVu.tenDichVu,
      soLan: item.soLan,
      gia: item.dichVu.giaDichVu,
      thanhTien: item.thanhTien,
    }));

    const productsData = selectedProducts.map(item => ({
      maSanPham: item.sanPham.maSanPham,
      tenSanPham: item.sanPham.tenSanPham,
      soLuong: item.soLuong,
      gia: item.sanPham.giaBan,
      thanhTien: item.thanhTien,
    }));

    // Determine payment status based on amounts
    let paymentStatus = 'Chưa thanh toán';
    if (prepaidAmount >= total) {
      paymentStatus = 'Đã thanh toán';
    } else if (prepaidAmount > 0) {
      paymentStatus = 'Thanh toán một phần';
    }

    // Generate treatment name (use the next treatment number as name)
    const treatmentName = nextTreatmentName;

    // For order sheet: save treatment name + accompanying products
    const orderProducts = [
      { tenSanPham: `Liệu trình ${treatmentName} (${totalSessions} buổi)`, soLuong: 1, gia: total, thanhTien: total },
      ...productsData // Only accompanying products, not services
    ];

    // Create Order object
    const order: Partial<DonHang> = {
      maKhachHang: selectedCustomer.maKhachHang,
      tenKhachHang: selectedCustomer.hoVaTen,
      ngayTao: startDate,
      danhSachSanPham: JSON.stringify(orderProducts),
      tongTien: total.toString(),
      giamGia: discountAmount.toString(),
      thanhTien: total.toString(),
      phuongThucThanhToan: 'Tiền mặt',
      trangThaiThanhToan: paymentStatus,
      ghiChu: notes,
      nhanVienTao: session?.user?.name || session?.user?.email || '',
    };

    // Create Treatment object - ordered according to mappingLieuTrinh
    const treatment: Partial<LieuTrinh> = {
      // maLieuTrinh: will be auto-generated by API
      maKhachHang: selectedCustomer.maKhachHang,
      tenKhachHang: selectedCustomer.hoVaTen,
      tenLieuTrinh: treatmentName,
      ngayBatDau: startDate,
      ngayKetThuc: endDate,
      danhSachDichVu: JSON.stringify(servicesData),
      danhSachSanPham: JSON.stringify(productsData),
      soBuoi: totalSessions.toString(),
      soBuoiDaThucHien: '0',
      tongTien: total.toString(),
      daThanhToan: prepaidAmount.toString(),
      conLai: remaining.toString(),
      trangThaiThanhToan: paymentStatus,
      trangThai: 'Đang thực hiện',
      ghiChu: notes,
      nhanVienTuVan: session?.user?.name || session?.user?.email || '',
    };

    createTreatmentMutation.mutate({ order, treatment });
  };

  // Generate QR content
  const generateQRContent = () => {
    if (!treatmentData || !selectedCustomer) return '';
    
    const bankAccount = '1234567890';
    const bankCode = 'VIETCOMBANK';
    const amount = treatmentData.conLai;
    const content = `LT${treatmentData.maLieuTrinh} ${selectedCustomer.tenThuongGoi || selectedCustomer.hoVaTen}`;
    
    return `${bankCode}|${bankAccount}|${amount}|${content}`;
  };

  return (
    <Layout title="Tạo đơn hàng">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <UserGroupIcon className="w-5 h-5 mr-2 text-primary-600" />
                Thông tin khách hàng
              </h2>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm khách hàng theo tên, SĐT..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {filteredCustomers.map((customer: KhachHang) => (
                      <button
                        key={customer.maKhachHang}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.hoVaTen);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <p className="font-medium">{customer.hoVaTen}</p>
                        <p className="text-sm text-gray-600">{customer.soDienThoai}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedCustomer && (
                <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                  <p className="font-medium">{selectedCustomer.hoVaTen}</p>
                  <p className="text-sm text-gray-600">SĐT: {selectedCustomer.soDienThoai}</p>
                  {selectedCustomer.tienSuBenh && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Tiền sử: {selectedCustomer.tienSuBenh}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Treatment Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <HeartIcon className="w-5 h-5 mr-2 text-primary-600" />
                Thông tin liệu trình
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên liệu trình
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium">
                    {nextTreatmentName}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="text"
                    value={formatDateForDisplay(startDate)}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and /
                      const cleanValue = value.replace(/[^\d/]/g, '');

                      // Auto format as user types
                      let formatted = cleanValue;
                      if (cleanValue.length >= 2 && !cleanValue.includes('/')) {
                        formatted = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
                      }
                      if (cleanValue.length >= 5 && cleanValue.split('/').length === 2) {
                        const parts = cleanValue.split('/');
                        formatted = parts[0] + '/' + parts[1].slice(0, 2) + '/' + parts[1].slice(2);
                      }

                      // Update the actual date value if complete
                      if (formatted.length === 10 && formatted.split('/').length === 3) {
                        const convertedDate = parseDateFromDisplay(formatted);
                        if (convertedDate) {
                          setStartDate(convertedDate);
                        }
                      }
                    }}
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày kết thúc (dự kiến)
                  </label>
                  <input
                    type="text"
                    value={formatDateForDisplay(endDate)}
                    readOnly
                    placeholder="dd/mm/yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tổng số buổi
                  </label>
                  <select
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value={1}>1 buổi (cùng ngày)</option>
                    <option value={5}>5 buổi (3 tháng)</option>
                    <option value={10}>10 buổi (6 tháng)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Services Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-primary-600" />
                Chọn dịch vụ
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {console.log('🔍 All services:', services)}
                {console.log('🔍 Service status check:', services.map((s: DichVu) => ({ name: s.tenDichVu, status: s.trangThai })))}
                {services.filter((s: DichVu) => s.trangThai === 'Đang Kinh Doanh' || !s.trangThai).map((service: DichVu) => (
                  <div
                    key={service.maDichVu}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addService(service)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{service.tenDichVu}</h4>
                        <p className="text-xs text-gray-500">{service.thoiGian} phút</p>
                        <p className="text-sm font-semibold text-primary-600 mt-1">
                          {formatCurrency(service.giaDichVu)}
                        </p>
                      </div>
                      <button className="p-1 bg-primary-100 rounded-full hover:bg-primary-200">
                        <PlusIcon className="w-4 h-4 text-primary-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Products Selection (Optional) */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <ShoppingBagIcon className="w-5 h-5 mr-2 text-primary-600" />
                Sản phẩm
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {products.map((product: SanPham) => (
                  <div
                    key={product.maSanPham}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addProduct(product)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{product.tenSanPham}</h4>
                        <p className="text-xs text-gray-500">{product.loaiSanPham}</p>
                        <p className="text-sm font-semibold text-primary-600 mt-1">
                          {formatCurrency(product.giaBan)}
                        </p>
                      </div>
                      <button className="p-1 bg-green-100 rounded-full hover:bg-green-200">
                        <PlusIcon className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Chi tiết đơn hàng</h2>
              
              {/* Selected Services */}
              {selectedServices.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Dịch vụ đã chọn:</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedServices.map((item) => (
                      <div key={item.dichVu.maDichVu} className="border-b pb-2">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-medium flex-1">{item.dichVu.tenDichVu}</h4>
                          <button
                            onClick={() => removeService(item.dichVu.maDichVu)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateServiceQuantity(item.dichVu.maDichVu, item.soLan - 1)}
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              <MinusIcon className="w-3 h-3" />
                            </button>
                            <span className="text-sm w-8 text-center">{item.soLan}x</span>
                            <button
                              onClick={() => updateServiceQuantity(item.dichVu.maDichVu, item.soLan + 1)}
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatCurrency(item.thanhTien * totalSessions)}</div>
                            <div className="text-xs text-gray-500">{item.soLan}x × {totalSessions} buổi</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Sản phẩm:</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedProducts.map((item) => (
                      <div key={item.sanPham.maSanPham} className="border-b pb-2">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-medium flex-1">{item.sanPham.tenSanPham}</h4>
                          <button
                            onClick={() => removeProduct(item.sanPham.maSanPham)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateProductQuantity(item.sanPham.maSanPham, item.soLuong - 1)}
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              <MinusIcon className="w-3 h-3" />
                            </button>
                            <span className="text-sm w-8 text-center">{item.soLuong}</span>
                            <button
                              onClick={() => updateProductQuantity(item.sanPham.maSanPham, item.soLuong + 1)}
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(item.thanhTien)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Discount & Payment */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Giảm giá</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="percent">%</option>
                      <option value="amount">VNĐ</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? 100 : subtotal}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder={discountType === 'percent' ? '0-100' : '0'}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">Thanh toán trước</label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    value={prepaidAmount}
                    onChange={(e) => setPrepaidAmount(Number(e.target.value))}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              {/* Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Dịch vụ:</span>
                  <span>{formatCurrency(servicesTotal)}</span>
                </div>
                {productsTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sản phẩm:</span>
                    <span>{formatCurrency(productsTotal)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Giảm giá:</span>
                    <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Tổng cộng:</span>
                  <span className="text-primary-600">{formatCurrency(total)}</span>
                </div>
                {prepaidAmount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Đã thanh toán:</span>
                      <span className="text-green-600">{formatCurrency(prepaidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Còn lại:</span>
                      <span>{formatCurrency(remaining)}</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Lưu ý về tình trạng sức khỏe, yêu cầu đặc biệt..."
                />
              </div>
              
              {/* Action Button */}
              <button
                onClick={handleCreateTreatment}
                disabled={!selectedCustomer || createTreatmentMutation.isPending}
                className="w-full mt-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTreatmentMutation.isPending ? 'Đang xử lý...' : 'Tạo đơn hàng'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal with QR */}
      {showQR && treatmentData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Đơn hàng đã được tạo!</h3>
                <p className="text-sm text-gray-600 mb-2">Mã liệu trình: {treatmentData.maLieuTrinh}</p>
                <p className="text-sm text-gray-600 mb-4">{treatmentData.tenLieuTrinh}</p>
                
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={() => {
                      setShowQR(false);
                      router.push('/lieu-trinh');
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

