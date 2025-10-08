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
import {
  calculateCommissionAndSalary,
  parseServiceFromTreatment,
  formatCommissionCurrency,
  getServiceCommissionData,
  getEmployeeCommissionRate,
  SUPERVISOR_COMMISSION_RATE
} from '../../utils/commissionCalculator';

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

        console.log('📥 Received appointment data:', newSession);

        // Validate required fields for appointments
        if (!newSession.dichVuThucHien ||
            newSession.dichVuThucHien === '[]' ||
            newSession.dichVuThucHien.trim() === '' ||
            !newSession.maKhachHang ||
            !newSession.tenKhachHang) {
          console.error('❌ Validation failed:', {
            dichVuThucHien: newSession.dichVuThucHien,
            maKhachHang: newSession.maKhachHang,
            tenKhachHang: newSession.tenKhachHang
          });
          return res.status(400).json({
            error: 'Khách hàng và dịch vụ thực hiện là bắt buộc (dịch vụ không được để trống hoặc [])'
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

          // Check if treatment has reached maximum sessions
          const currentSessions = parseInt(treatment.soBuoiDaThucHien || '0');
          const totalSessions = parseInt(treatment.soBuoi || '0');

          if (currentSessions >= totalSessions) {
            return res.status(400).json({
              error: `Liệu trình đã đạt đủ ${totalSessions} buổi (${currentSessions}/${totalSessions}), không thể thêm buổi mới`
            });
          }
        }

        // Calculate commission and management salary
        let hoaHongNhanVien = '0';
        let luongQuanLy = '0';

        if (newSession.dichVuThucHien && newSession.nhanVienThucHien) {
          try {
            const services = parseServiceFromTreatment(newSession.dichVuThucHien);
            console.log('🧮 Calculating commission for services:', services);

            // Calculate for the first/main service
            if (services.length > 0) {
              // Get service price
              const servicesData = await getServiceCommissionData();
              const normalizedSearchName = services[0].toLowerCase().trim();
              let service = servicesData.find(s =>
                s.tenDichVu.toLowerCase().trim() === normalizedSearchName
              );
              if (!service) {
                service = servicesData.find(s => {
                  const normalizedServiceName = s.tenDichVu.toLowerCase().trim();
                  return normalizedServiceName.includes(normalizedSearchName) ||
                         normalizedSearchName.includes(normalizedServiceName);
                });
              }

              if (service) {
                const servicePrice = service.giaDichVu;

                // Calculate employee commission
                const employeeCommissionRate = await getEmployeeCommissionRate(newSession.nhanVienThucHien);
                const employeeCommission = (employeeCommissionRate / 100) * servicePrice;
                hoaHongNhanVien = employeeCommission.toString();

                // Calculate management salary
                // Logic:
                // - If supervisor exists and different from employee → 20% of service price
                // - If supervisor is same as employee or no supervisor → (50% - employee commission)
                const hasSupervisor = newSession.nguoiChinh && newSession.nguoiChinh.trim() !== '';
                const isSupervisorDifferent = hasSupervisor &&
                  newSession.nguoiChinh?.trim() !== newSession.nhanVienThucHien?.trim();

                let managementSalary = 0;
                if (isSupervisorDifferent) {
                  // Supervisor is different person → gets 20%
                  managementSalary = (SUPERVISOR_COMMISSION_RATE / 100) * servicePrice;
                } else {
                  // Manager does it themselves or no supervisor → gets remaining up to 50%
                  managementSalary = Math.max(0, (50 / 100) * servicePrice - employeeCommission);
                }
                luongQuanLy = managementSalary.toString();

                console.log('💰 Commission calculation result:', {
                  service: services[0],
                  employee: newSession.nhanVienThucHien,
                  supervisor: newSession.nguoiChinh || 'None',
                  isSupervisorDifferent,
                  servicePrice,
                  employeeCommissionRate: `${employeeCommissionRate}%`,
                  employeeCommission: formatCommissionCurrency(employeeCommission),
                  managementSalary: formatCommissionCurrency(managementSalary)
                });
              } else {
                console.warn(`⚠️ Service "${services[0]}" not found, skipping commission calculation`);
              }
            }
          } catch (error) {
            console.warn('⚠️ Commission calculation failed, using default values:', error);
            // Continue with 0 values on calculation error
          }
        }

        // Generate unique ID for session
        const generatedId = generateId('BT');
        console.log('🆔 Generated ID for session:', generatedId);

        // Add session data
        const sessionData = {
          ...newSession,
          maLuot: generatedId,
          maLieuTrinh: newSession.maLieuTrinh || '', // Allow empty for standalone appointments
          maKhachHang: newSession.maKhachHang,
          tenKhachHang: newSession.tenKhachHang,
          hoaHongNhanVien,
          luongQuanLy,
          ngayThucHien: newSession.ngayThucHien || new Date().toISOString().split('T')[0],
          trangThai: newSession.trangThai || 'Đã lên lịch',
          nhanVienThucHien: newSession.nhanVienThucHien || session.user?.name || '',
        };

        console.log('📦 Complete session data to save:', sessionData);

        // Validate required fields before saving
        const requiredFields: (keyof typeof sessionData)[] = ['maLuot', 'maKhachHang', 'tenKhachHang', 'dichVuThucHien'];
        for (const field of requiredFields) {
          if (!sessionData[field]) {
            console.error(`❌ Missing required field: ${field}`, sessionData);
            throw new Error(`Thiếu trường bắt buộc: ${field}`);
          }
        }

        // Create session
        console.log('💾 Saving session data to Google Sheets:', sessionData);

        try {
          await appendRow(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu, sessionData);
          console.log('✅ Successfully saved to Google Sheets');
        } catch (sheetError) {
          console.error('❌ Google Sheets save error:', sheetError);
          throw new Error('Lỗi lưu dữ liệu vào Google Sheets: ' + (sheetError instanceof Error ? sheetError.message : 'Unknown error'));
        }

        let treatmentProgress = null;

        // Only show treatment progress info, don't update it yet
        // Progress will be updated when session is marked as completed
        if (treatment && newSession.maLieuTrinh) {
          const currentSessions = parseInt(treatment.soBuoiDaThucHien || '0');
          const totalSessions = parseInt(treatment.soBuoi || '0');

          treatmentProgress = {
            completed: currentSessions,
            total: totalSessions,
            isComplete: currentSessions >= totalSessions
          };

          console.log('📋 Created appointment for treatment plan:', {
            treatmentId: newSession.maLieuTrinh,
            currentProgress: `${currentSessions}/${totalSessions}`,
            note: 'Progress will be updated when session is completed'
          });
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

        // Get current session data before updating
        const currentSession = await getRowById(
          SHEETS.LUOT_TRI_LIEU,
          mappingLuotTriLieu,
          'maLuot',
          maLuot
        );

        if (!currentSession) {
          return res.status(404).json({ error: 'Lượt trị liệu không tồn tại' });
        }

        // Recalculate commission if:
        // 1. Employee or service changed
        // 2. Status is being changed to "Hoàn thành" (to ensure commission is calculated on completion)
        // 3. Supervisor changed
        if (updates.nhanVienThucHien || updates.dichVuThucHien || updates.nguoiChinh ||
            (updates.trangThai === 'Hoàn thành' && currentSession.trangThai !== 'Hoàn thành')) {

          const employeeId = updates.nhanVienThucHien || currentSession.nhanVienThucHien;
          const serviceData = updates.dichVuThucHien || currentSession.dichVuThucHien;
          const supervisorId = updates.nguoiChinh !== undefined ? updates.nguoiChinh : currentSession.nguoiChinh;

          if (employeeId && serviceData) {
            try {
              const services = parseServiceFromTreatment(serviceData);
              if (services.length > 0) {
                // Get service price
                const servicesData = await getServiceCommissionData();
                const normalizedSearchName = services[0].toLowerCase().trim();
                let service = servicesData.find(s =>
                  s.tenDichVu.toLowerCase().trim() === normalizedSearchName
                );
                if (!service) {
                  service = servicesData.find(s => {
                    const normalizedServiceName = s.tenDichVu.toLowerCase().trim();
                    return normalizedServiceName.includes(normalizedSearchName) ||
                           normalizedSearchName.includes(normalizedServiceName);
                  });
                }

                if (service) {
                  const servicePrice = service.giaDichVu;

                  // Calculate employee commission
                  const employeeCommissionRate = await getEmployeeCommissionRate(employeeId);
                  const employeeCommission = (employeeCommissionRate / 100) * servicePrice;
                  updates.hoaHongNhanVien = employeeCommission.toString();

                  // Calculate management salary
                  // Logic:
                  // - If supervisor exists and different from employee → 20% of service price
                  // - If supervisor is same as employee or no supervisor → (50% - employee commission)
                  const hasSupervisor = supervisorId && supervisorId.trim() !== '';
                  const isSupervisorDifferent = hasSupervisor &&
                    supervisorId?.trim() !== employeeId?.trim();

                  let managementSalary = 0;
                  if (isSupervisorDifferent) {
                    // Supervisor is different person → gets 20%
                    managementSalary = (SUPERVISOR_COMMISSION_RATE / 100) * servicePrice;
                  } else {
                    // Manager does it themselves or no supervisor → gets remaining up to 50%
                    managementSalary = Math.max(0, (50 / 100) * servicePrice - employeeCommission);
                  }
                  updates.luongQuanLy = managementSalary.toString();

                  console.log('🔄 Recalculated commission on update:', {
                    reason: updates.trangThai === 'Hoàn thành' ? 'Completing appointment' : 'Employee/Service/Supervisor changed',
                    employee: employeeId,
                    supervisor: supervisorId || 'None',
                    isSupervisorDifferent,
                    service: services[0],
                    servicePrice,
                    employeeCommissionRate: `${employeeCommissionRate}%`,
                    employeeCommission: formatCommissionCurrency(employeeCommission),
                    managementSalary: formatCommissionCurrency(managementSalary)
                  });
                } else {
                  console.warn(`⚠️ Service "${services[0]}" not found, skipping commission recalculation`);
                }
              }
            } catch (error) {
              console.warn('⚠️ Commission recalculation failed:', error);
            }
          }
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

        // If status changed from non-completed to completed, update treatment plan progress
        if (updates.trangThai === 'Hoàn thành' &&
            currentSession.trangThai !== 'Hoàn thành' &&
            currentSession.maLieuTrinh) {

          console.log('🎯 Session completed, recalculating treatment progress for:', currentSession.maLieuTrinh);

          // Get treatment plan data
          const treatmentPlan = await getRowById(
            SHEETS.LIEU_TRINH,
            mappingLieuTrinh,
            'maLieuTrinh',
            currentSession.maLieuTrinh
          );

          if (treatmentPlan) {
            // Get all sessions for this treatment to calculate actual completed count
            const allSessionsForTreatment = await getAllRows(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu);
            const completedSessionsForTreatment = allSessionsForTreatment.filter((session: LuotTriLieu) =>
              session.maLieuTrinh === currentSession.maLieuTrinh &&
              session.trangThai === 'Hoàn thành'
            );

            const actualCompletedCount = completedSessionsForTreatment.length;
            const totalSessions = parseInt(treatmentPlan.soBuoi || '0');

            console.log('📊 Treatment progress update:', {
              calculatedFromActualSessions: actualCompletedCount,
              total: totalSessions,
              completedSessions: completedSessionsForTreatment.map((s: LuotTriLieu) => s.maLuot)
            });

            const treatmentUpdates: Partial<LieuTrinh> = {
              soBuoiDaThucHien: actualCompletedCount.toString(),
            };

            // Mark treatment as completed if all sessions are done
            if (actualCompletedCount >= totalSessions) {
              treatmentUpdates.trangThai = 'Hoàn thành';
              treatmentUpdates.ngayKetThuc = new Date().toISOString().split('T')[0];
              console.log('🏁 Treatment plan completed!');
            }

            await updateRow(
              SHEETS.LIEU_TRINH,
              mappingLieuTrinh,
              'maLieuTrinh',
              currentSession.maLieuTrinh,
              treatmentUpdates
            );

            console.log('✅ Treatment plan updated with actual session count');
          }
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