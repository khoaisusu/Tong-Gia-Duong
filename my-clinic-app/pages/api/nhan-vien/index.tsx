import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { 
  getAllRows, 
  appendRow,
  updateRow,
  deleteRow,
  SHEETS,
  generateId
} from '../../../utils/googleSheets';
import { mappingNhanVien, NhanVien } from '../../../utils/columnMapping';

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
        // Get all staff
        const staff = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
        
        // If not admin, filter sensitive information
        if (session.user?.role !== 'Admin') {
          const filteredStaff = staff.map((s: NhanVien) => ({
            maNhanVien: s.maNhanVien,
            hoVaTen: s.hoVaTen,
            chucVu: s.chucVu,
            chuyenMon: s.chuyenMon,
            trangThai: s.trangThai,
          }));
          return res.status(200).json(filteredStaff);
        }
        
        return res.status(200).json(staff);

      case 'POST':
        // Only admin can create staff
        if (session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền thêm nhân viên' 
          });
        }

        const newStaff = req.body as Partial<NhanVien>;
        
        // Validate required fields
        if (!newStaff.hoVaTen || !newStaff.email || !newStaff.soDienThoai) {
          return res.status(400).json({ 
            error: 'Họ tên, email và số điện thoại là bắt buộc' 
          });
        }

        // Check if email already exists
        const existingStaff = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
        const emailExists = existingStaff.some(
          (s: NhanVien) => s.email === newStaff.email
        );
        
        if (emailExists) {
          return res.status(400).json({ 
            error: 'Email đã được sử dụng cho nhân viên khác' 
          });
        }

        // Add metadata
        const staffData = {
          ...newStaff,
          maNhanVien: newStaff.maNhanVien || generateId('NV'),
          ngayVaoLam: newStaff.ngayVaoLam || new Date().toISOString().split('T')[0],
          quyenHan: newStaff.quyenHan || 'Nhân viên',
          trangThai: newStaff.trangThai || 'Hoạt động',
          hoaHong: newStaff.hoaHong || '10',
        };

        await appendRow(SHEETS.NHAN_VIEN, mappingNhanVien, staffData);
        
        return res.status(201).json({ 
          message: 'Thêm nhân viên thành công',
          data: staffData 
        });

      case 'PUT':
        // Only admin can update staff
        if (session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền cập nhật thông tin nhân viên' 
          });
        }

        const { maNhanVien, ...updates } = req.body;
        
        if (!maNhanVien) {
          return res.status(400).json({ error: 'Mã nhân viên là bắt buộc' });
        }

        // Check if email is being changed and if it's unique
        if (updates.email) {
          const allStaff = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
          const emailTaken = allStaff.some(
            (s: NhanVien) => s.email === updates.email && s.maNhanVien !== maNhanVien
          );
          
          if (emailTaken) {
            return res.status(400).json({ 
              error: 'Email đã được sử dụng cho nhân viên khác' 
            });
          }
        }

        const updated = await updateRow(
          SHEETS.NHAN_VIEN,
          mappingNhanVien,
          'maNhanVien',
          maNhanVien,
          updates
        );
        
        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật thông tin nhân viên' });
        }
        
        return res.status(200).json({ 
          message: 'Cập nhật thông tin nhân viên thành công' 
        });

      case 'DELETE':
        // Only admin can delete staff
        if (session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền xóa nhân viên' 
          });
        }

        const { id } = req.query;
        
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Mã nhân viên không hợp lệ' });
        }

        // Check if staff exists
        const staffToDelete = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);
        const staffMember = staffToDelete.find((s: NhanVien) => s.maNhanVien === id);
        
        if (!staffMember) {
          return res.status(404).json({ error: 'Nhân viên không tồn tại' });
        }

        // Prevent deleting own account
        if (staffMember.email === session.user?.email) {
          return res.status(403).json({ 
            error: 'Không thể xóa tài khoản của chính mình' 
          });
        }

        const deleted = await deleteRow(
          SHEETS.NHAN_VIEN,
          mappingNhanVien,
          'maNhanVien',
          id
        );
        
        if (!deleted) {
          return res.status(500).json({ error: 'Không thể xóa nhân viên' });
        }
        
        return res.status(200).json({ 
          message: 'Xóa nhân viên thành công' 
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