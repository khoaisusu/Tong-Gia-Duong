// VietQR Banking Integration for Vietnamese Healthcare Payments
// Compliant with State Bank of Vietnam (SBV) QR Payment Standard

// Vietnamese bank configurations following NAPAS BIN standards
export const VIETNAMESE_BANKS = {
  vietinbank: {
    name: 'VietinBank',
    bin: '970415',
    shortName: 'ICB',
    displayName: 'Ngân hàng TMCP Công thương Việt Nam'
  },
  vietcombank: {
    name: 'Vietcombank',
    bin: '970436',
    shortName: 'VCB',
    displayName: 'Ngân hàng TMCP Ngoại Thương Việt Nam'
  },
  bidv: {
    name: 'BIDV',
    bin: '970418',
    shortName: 'BIDV',
    displayName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam'
  },
  agribank: {
    name: 'Agribank',
    bin: '970405',
    shortName: 'VBA',
    displayName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam'
  },
  ocb: {
    name: 'OCB',
    bin: '970448',
    shortName: 'OCB',
    displayName: 'Ngân hàng TMCP Phương Đông'
  },
  mbbank: {
    name: 'MBBank',
    bin: '970422',
    shortName: 'MB',
    displayName: 'Ngân hàng TMCP Quân đội'
  },
  techcombank: {
    name: 'Techcombank',
    bin: '970407',
    shortName: 'TCB',
    displayName: 'Ngân hàng TMCP Kỹ thương Việt Nam'
  },
  acb: {
    name: 'ACB',
    bin: '970416',
    shortName: 'ACB',
    displayName: 'Ngân hàng TMCP Á Châu'
  },
  vpbank: {
    name: 'VPBank',
    bin: '970432',
    shortName: 'VPB',
    displayName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng'
  },
  tpbank: {
    name: 'TPBank',
    bin: '970423',
    shortName: 'TPB',
    displayName: 'Ngân hàng TMCP Tiên Phong'
  },
  sacombank: {
    name: 'Sacombank',
    bin: '970403',
    shortName: 'STB',
    displayName: 'Ngân hàng TMCP Sài Gòn Thương Tín'
  },
  hdbank: {
    name: 'HDBank',
    bin: '970437',
    shortName: 'HDB',
    displayName: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh'
  },
  vietcapitalbank: {
    name: 'VietCapitalBank',
    bin: '970454',
    shortName: 'VCCB',
    displayName: 'Ngân hàng TMCP Bản Việt'
  },
  scb: {
    name: 'SCB',
    bin: '970429',
    shortName: 'SCB',
    displayName: 'Ngân hàng TMCP Sài Gòn'
  },
  vib: {
    name: 'VIB',
    bin: '970441',
    shortName: 'VIB',
    displayName: 'Ngân hàng TMCP Quốc tế Việt Nam'
  }
} as const;

// VietQR payment data structure
export interface VietQRPaymentData {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderId?: string;
  patientName?: string;
  serviceType?: string;
}

// QR generation response
export interface QRGenerationResult {
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

// Sanitize Vietnamese text for QR compatibility
export function sanitizeVietnameseText(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese accents
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '') // Remove special characters
    .trim()
    .substring(0, 50); // Limit length for QR compatibility
}

// Format amount for Vietnamese Dong (no decimals)
export function formatVNDAmount(amount: number): string {
  return Math.round(amount).toString();
}


// Generate QR code using qrcode.io.vn API (primary method)
export function generateVietQRImageURL(paymentData: VietQRPaymentData): string {
  const {
    bankBin,
    accountNumber,
    amount,
    description
  } = paymentData;

  // Find bank by BIN code and map to qrcode.io.vn bank codes
  const bank = Object.values(VIETNAMESE_BANKS).find(b => b.bin === bankBin);
  let bankCode = bankBin; // fallback to BIN

  if (bank) {
    // Map to qrcode.io.vn supported bank codes
    switch(bank.shortName.toLowerCase()) {
      case 'tcb': bankCode = 'techcombank'; break;
      case 'vcb': bankCode = 'vietcombank'; break;
      case 'bidv': bankCode = 'bidv'; break;
      case 'vba': bankCode = 'agribank'; break;
      case 'mb': bankCode = 'mbbank'; break;
      case 'acb': bankCode = 'acb'; break;
      case 'vpb': bankCode = 'vpbank'; break;
      case 'tpb': bankCode = 'tpbank'; break;
      case 'stb': bankCode = 'sacombank'; break;
      case 'hdb': bankCode = 'hdbank'; break;
      case 'scb': bankCode = 'scb'; break;
      case 'vib': bankCode = 'vib'; break;
      case 'ocb': bankCode = 'ocb'; break;
      default: bankCode = bank.shortName.toLowerCase();
    }
  }

  // Sanitize description for URL (no special characters, Vietnamese without accents)
  const sanitizedDescription = sanitizeVietnameseText(description || 'Thanh toan don hang');

  // Use qrcode.io.vn API format: /{bankcode}/{accountNo}/{amount}/{addinfo}
  return `https://qrcode.io.vn/api/generate/${bankCode}/${accountNumber}/${formatVNDAmount(amount)}/${sanitizedDescription}`;
}

// Validate Vietnamese bank account number
export function validateBankAccount(bankBin: string, accountNumber: string): boolean {
  const bank = Object.values(VIETNAMESE_BANKS).find(b => b.bin === bankBin);

  if (!bank) return false;
  if (!accountNumber || !/^\d+$/.test(accountNumber)) return false;

  // Bank-specific validation rules
  switch (bankBin) {
    case '970415': // VietinBank
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970436': // Vietcombank
      return accountNumber.length >= 10 && accountNumber.length <= 16;
    case '970418': // BIDV
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970405': // Agribank
      return accountNumber.length >= 8 && accountNumber.length <= 19;
    case '970448': // OCB
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970422': // MBBank
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970407': // Techcombank
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970416': // ACB
      return accountNumber.length >= 6 && accountNumber.length <= 19;
    case '970432': // VPBank
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970423': // TPBank
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970403': // Sacombank
      return accountNumber.length >= 8 && accountNumber.length <= 19;
    case '970437': // HDBank
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970454': // VietCapitalBank
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    case '970429': // SCB
      return accountNumber.length >= 8 && accountNumber.length <= 19;
    case '970441': // VIB
      return accountNumber.length >= 10 && accountNumber.length <= 19;
    default:
      return accountNumber.length >= 8 && accountNumber.length <= 19;
  }
}

// Generate transaction reference for tracking
export function generateTransactionRef(orderId?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const prefix = orderId ? `ORD${orderId}` : 'TXN';
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

// Clinic payment configuration
export const CLINIC_CONFIG = {
  name: 'PHONG KHAM TONG GIA DUONG',
  displayName: 'Phòng Khám Tống Gia Đường',
  // These should be set via environment variables in production
  bankBin: process.env.CLINIC_BANK_BIN || '970415', // Default to VietinBank
  accountNumber: process.env.CLINIC_ACCOUNT_NUMBER || '1234567890',
  accountName: process.env.CLINIC_ACCOUNT_NAME || 'PHONG KHAM TONG GIA DUONG'
};