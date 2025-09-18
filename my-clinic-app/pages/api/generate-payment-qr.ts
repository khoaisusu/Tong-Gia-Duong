import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  generateVietQRImageURL,
  validateBankAccount,
  generateTransactionRef,
  VIETNAMESE_BANKS,
  type VietQRPaymentData,
  type QRGenerationResult
} from '../../utils/vietqr';
import {
  getAllRows,
  SHEETS
} from '../../utils/googleSheets';
import { mappingNhanVien, NhanVien } from '../../utils/columnMapping';

interface PaymentRequest {
  orderId: string;
  customerName: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  description?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QRGenerationResult>
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      orderId,
      customerName,
      totalAmount,
      items,
      description
    }: PaymentRequest = req.body;

    // Validate input data
    if (!orderId || !customerName || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment data. Missing required fields or invalid amount.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item.'
      });
    }

    // Get bank configuration from Nhân viên sheet
    let bankConfig;
    try {
      const staffData = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
      const staffWithBank = staffData.find((staff: NhanVien) =>
        staff.nganHang && staff.soTK && staff.quyenHan === 'Admin'
      ) || staffData.find((staff: NhanVien) =>
        staff.nganHang && staff.soTK
      );

      if (staffWithBank) {
        // Find bank by name to get BIN code
        const bankEntry = Object.values(VIETNAMESE_BANKS).find(bank =>
          bank.name.toLowerCase() === staffWithBank.nganHang.toLowerCase() ||
          bank.displayName.toLowerCase() === staffWithBank.nganHang.toLowerCase() ||
          bank.shortName.toLowerCase() === staffWithBank.nganHang.toLowerCase()
        );

        console.log('🔍 Looking for bank:', staffWithBank.nganHang);
        console.log('🏦 Found bank entry:', bankEntry);

        bankConfig = {
          bankBin: bankEntry ? bankEntry.bin : '970407', // Default to Techcombank
          accountNumber: staffWithBank.soTK,
          accountName: 'TRAN CONG KHANG',
          displayName: 'Phòng Khám Tống Gia Đường'
        };

        console.log('💳 Final bank config:', bankConfig);
      } else {
        // Fallback to default configuration
        bankConfig = {
          bankBin: '970407', // Techcombank
          accountNumber: '19070220842011',
          accountName: 'TRAN CONG KHANG',
          displayName: 'Phòng Khám Tống Gia Đường'
        };
      }
    } catch (sheetError) {
      console.error('Error reading bank config from sheet, using default:', sheetError);
      // Fallback to default configuration
      bankConfig = {
        bankBin: '970407', // Techcombank
        accountNumber: '19070220842011',
        accountName: 'TRAN CONG KHANG',
        displayName: 'Phòng Khám Tống Gia Đường'
      };
    }

    // Validate clinic bank configuration
    if (!validateBankAccount(bankConfig.bankBin, bankConfig.accountNumber)) {
      return res.status(500).json({
        success: false,
        error: 'Invalid clinic bank configuration'
      });
    }

    // Generate payment description - simple format: Order ID + Customer Name
    const paymentDescription = `${orderId} - ${customerName}`;

    // Prepare VietQR payment data
    const paymentData: VietQRPaymentData = {
      bankBin: bankConfig.bankBin,
      accountNumber: bankConfig.accountNumber,
      accountName: bankConfig.accountName,
      amount: totalAmount,
      description: paymentDescription,
      orderId: orderId,
      patientName: customerName,
      serviceType: 'Don hang'
    };

    // Generate transaction reference
    const transactionRef = generateTransactionRef(orderId);

    try {
      // Use qrcode.io.vn API for reliable QR generation
      const qrImageURL = generateVietQRImageURL(paymentData);
      console.log('🌐 Generated QR URL:', qrImageURL);
      console.log('💰 Payment data used:', paymentData);

      return res.status(200).json({
        success: true,
        qrDataURL: qrImageURL,
        transactionRef: transactionRef,
        bankInfo: {
          name: bankConfig.displayName,
          account: `${bankConfig.accountNumber} (${Object.values(VIETNAMESE_BANKS).find(b => b.bin === bankConfig.bankBin)?.name || 'Techcombank'})`
        }
      });

    } catch (qrError) {
      console.error('QR Generation Error:', qrError);
      throw new Error('QR code generation failed');
    }

  } catch (error) {
    console.error('Payment QR API Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to generate payment QR code. Please try again.'
    });
  }
}

