import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  getAllRows,
  appendRow,
  updateRow,
  SHEETS
} from '../../utils/googleSheets';
import { mappingNhanVien, NhanVien } from '../../utils/columnMapping';

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
        try {
          // Get all staff data to extract bank info
          const staffData = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
          console.log('📊 Staff data from sheet:', staffData);

          // Find staff with bank information (assuming admin/owner has bank info)
          const staffWithBank = staffData.find((staff: NhanVien) =>
            staff.nganHang && staff.soTK && staff.quyenHan === 'Admin'
          ) || staffData.find((staff: NhanVien) =>
            staff.nganHang && staff.soTK
          );

          if (staffWithBank) {
            const bankSettings = [{
              tenNganHang: staffWithBank.nganHang,
              maBin: '970416', // Default for Techcombank - you can enhance this mapping
              soTaiKhoan: staffWithBank.soTK,
              tenTaiKhoan: staffWithBank.hoVaTen?.toUpperCase() || 'PHONG KHAM TONG GIA DUONG',
              chiNhanh: 'Chi nhánh HCM', // Default branch
              trangThai: 'Hoạt động'
            }];

            console.log('📊 Extracted bank settings:', bankSettings);
            return res.status(200).json(bankSettings);
          } else {
            // Return default settings if no bank info found
            const defaultSettings = [{
              tenNganHang: 'Techcombank',
              maBin: '970416',
              soTaiKhoan: '19070220842011',
              tenTaiKhoan: 'PHONG KHAM TONG GIA DUONG',
              chiNhanh: 'Chi nhánh HCM',
              trangThai: 'Hoạt động'
            }];
            console.log('📋 No bank info found in staff sheet, returning default settings');
            return res.status(200).json(defaultSettings);
          }
        } catch (error) {
          console.log('📋 Error reading staff sheet, returning default settings');
          // Return default settings if sheet read fails
          const defaultSettings = [{
            tenNganHang: 'Techcombank',
            maBin: '970416',
            soTaiKhoan: '19070220842011',
            tenTaiKhoan: 'PHONG KHAM TONG GIA DUONG',
            chiNhanh: 'Chi nhánh HCM',
            trangThai: 'Hoạt động'
          }];
          return res.status(200).json(defaultSettings);
        }

      case 'POST':
        // This method is not needed as we'll update staff record directly
        return res.status(405).json({ error: 'Use PUT to update bank settings in staff record' });

      case 'PUT':
        // Update bank setting in staff record
        const { tenNganHang, soTaiKhoan, tenTaiKhoan } = req.body;

        if (!tenNganHang || !soTaiKhoan) {
          return res.status(400).json({ error: 'Tên ngân hàng và số tài khoản là bắt buộc' });
        }

        try {
          // Find staff to update (preferably admin)
          const staffData = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
          const adminStaff = staffData.find((staff: NhanVien) => staff.quyenHan === 'Admin');

          if (!adminStaff) {
            return res.status(404).json({ error: 'Không tìm thấy nhân viên Admin để cập nhật thông tin ngân hàng' });
          }

          // Update the admin staff record with bank info
          const updates = {
            nganHang: tenNganHang,
            soTK: soTaiKhoan
          };

          const updated = await updateRow(
            SHEETS.NHAN_VIEN,
            mappingNhanVien,
            'maNhanVien',
            adminStaff.maNhanVien,
            updates
          );

          if (!updated) {
            return res.status(500).json({ error: 'Không thể cập nhật thông tin ngân hàng' });
          }

          console.log('✅ Updated bank info for admin staff:', adminStaff.maNhanVien);

          return res.status(200).json({
            message: 'Cập nhật thông tin ngân hàng thành công'
          });
        } catch (error) {
          console.error('Error updating bank info:', error);
          return res.status(500).json({ error: 'Lỗi khi cập nhật thông tin ngân hàng' });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Bank API Error:', error);
    return res.status(500).json({
      error: 'Lỗi xử lý dữ liệu',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}