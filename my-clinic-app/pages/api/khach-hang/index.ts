import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  getAllRows,
  appendRow,
  SHEETS
} from '../../../utils/googleSheets';
import { mappingKhachHang, KhachHang } from '../../../utils/columnMapping';
import { validateRequest, CustomerSchema } from '../../../utils/inputValidation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all customers
        const customers = await getAllRows(SHEETS.KHACH_HANG, mappingKhachHang);
        return res.status(200).json(customers);

      case 'POST':
        // Create new customer with comprehensive validation
        const newCustomer = req.body as Partial<KhachHang>;

        // ✅ Step 1: Validate and sanitize input
        const validation = validateRequest(newCustomer, CustomerSchema);
        if (!validation.valid) {
          console.warn('❌ Customer validation failed:', validation.errors);
          return res.status(400).json({
            error: 'Dữ liệu không hợp lệ',
            details: validation.errors
          });
        }

        // Use sanitized data to prevent XSS
        const sanitizedCustomer = validation.data!;

        // ✅ Step 2: Check if phone number already exists
        const existingCustomers = await getAllRows(SHEETS.KHACH_HANG, mappingKhachHang);
        const phoneExists = existingCustomers.some(
          (c: KhachHang) => c.soDienThoai === sanitizedCustomer.soDienThoai
        );

        if (phoneExists) {
          return res.status(400).json({
            error: 'Số điện thoại đã tồn tại trong hệ thống'
          });
        }

        // ✅ Step 3: Add metadata
        const customerData = {
          ...sanitizedCustomer,
          ngayTao: new Date().toISOString().split('T')[0],
          trangThai: sanitizedCustomer.trangThai || 'Mới',
        };

        console.log('✅ Creating customer with validated data:', {
          hoVaTen: customerData.hoVaTen,
          soDienThoai: customerData.soDienThoai,
          email: customerData.email || 'N/A'
        });

        await appendRow(SHEETS.KHACH_HANG, mappingKhachHang, customerData);

        return res.status(201).json({
          message: 'Thêm khách hàng thành công',
          data: customerData
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('❌ [KHACH_HANG_API] Error:', error);
    console.error('❌ [KHACH_HANG_API] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    // Log environment variables status for debugging
    console.log('🔍 [KHACH_HANG_API] Environment check:');
    console.log('  - GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'SET' : 'MISSING');
    console.log('  - GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'SET (length: ' + process.env.GOOGLE_PRIVATE_KEY.length + ')' : 'MISSING');
    console.log('  - GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID ? 'SET' : 'MISSING');

    return res.status(500).json({
      error: 'Lỗi xử lý dữ liệu khách hàng',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}