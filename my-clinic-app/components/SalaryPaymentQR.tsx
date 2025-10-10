import React, { useState, useEffect } from 'react';
import { XMarkIcon, BanknotesIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface Bank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

interface SalaryPaymentQRProps {
  employeeName: string;
  employeeId: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  onClose: () => void;
}

export default function SalaryPaymentQR({
  employeeName,
  employeeId,
  bankName,
  accountNumber,
  amount,
  onClose,
}: SalaryPaymentQRProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch banks from VietQR API
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const data = await response.json();

        if (data.code === '00' && data.data) {
          setBanks(data.data);

          // Find bank by name or code
          const bank = data.data.find((b: Bank) =>
            b.shortName.toLowerCase().includes(bankName.toLowerCase()) ||
            b.name.toLowerCase().includes(bankName.toLowerCase()) ||
            b.code.toLowerCase() === bankName.toLowerCase()
          );

          if (bank) {
            setSelectedBank(bank);
          } else {
            // Default to first bank if not found
            setSelectedBank(data.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, [bankName]);

  // Generate QR code URL
  useEffect(() => {
    if (selectedBank && accountNumber && amount > 0) {
      // Format amount to remove decimals
      const formattedAmount = Math.round(amount);

      // Create payment description
      const description = `Luong thang cho ${employeeName} ${employeeId}`.replace(/\s+/g, ' ');

      // VietQR API URL format
      const qrCodeUrl = `https://img.vietqr.io/image/${selectedBank.bin}-${accountNumber}-compact2.jpg?amount=${formattedAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(employeeName)}`;

      setQrUrl(qrCodeUrl);
    }
  }, [selectedBank, accountNumber, amount, employeeName, employeeId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

          <div className="relative bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BanknotesIcon className="w-6 h-6 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Thanh toán lương
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Nhân viên</p>
                <p className="font-semibold text-gray-900">{employeeName}</p>
              </div>
              <div>
                <p className="text-gray-600">Mã NV</p>
                <p className="font-semibold text-gray-900">{employeeId}</p>
              </div>
              <div>
                <p className="text-gray-600">Số tiền</p>
                <p className="font-bold text-green-600 text-lg">
                  {amount.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <div>
                <p className="text-gray-600">Tài khoản</p>
                <p className="font-semibold text-gray-900">{accountNumber}</p>
              </div>
            </div>
          </div>

          {/* Bank Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngân hàng
            </label>
            <select
              value={selectedBank?.id || ''}
              onChange={(e) => {
                const bank = banks.find((b) => b.id === parseInt(e.target.value));
                if (bank) setSelectedBank(bank);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.shortName} - {bank.name}
                </option>
              ))}
            </select>
          </div>

          {/* QR Code */}
          {qrUrl && (
            <div className="mb-4">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <div className="flex justify-center">
                  <div className="relative w-64 h-64">
                    <Image
                      src={qrUrl}
                      alt="VietQR Payment Code"
                      fill
                      className="object-contain"
                      onError={(e) => {
                        console.error('Error loading QR code');
                        e.currentTarget.src = '/placeholder-qr.png';
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Quét mã QR để chuyển lương cho nhân viên
                  </p>
                  <p className="text-xs text-gray-500">
                    Nội dung: Luong thang cho {employeeName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Info Display */}
          {selectedBank && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                {selectedBank.logo && (
                  <div className="relative w-12 h-12 mr-3">
                    <Image
                      src={selectedBank.logo}
                      alt={selectedBank.shortName}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{selectedBank.shortName}</p>
                  <p className="text-xs text-gray-600">{selectedBank.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              Hướng dẫn thanh toán:
            </p>
            <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Mở ứng dụng ngân hàng của bạn</li>
              <li>Chọn chức năng quét mã QR</li>
              <li>Quét mã QR bên trên</li>
              <li>Kiểm tra thông tin và xác nhận thanh toán</li>
            </ol>
          </div>

          {/* Close Button */}
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
