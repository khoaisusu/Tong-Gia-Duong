import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  getAllRows,
  appendRow,
  updateRow,
  deleteRow,
  SHEETS,
  generateId
} from '../../utils/googleSheets';
import { mappingHoaHong, HoaHong } from '../../utils/columnMapping';

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
        // Get all commission records or by employee
        const { maNhanVien, maDichVu } = req.query;

        const allCommissions = await getAllRows(SHEETS.HOA_HONG, mappingHoaHong);

        // Filter by employee if provided
        let filteredCommissions = allCommissions;
        if (maNhanVien) {
          filteredCommissions = filteredCommissions.filter(
            (c: HoaHong) => c.maNhanVien === maNhanVien
          );
        }

        // Filter by service if provided
        if (maDichVu) {
          filteredCommissions = filteredCommissions.filter(
            (c: HoaHong) => c.maDichVu === maDichVu
          );
        }

        return res.status(200).json(filteredCommissions);

      case 'POST':
        // Create new commission record
        const newCommission = req.body as Partial<HoaHong>;

        // Validate required fields
        if (!newCommission.maNhanVien || !newCommission.maDichVu) {
          return res.status(400).json({
            error: 'Mã nhân viên và mã dịch vụ là bắt buộc'
          });
        }

        // Check if commission already exists for this employee-service pair
        const existingCommissions = await getAllRows(SHEETS.HOA_HONG, mappingHoaHong);
        const duplicate = existingCommissions.find(
          (c: HoaHong) =>
            c.maNhanVien === newCommission.maNhanVien &&
            c.maDichVu === newCommission.maDichVu
        );

        if (duplicate) {
          return res.status(400).json({
            error: 'Nhân viên này đã có cấu hình hoa hồng cho dịch vụ này'
          });
        }

        // Generate commission ID
        const commissionData = {
          ...newCommission,
          maHoaHong: generateId('HH'),
          ngayApDung: newCommission.ngayApDung || new Date().toISOString().split('T')[0],
        };

        // Create commission record
        await appendRow(SHEETS.HOA_HONG, mappingHoaHong, commissionData);

        return res.status(201).json({
          message: 'Tạo cấu hình hoa hồng thành công',
          data: commissionData
        });

      case 'PUT':
        // Update commission record
        const { maHoaHong, ...updates } = req.body;

        if (!maHoaHong) {
          return res.status(400).json({ error: 'Mã hoa hồng là bắt buộc' });
        }

        // Update commission
        const updated = await updateRow(
          SHEETS.HOA_HONG,
          mappingHoaHong,
          'maHoaHong',
          maHoaHong,
          updates
        );

        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật hoa hồng' });
        }

        return res.status(200).json({
          message: 'Cập nhật hoa hồng thành công'
        });

      case 'DELETE':
        // Delete commission record
        const { maHoaHong: idToDelete } = req.body;

        if (!idToDelete) {
          return res.status(400).json({ error: 'Mã hoa hồng là bắt buộc' });
        }

        // Delete commission
        const deleted = await deleteRow(
          SHEETS.HOA_HONG,
          mappingHoaHong,
          'maHoaHong',
          idToDelete
        );

        if (!deleted) {
          return res.status(404).json({ error: 'Không tìm thấy hoa hồng' });
        }

        return res.status(200).json({
          message: 'Xóa hoa hồng thành công'
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Lỗi xử lý dữ liệu',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
