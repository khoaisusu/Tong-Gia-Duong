import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  getAllRows,
  appendRow,
  updateRow,
  SHEETS,
  generateId,
  generateSequentialId
} from '../../utils/googleSheets';
import { mappingLieuTrinh, mappingGiaoDich, mappingLuotTriLieu, LieuTrinh, GiaoDich, LuotTriLieu } from '../../utils/columnMapping';
import { getCompletedTransactionMap, updatePaymentStatusBasedOnTransactions } from '../../utils/paymentStatusSync';
import { validateRequest, TreatmentPlanSchema } from '../../utils/inputValidation';
import { withTransaction } from '../../utils/transactionManager';

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

        // Get all treatment sessions to calculate actual completed sessions
        const allSessions = await getAllRows(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu);

        // Calculate actual completed sessions for each treatment
        const treatmentsWithActualSessions = treatments.map((treatment: LieuTrinh) => {
          const completedSessions = allSessions.filter((session: LuotTriLieu) =>
            session.maLieuTrinh === treatment.maLieuTrinh &&
            session.trangThai === 'Hoàn thành'
          );

          const actualCompletedCount = completedSessions.length.toString();

          // Update the soBuoiDaThucHien with the actual count
          return {
            ...treatment,
            soBuoiDaThucHien: actualCompletedCount
          };
        });

        // Get completed transactions map
        const completedTransactions = await getCompletedTransactionMap();

        // Update payment status based on transactions and fallback logic
        const treatmentsWithStatus = updatePaymentStatusBasedOnTransactions(
          treatmentsWithActualSessions,
          completedTransactions,
          'maLieuTrinh',
          'trangThaiThanhToan',
          (treatment: LieuTrinh) => treatment.ghiChu?.includes('Đã Thanh Toán') ? 'Đã thanh toán' : 'Chưa thanh toán'
        );

        return res.status(200).json(treatmentsWithStatus);

      case 'POST':
        // Create new treatment with validation and transaction safety
        const newTreatment = req.body as Partial<LieuTrinh>;

        // ✅ Step 1: Validate and sanitize input
        const treatmentValidation = validateRequest(newTreatment, TreatmentPlanSchema);
        if (!treatmentValidation.valid) {
          console.warn('❌ Treatment validation failed:', treatmentValidation.errors);
          return res.status(400).json({
            error: 'Dữ liệu liệu trình không hợp lệ',
            details: treatmentValidation.errors
          });
        }

        const sanitizedTreatment = treatmentValidation.data!;

        // ✅ Step 2: Generate auto-incrementing treatment name
        const existingTreatments = await getAllRows(SHEETS.LIEU_TRINH, mappingLieuTrinh);
        console.log('🔍 All existing treatments:', existingTreatments.length);

        const allNames = existingTreatments.map((t: LieuTrinh) => t.tenLieuTrinh);
        const validNames = allNames.filter((name: string) => {
          if (!name || name.trim() === '') return false;
          return /^\d+$/.test(name.trim());
        });

        let nextNumber = 1;
        if (validNames.length > 0) {
          const treatmentNumbers = validNames.map((name: string) => parseInt(name.trim()));
          const sortedNumbers = treatmentNumbers.sort((a: number, b: number) => b - a);
          nextNumber = sortedNumbers[0] + 1;
        }

        const autoTreatmentName = nextNumber.toString().padStart(4, '0');
        console.log('🎯 Generated treatment name:', autoTreatmentName);

        // ✅ Step 3: Generate treatment ID and set defaults
        const treatmentData = {
          ...sanitizedTreatment,
          maLieuTrinh: await generateSequentialId('LT', SHEETS.LIEU_TRINH, mappingLieuTrinh, 'maLieuTrinh'),
          tenLieuTrinh: sanitizedTreatment.tenLieuTrinh || autoTreatmentName,
          ngayBatDau: sanitizedTreatment.ngayBatDau || new Date().toISOString().split('T')[0],
          soBuoiDaThucHien: sanitizedTreatment.soBuoiDaThucHien || '0',
          daThanhToan: sanitizedTreatment.daThanhToan || '0',
          conLai: sanitizedTreatment.conLai || (sanitizedTreatment.tongTien || '0'),
          trangThai: sanitizedTreatment.trangThai || 'Đang thực hiện',
          nhanVienTuVan: sanitizedTreatment.nhanVienTuVan || session.user?.name || session.user?.email || '',
        };

        // ✅ Step 4: Use transaction for atomic treatment + payment creation
        try {
          await withTransaction(async (tx) => {
            // Create treatment plan
            await tx.create(SHEETS.LIEU_TRINH, mappingLieuTrinh, treatmentData);

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

              await tx.create(SHEETS.GIAO_DICH, mappingGiaoDich, transaction);
              console.log('✅ Treatment and payment created in atomic transaction');
            }
          });

          return res.status(201).json({
            message: 'Tạo liệu trình thành công',
            data: treatmentData
          });
        } catch (error) {
          console.error('❌ Treatment creation failed, transaction rolled back:', error);
          return res.status(500).json({
            error: 'Không thể tạo liệu trình',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      case 'PUT':
        // Update treatment with transaction safety
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

        // Check if new payment needs to be recorded
        const hasNewPayment = updates.daThanhToan &&
          parseFloat(updates.daThanhToan) > parseFloat(currentTreatment.daThanhToan || '0');

        // ✅ Use transaction for atomic update + payment
        try {
          await withTransaction(async (tx) => {
            // Update treatment
            await tx.update(
              SHEETS.LIEU_TRINH,
              mappingLieuTrinh,
              'maLieuTrinh',
              maLieuTrinh,
              currentTreatment,
              updates
            );

            // Create transaction if new payment received
            if (hasNewPayment) {
              const paymentAmount = parseFloat(updates.daThanhToan!) - parseFloat(currentTreatment.daThanhToan || '0');

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

              await tx.create(SHEETS.GIAO_DICH, mappingGiaoDich, transaction);
              console.log('✅ Treatment update and payment created in atomic transaction');
            }
          });

          return res.status(200).json({
            message: 'Cập nhật liệu trình thành công'
          });
        } catch (error) {
          console.error('❌ Treatment update failed, transaction rolled back:', error);
          return res.status(500).json({
            error: 'Không thể cập nhật liệu trình',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

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