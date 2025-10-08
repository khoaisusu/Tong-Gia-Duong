import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  getAllRows,
  updateRow,
  getRowById,
  SHEETS
} from '../../utils/googleSheets';
import {
  mappingNhanVien,
  NhanVien
} from '../../utils/columnMapping';

export interface SalaryAdjustment {
  maNhanVien: string;
  hoVaTen: string;
  luongCoBan: string;
  phuCap: string;
  hoaHong: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin can adjust salaries
  if (session.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Chỉ Admin mới có quyền điều chỉnh lương' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all employees with salary info
        const employees = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);

        const salaryData = employees
          .filter((emp: NhanVien) => emp.trangThai === 'Hoạt động')
          .map((emp: NhanVien) => ({
            maNhanVien: emp.maNhanVien,
            hoVaTen: emp.hoVaTen,
            chucVu: emp.chucVu,
            luongCoBan: emp.luongCoBan || '0',
            phuCap: emp.phuCap || '0',
            hoaHong: emp.hoaHong || '0',
            nganHang: emp.nganHang,
            soTK: emp.soTK
          }));

        return res.status(200).json(salaryData);

      case 'PUT':
        // Update employee salary
        const { maNhanVien, luongCoBan, phuCap, hoaHong } = req.body as SalaryAdjustment;

        if (!maNhanVien) {
          return res.status(400).json({ error: 'Mã nhân viên là bắt buộc' });
        }

        // Validate salary values
        const basicSalary = parseFloat(luongCoBan || '0');
        const allowance = parseFloat(phuCap || '0');
        const commission = parseFloat(hoaHong || '0');

        if (basicSalary < 0 || allowance < 0 || commission < 0 || commission > 100) {
          return res.status(400).json({
            error: 'Giá trị lương không hợp lệ (lương cơ bản >= 0, phụ cấp >= 0, hoa hồng 0-100%)'
          });
        }

        // Check if employee exists
        const employee = await getRowById(
          SHEETS.NHAN_VIEN,
          mappingNhanVien,
          'maNhanVien',
          maNhanVien
        );

        if (!employee) {
          return res.status(404).json({ error: 'Nhân viên không tồn tại' });
        }

        // Update salary data
        const salaryUpdates = {
          luongCoBan: basicSalary.toString(),
          phuCap: allowance.toString(),
          hoaHong: commission.toString()
        };

        const updated = await updateRow(
          SHEETS.NHAN_VIEN,
          mappingNhanVien,
          'maNhanVien',
          maNhanVien,
          salaryUpdates
        );

        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật thông tin lương' });
        }

        console.log('💰 Salary updated for employee:', {
          maNhanVien,
          name: employee.hoVaTen,
          basicSalary,
          allowance,
          commission
        });

        return res.status(200).json({
          message: `Cập nhật lương cho ${employee.hoVaTen} thành công`,
          data: {
            maNhanVien,
            hoVaTen: employee.hoVaTen,
            ...salaryUpdates
          }
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('❌ Employee salary API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}