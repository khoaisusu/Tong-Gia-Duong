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
        // Return list of Vietnamese banks for dropdown selection
        const vietnameseBanks = [
          { maNganHang: 'VCB', tenNganHang: 'Vietcombank', maBin: '970436' },
          { maNganHang: 'TCB', tenNganHang: 'Techcombank', maBin: '970416' },
          { maNganHang: 'BIDV', tenNganHang: 'BIDV', maBin: '970418' },
          { maNganHang: 'VTB', tenNganHang: 'Vietinbank', maBin: '970415' },
          { maNganHang: 'ACB', tenNganHang: 'ACB', maBin: '970416' },
          { maNganHang: 'MB', tenNganHang: 'MB Bank', maBin: '970422' },
          { maNganHang: 'TPB', tenNganHang: 'TPBank', maBin: '970423' },
          { maNganHang: 'VPB', tenNganHang: 'VPBank', maBin: '970432' },
          { maNganHang: 'SHB', tenNganHang: 'SHB', maBin: '970443' },
          { maNganHang: 'SCB', tenNganHang: 'Sacombank', maBin: '970429' },
          { maNganHang: 'EXB', tenNganHang: 'Eximbank', maBin: '970431' },
          { maNganHang: 'MSB', tenNganHang: 'MSB', maBin: '970426' },
          { maNganHang: 'HDBank', tenNganHang: 'HDBank', maBin: '970437' },
          { maNganHang: 'OCB', tenNganHang: 'OCB', maBin: '970448' },
          { maNganHang: 'VIB', tenNganHang: 'VIB', maBin: '970441' },
          { maNganHang: 'ABBank', tenNganHang: 'ABBank', maBin: '970425' },
          { maNganHang: 'Agribank', tenNganHang: 'Agribank', maBin: '970405' },
          { maNganHang: 'SeABank', tenNganHang: 'SeABank', maBin: '970440' },
          { maNganHang: 'NCB', tenNganHang: 'NCB', maBin: '970419' },
          { maNganHang: 'LienVietPostBank', tenNganHang: 'LienVietPostBank', maBin: '970449' },
          { maNganHang: 'PVcomBank', tenNganHang: 'PVcomBank', maBin: '970412' },
          { maNganHang: 'BaoVietBank', tenNganHang: 'BaoVietBank', maBin: '970438' },
          { maNganHang: 'VietBank', tenNganHang: 'VietBank', maBin: '970433' },
          { maNganHang: 'BacABank', tenNganHang: 'Bac A Bank', maBin: '970409' },
          { maNganHang: 'VietCapitalBank', tenNganHang: 'VietCapital Bank', maBin: '970454' },
        ];

        console.log('📊 Returning list of Vietnamese banks:', vietnameseBanks.length);
        return res.status(200).json(vietnameseBanks);

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