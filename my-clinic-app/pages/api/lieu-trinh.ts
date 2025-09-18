import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { 
  getAllRows, 
  appendRow,
  updateRow,
  SHEETS,
  generateId
} from '../../utils/googleSheets';
import { mappingLieuTrinh, mappingGiaoDich, LieuTrinh, GiaoDich } from '../../utils/columnMapping';

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
        // Get all treatments
        const treatments = await getAllRows(SHEETS.LIEU_TRINH, mappingLieuTrinh);

        // Add default payment status for treatments that don't have it
        const treatmentsWithStatus = treatments.map((treatment: LieuTrinh) => ({
          ...treatment,
          trangThaiThanhToan: treatment.trangThaiThanhToan ||
            (treatment.ghiChu?.includes('Đã Thanh Toán') ? 'Đã thanh toán' : 'Chưa thanh toán')
        }));

        return res.status(200).json(treatmentsWithStatus);

      case 'POST':
        // Create new treatment
        const newTreatment = req.body as Partial<LieuTrinh>;

        // Validate required fields
        if (!newTreatment.maKhachHang || !newTreatment.soBuoi) {
          return res.status(400).json({
            error: 'Thông tin khách hàng và số buổi là bắt buộc'
          });
        }

        // Generate auto-incrementing treatment name
        const existingTreatments = await getAllRows(SHEETS.LIEU_TRINH, mappingLieuTrinh);
        console.log('🔍 All existing treatments:', existingTreatments);

        const allNames = existingTreatments.map((t: LieuTrinh) => t.tenLieuTrinh);
        console.log('📝 All treatment names:', allNames);

        const validNames = allNames.filter((name: string) => {
          if (!name || name.trim() === '') return false;
          // Accept both formats: 4-digit (0001) or regular numbers (1, 2, 3, etc.)
          return /^\d+$/.test(name.trim());
        });
        console.log('✅ Valid numeric names:', validNames);

        let nextNumber = 1;
        if (validNames.length > 0) {
          const treatmentNumbers = validNames.map((name: string) => parseInt(name.trim()));
          const sortedNumbers = treatmentNumbers.sort((a: number, b: number) => b - a);
          nextNumber = sortedNumbers[0] + 1;
        }

        const autoTreatmentName = nextNumber.toString().padStart(4, '0');
        console.log('🎯 Generated treatment name:', autoTreatmentName);

        // Generate treatment ID and set defaults
        const treatmentData = {
          ...newTreatment,
          maLieuTrinh: generateId('LT'),
          // Keep the provided treatment name, don't override with auto-generated number
          tenLieuTrinh: newTreatment.tenLieuTrinh || autoTreatmentName,
          ngayBatDau: newTreatment.ngayBatDau || new Date().toISOString().split('T')[0],
          soBuoiDaThucHien: newTreatment.soBuoiDaThucHien || '0',
          daThanhToan: newTreatment.daThanhToan || '0',
          conLai: newTreatment.conLai || (newTreatment.tongTien || '0'),
          trangThai: newTreatment.trangThai || 'Đang thực hiện',
          nhanVienTuVan: newTreatment.nhanVienTuVan || session.user?.name || session.user?.email || '',
        };

        // Create treatment
        await appendRow(SHEETS.LIEU_TRINH, mappingLieuTrinh, treatmentData);
        
        // Create initial payment transaction if payment received
        if (parseFloat(treatmentData.daThanhToan) > 0) {
          const transaction: Partial<GiaoDich> = {
            maGiaoDich: generateId('GD'),
            loaiGiaoDich: 'Thu',
            maThamChieu: treatmentData.maLieuTrinh,
            maKhachHang: treatmentData.maKhachHang,
            tenKhachHang: treatmentData.tenKhachHang,
            soTien: treatmentData.daThanhToan,
            phuongThuc: 'Tiền mặt',
            ngayGiaoDich: treatmentData.ngayBatDau,
            noiDung: `Thanh toán liệu trình ${treatmentData.tenLieuTrinh}`,
            trangThai: 'Hoàn thành',
            nhanVienXuLy: treatmentData.nhanVienTuVan,
          };
          
          await appendRow(SHEETS.GIAO_DICH, mappingGiaoDich, transaction);
        }
        
        return res.status(201).json({ 
          message: 'Tạo liệu trình thành công',
          data: treatmentData 
        });

      case 'PUT':
        // Update treatment
        const { maLieuTrinh, ...updates } = req.body;
        
        if (!maLieuTrinh) {
          return res.status(400).json({ error: 'Mã liệu trình là bắt buộc' });
        }

        // Get current treatment data
        const treatments_list = await getAllRows(SHEETS.LIEU_TRINH, mappingLieuTrinh);
        const currentTreatment = treatments_list.find((t: LieuTrinh) => t.maLieuTrinh === maLieuTrinh);
        
        if (!currentTreatment) {
          return res.status(404).json({ error: 'Liệu trình không tồn tại' });
        }

        // Calculate remaining amount if payment updated
        if (updates.daThanhToan !== undefined) {
          const totalAmount = parseFloat(currentTreatment.tongTien || '0');
          const paidAmount = parseFloat(updates.daThanhToan || '0');
          updates.conLai = (totalAmount - paidAmount).toString();
        }

        // Update treatment status if all sessions completed
        if (updates.soBuoiDaThucHien !== undefined) {
          const totalSessions = parseInt(currentTreatment.soBuoi || '0');
          const completedSessions = parseInt(updates.soBuoiDaThucHien || '0');
          
          if (completedSessions >= totalSessions) {
            updates.trangThai = 'Hoàn thành';
            updates.ngayKetThuc = new Date().toISOString().split('T')[0];
          }
        }

        // Update treatment
        const updated = await updateRow(
          SHEETS.LIEU_TRINH,
          mappingLieuTrinh,
          'maLieuTrinh',
          maLieuTrinh,
          updates
        );
        
        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật liệu trình' });
        }
        
        // Create transaction if new payment received
        if (updates.daThanhToan && 
            parseFloat(updates.daThanhToan) > parseFloat(currentTreatment.daThanhToan || '0')) {
          const paymentAmount = parseFloat(updates.daThanhToan) - parseFloat(currentTreatment.daThanhToan || '0');
          
          const transaction: Partial<GiaoDich> = {
            maGiaoDich: generateId('GD'),
            loaiGiaoDich: 'Thu',
            maThamChieu: maLieuTrinh,
            maKhachHang: currentTreatment.maKhachHang,
            tenKhachHang: currentTreatment.tenKhachHang,
            soTien: paymentAmount.toString(),
            phuongThuc: 'Tiền mặt',
            ngayGiaoDich: new Date().toISOString().split('T')[0],
            noiDung: `Thanh toán thêm liệu trình ${currentTreatment.tenLieuTrinh}`,
            trangThai: 'Hoàn thành',
            nhanVienXuLy: session.user?.name || session.user?.email || '',
          };
          
          await appendRow(SHEETS.GIAO_DICH, mappingGiaoDich, transaction);
        }
        
        return res.status(200).json({ 
          message: 'Cập nhật liệu trình thành công' 
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