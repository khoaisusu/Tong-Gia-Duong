import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  QrCodeIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/formatting';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface PaymentData {
  orderId: string;
  customerName: string;
  totalAmount: number;
  items: OrderItem[];
  description?: string;
}

interface QRResponse {
  success: boolean;
  qrCode?: string;
  qrDataURL?: string;
  transactionRef?: string;
  error?: string;
  bankInfo?: {
    name: string;
    account: string;
  };
}

interface VietQRPaymentProps {
  paymentData: PaymentData;
  orderDetails?: any; // Full order details for comprehensive display
  onPaymentComplete?: (transactionRef: string) => void;
  onPaymentCancel?: () => void;
  className?: string;
}

export default function VietQRPayment({
  paymentData,
  orderDetails,
  onPaymentComplete,
  onPaymentCancel,
  className = ''
}: VietQRPaymentProps) {
  const [qrResult, setQrResult] = useState<QRResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [showInstructions, setShowInstructions] = useState(false);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalSessions, setTotalSessions] = useState(1);

  useEffect(() => {
    generatePaymentQR();
    if (orderDetails) {
      fetchOrderDetails();
    }
  }, [orderDetails]);

  const fetchOrderDetails = async () => {
    if (!orderDetails) return;

    try {
      const res = await fetch('/api/lieu-trinh');
      if (res.ok) {
        const treatments = await res.json();
        const matchingTreatment = treatments.find((t: any) =>
          t.maKhachHang === orderDetails.maKhachHang &&
          t.ngayBatDau === orderDetails.ngayTao
        );

        if (matchingTreatment) {
          const sessions = parseInt(matchingTreatment.soBuoi || '1');
          setTotalSessions(sessions);

          const treatmentServices = JSON.parse(matchingTreatment.danhSachDichVu || '[]');
          const servicesWithSessionCalculation = treatmentServices.map((service: any) => ({
            ...service,
            soLuong: sessions,
            thanhTienTotal: parseFloat(service.thanhTien || service.gia || '0') * sessions
          }));
          setServices(servicesWithSessionCalculation);

          try {
            const orderProducts = JSON.parse(orderDetails.danhSachSanPham || '[]');
            const actualProducts = orderProducts.filter((item: any) =>
              !item.tenSanPham?.includes('Liệu trình') &&
              (item.maSanPham || item.tenSanPham)
            );

            const productsWithCorrectAmount = actualProducts.map((product: any) => ({
              ...product,
              thanhTienTotal: parseFloat(product.thanhTien || (product.gia || product.giaBan || '0') * (product.soLuong || 1))
            }));
            setProducts(productsWithCorrectAmount);
          } catch (e) {
            console.error('Error parsing order products:', e);
            setProducts([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching treatment data:', error);
    }
  };


  // Countdown timer for QR code expiry
  useEffect(() => {
    if (timeRemaining > 0 && paymentStatus === 'pending') {
      const timer = setTimeout(() => setTimeRemaining(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      toast.error('QR code đã hết hạn. Vui lòng tạo mã mới.');
    }
  }, [timeRemaining, paymentStatus]);

  const generatePaymentQR = async () => {
    try {
      setLoading(true);
      setPaymentStatus('pending');
      setTimeRemaining(300); // Reset timer

      const response = await fetch('/api/generate-payment-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentData.orderId,
          customerName: paymentData.customerName,
          totalAmount: paymentData.totalAmount,
          items: paymentData.items,
          description: paymentData.description
        })
      });

      const result: QRResponse = await response.json();

      if (result.success) {
        setQrResult(result);
        toast.success('Đã tạo mã QR thanh toán thành công');
      } else {
        throw new Error(result.error || 'Không thể tạo mã QR thanh toán');
      }
    } catch (error) {
      console.error('QR Generation Error:', error);
      toast.error('Lỗi tạo mã QR thanh toán');
      setQrResult({
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi không xác định'
      });
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleRegenerateQR = () => {
    setRegenerating(true);
    generatePaymentQR();
  };

  const handleCopyTransactionRef = () => {
    if (qrResult?.transactionRef) {
      navigator.clipboard.writeText(qrResult.transactionRef);
      toast.success('Đã sao chép mã giao dịch');
    }
  };

  const markPaymentCompleted = () => {
    setPaymentStatus('completed');
    toast.success('Xác nhận thanh toán thành công!');
    if (onPaymentComplete && qrResult?.transactionRef) {
      onPaymentComplete(qrResult.transactionRef);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Đang tạo mã QR thanh toán...</span>
      </div>
    );
  }

  if (!qrResult?.success) {
    return (
      <div className={`text-center p-6 bg-red-50 rounded-lg ${className}`}>
        <XCircleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Không thể tạo mã QR thanh toán
        </h3>
        <p className="text-red-600 mb-4">
          {qrResult?.error || 'Lỗi không xác định'}
        </p>
        <div className="space-x-3">
          <button
            onClick={handleRegenerateQR}
            disabled={regenerating}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {regenerating ? (
              <>
                <ArrowPathIcon className="w-4 h-4 inline mr-2 animate-spin" />
                Đang tạo lại...
              </>
            ) : (
              'Thử lại'
            )}
          </button>
          {onPaymentCancel && (
            <button
              onClick={onPaymentCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Hủy
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <QrCodeIcon className="w-8 h-8 text-primary-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">
            Thanh toán QR Code
          </h3>
        </div>

        {paymentStatus === 'pending' && (
          <div className="flex items-center justify-center text-sm text-gray-600">
            <ClockIcon className="w-4 h-4 mr-1" />
            Còn lại: {formatTime(timeRemaining)}
          </div>
        )}

        {paymentStatus === 'completed' && (
          <div className="flex items-center justify-center text-sm text-green-600">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Đã thanh toán thành công
          </div>
        )}
      </div>

      {/* QR Code Display */}
      <div className="flex justify-center mb-6">
        <div className={`p-4 bg-white border-2 rounded-lg transition-opacity ${
          paymentStatus === 'completed' ? 'opacity-50' : 'border-gray-200'
        }`}>
          {qrResult.qrDataURL && (
            <img
              src={qrResult.qrDataURL}
              alt="QR Code Thanh toán"
              className="w-64 h-64 object-contain"
            />
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="space-y-3 text-sm mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Mã đơn hàng:</span>
          <span className="font-medium">{paymentData.orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Khách hàng:</span>
          <span className="font-medium">{paymentData.customerName}</span>
        </div>
        {/* Order Details */}
        <div className="border rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto">
          {/* Services Section */}
          {services.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Dịch vụ điều trị:</h4>
              <div className="space-y-2">
                {services.map((service: any, index: number) => (
                  <div key={index} className="text-sm border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="text-gray-700">{service.tenDichVu}</span>
                      <span className="font-medium">{formatCurrency(service.thanhTienTotal)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {service.soLuong} buổi × {formatCurrency(service.gia)}/buổi
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          {products.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Sản phẩm kèm theo:</h4>
              <div className="space-y-2">
                {products.map((product: any, index: number) => (
                  <div key={index} className="text-sm border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="text-gray-700">{product.tenSanPham}</span>
                      <span className="font-medium">{formatCurrency(product.thanhTienTotal || product.thanhTien)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {product.soLuong} × {formatCurrency(product.gia || product.giaBan)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback to simple display if no detailed data */}
          {services.length === 0 && products.length === 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Chi tiết thanh toán:</h4>
              <div className="space-y-2">
                {paymentData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium text-gray-800">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Tổng tiền:</span>
            <span className="font-bold text-primary-600">
              {formatCurrency(paymentData.totalAmount)}
            </span>
          </div>
        </div>

        {qrResult.transactionRef && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Mã giao dịch:</span>
            <div className="flex items-center">
              <span className="font-mono text-xs mr-2">{qrResult.transactionRef}</span>
              <button
                onClick={handleCopyTransactionRef}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Sao chép mã giao dịch"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {qrResult.bankInfo && (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Thông tin ngân hàng:</strong><br />
              {qrResult.bankInfo.name}<br />
              Tài khoản: {qrResult.bankInfo.account}
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mb-6">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-sm text-primary-600 hover:text-primary-700 underline mb-3"
        >
          {showInstructions ? 'Ẩn' : 'Xem'} hướng dẫn thanh toán
        </button>

        {showInstructions && (
          <div className="p-3 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Hướng dẫn thanh toán:</h4>
            <ol className="text-xs text-yellow-800 space-y-1">
              <li>1. Mở ứng dụng ngân hàng trên điện thoại</li>
              <li>2. Chọn &quot;Thanh toán QR&quot; hoặc &quot;Chuyển khoản&quot;</li>
              <li>3. Quét mã QR phía trên</li>
              <li>4. Kiểm tra thông tin và xác nhận thanh toán</li>
              <li>5. Báo cho nhân viên khi hoàn tất</li>
            </ol>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {paymentStatus === 'pending' && (
          <>
            <button
              onClick={markPaymentCompleted}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Xác nhận đã thanh toán
            </button>

            <div className="flex space-x-3">
              <button
                onClick={handleRegenerateQR}
                disabled={regenerating}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                {regenerating ? (
                  <ArrowPathIcon className="w-4 h-4 inline mr-2 animate-spin" />
                ) : (
                  <QrCodeIcon className="w-4 h-4 inline mr-2" />
                )}
                Tạo lại QR
              </button>

              {onPaymentCancel && (
                <button
                  onClick={onPaymentCancel}
                  className="flex-1 px-4 py-2 bg-red-200 text-red-700 rounded-lg hover:bg-red-300"
                >
                  Hủy thanh toán
                </button>
              )}
            </div>
          </>
        )}

        {paymentStatus === 'completed' && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">
              Thanh toán đã được xác nhận thành công!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}