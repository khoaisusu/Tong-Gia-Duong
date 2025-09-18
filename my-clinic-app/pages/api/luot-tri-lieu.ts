import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { 
  getAllRows, 
  appendRow,
  updateRow,
  getRowById,
  SHEETS,
  generateId
} from '../../utils/googleSheets';
import { 
  mappingLuotTriLieu, 
  mappingLieuTrinh,
  LuotTriLieu,
  LieuTrinh 
} from '../../utils/columnMapping';

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
        // Get all sessions or filter by treatment
        const { treatmentId, date } = req.query;
        const sessions = await getAllRows(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu);
        
        let filteredSessions = sessions;
        
        if (treatmentId) {
          filteredSessions = filteredSessions.filter((s: LuotTriLieu) => 
            s.maLieuTrinh === treatmentId
          );
        }
        
        if (date) {
          filteredSessions = filteredSessions.filter((s: LuotTriLieu) => 
            s.ngayThucHien === date
          );
        }
        
        // Sort by date and time
        filteredSessions.sort((a: LuotTriLieu, b: LuotTriLieu) => {
          const dateCompare = new Date(b.ngayThucHien).getTime() - new Date(a.ngayThucHien).getTime();
          if (dateCompare !== 0) return dateCompare;
          return (b.gioBatDau || '').localeCompare(a.gioBatDau || '');
        });
        
        return res.status(200).json(filteredSessions);

      case 'POST':
        // Create new treatment session
        const newSession = req.body as Partial<LuotTriLieu>;
        
        // Validate required fields for appointments
        if (!newSession.dichVuThucHien || !newSession.maKhachHang || !newSession.tenKhachHang) {
          return res.status(400).json({
            error: 'Khách hàng và dịch vụ thực hiện là bắt buộc'
          });
        }

        let treatment = null;

        // If treatment plan ID is provided, validate it
        if (newSession.maLieuTrinh) {
          treatment = await getRowById(
            SHEETS.LIEU_TRINH,
            mappingLieuTrinh,
            'maLieuTrinh',
            newSession.maLieuTrinh
          );

          if (!treatment) {
            return res.status(404).json({ error: 'Liệu trình không tồn tại' });
          }

          // Check if treatment is still active
          if (treatment.trangThai === 'Hoàn thành' || treatment.trangThai === 'Hủy') {
            return res.status(400).json({
              error: 'Liệu trình đã kết thúc, không thể thêm buổi mới'
            });
          }
        }

        // Add session data
        const sessionData = {
          ...newSession,
          maLuot: generateId('BT'),
          maLieuTrinh: newSession.maLieuTrinh || '', // Allow empty for standalone appointments
          maKhachHang: newSession.maKhachHang,
          tenKhachHang: newSession.tenKhachHang,
          ngayThucHien: newSession.ngayThucHien || new Date().toISOString().split('T')[0],
          trangThai: newSession.trangThai || 'Đã lên lịch',
          nhanVienThucHien: newSession.nhanVienThucHien || session.user?.name || '',
        };

        // Create session
        await appendRow(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu, sessionData);

        let treatmentProgress = null;

        // Update treatment progress only if this is part of a treatment plan
        if (treatment && newSession.maLieuTrinh) {
          const currentSessions = parseInt(treatment.soBuoiDaThucHien || '0');
          const totalSessions = parseInt(treatment.soBuoi || '0');
          const newSessionCount = currentSessions + 1;

          const treatmentUpdates: Partial<LieuTrinh> = {
            soBuoiDaThucHien: newSessionCount.toString(),
          };

          // Mark as completed if all sessions done
          if (newSessionCount >= totalSessions) {
            treatmentUpdates.trangThai = 'Hoàn thành';
            treatmentUpdates.ngayKetThuc = sessionData.ngayThucHien;
          }

          await updateRow(
            SHEETS.LIEU_TRINH,
            mappingLieuTrinh,
            'maLieuTrinh',
            newSession.maLieuTrinh,
            treatmentUpdates
          );

          treatmentProgress = {
            completed: newSessionCount,
            total: totalSessions,
            isComplete: newSessionCount >= totalSessions
          };
        }

        return res.status(201).json({
          message: treatment ? 'Ghi nhận buổi trị liệu thành công' : 'Tạo lịch hẹn thành công',
          data: sessionData,
          treatmentProgress
        });

      case 'PUT':
        // Update session
        const { maLuot, ...updates } = req.body;
        
        if (!maLuot) {
          return res.status(400).json({ error: 'Mã lượt trị liệu là bắt buộc' });
        }

        const updated = await updateRow(
          SHEETS.LUOT_TRI_LIEU,
          mappingLuotTriLieu,
          'maLuot',
          maLuot,
          updates
        );
        
        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật lượt trị liệu' });
        }
        
        return res.status(200).json({ 
          message: 'Cập nhật lượt trị liệu thành công' 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
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