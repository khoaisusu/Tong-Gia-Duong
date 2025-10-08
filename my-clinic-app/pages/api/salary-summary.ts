// Salary Summary API - Tính toán lương nhân viên
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getAllRows, SHEETS } from '../../utils/googleSheets';
import {
  mappingLuotTriLieu,
  mappingNhanVien,
  LuotTriLieu,
  NhanVien
} from '../../utils/columnMapping';
import { getPositionSalaryConfig } from '../../utils/positionSalaryConfig';

export interface EmployeeSalarySummary {
  maNhanVien: string;
  hoVaTen: string;
  chucVu: string;
  totalCommission: number;
  totalManagementSalary: number;
  totalBasicSalary: number;
  totalAllowance: number;
  totalSessions: number;
  sessionDetails: {
    date: string;
    customer: string;
    service: string;
    commission: number;
    managementSalary?: number;
  }[];
  periodSummary: {
    [month: string]: {
      commission: number;
      managementSalary: number;
      sessions: number;
      basicSalary: number;
      allowance: number;
    };
  };
}

export interface SalarySummaryResponse {
  employees: EmployeeSalarySummary[];
  totalCommission: number;
  totalManagementSalary: number;
  totalBasicSalary: number;
  totalAllowance: number;
  totalSessions: number;
  periodRange: {
    from: string;
    to: string;
  };
}

function getMonthKey(date: string): string {
  try {
    const dateObj = new Date(date);
    return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
  } catch {
    return 'unknown';
  }
}

function parseCommissionValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SalarySummaryResponse | { error: string }>
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { from, to, employeeId } = req.query;

    console.log('💰 Fetching salary summary with params:', { from, to, employeeId });

    // Get all treatment sessions and employees
    const [sessions, employees] = await Promise.all([
      getAllRows(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu),
      getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien)
    ]);

    console.log(`📊 Found ${sessions.length} sessions and ${employees.length} employees`);

    // Filter sessions by date range and status (only completed sessions)
    let filteredSessions = sessions.filter((session: LuotTriLieu) => {
      // Only count completed sessions
      if (session.trangThai !== 'Hoàn thành') {
        return false;
      }

      if (!session.ngayThucHien) return false;

      // Filter by date range if provided
      if (from || to) {
        const sessionDate = new Date(session.ngayThucHien);
        if (from && sessionDate < new Date(from as string)) return false;
        if (to && sessionDate > new Date(to as string)) return false;
      }

      return true;
    });

    // Filter by specific employee if provided
    if (employeeId) {
      filteredSessions = filteredSessions.filter((session: LuotTriLieu) =>
        session.nhanVienThucHien === employeeId ||
        session.nguoiChinh === employeeId
      );
    }

    console.log(`📈 Processing ${filteredSessions.length} filtered sessions`);

    // Create employee salary summaries
    const employeeSummaries: { [key: string]: EmployeeSalarySummary } = {};

    // Initialize summaries for all active employees
    employees
      .filter((emp: NhanVien) => emp.trangThai === 'Hoạt động')
      .forEach((employee: NhanVien) => {
        employeeSummaries[employee.maNhanVien] = {
          maNhanVien: employee.maNhanVien,
          hoVaTen: employee.hoVaTen,
          chucVu: employee.chucVu,
          totalCommission: 0,
          totalManagementSalary: 0,
          totalBasicSalary: 0,
          totalAllowance: 0,
          totalSessions: 0,
          sessionDetails: [],
          periodSummary: {}
        };
      });

    // Process each session
    filteredSessions.forEach((session: LuotTriLieu) => {
      const commission = parseCommissionValue(session.hoaHongNhanVien);
      const managementSalary = parseCommissionValue(session.luongQuanLy);
      const monthKey = getMonthKey(session.ngayThucHien);

      // Find employee by ID or name for commission
      // Session data format: "Name - Position" or just employee code
      const employee = employees.find((emp: NhanVien) => {
        if (emp.maNhanVien === session.nhanVienThucHien) return true;
        if (emp.hoVaTen === session.nhanVienThucHien) return true;
        // Check if session data contains "Name - Position" format
        if (session.nhanVienThucHien?.includes(' - ')) {
          const nameInSession = session.nhanVienThucHien.split(' - ')[0];
          return emp.hoVaTen === nameInSession;
        }
        return false;
      });

      if (employee && commission > 0) {
        const summary = employeeSummaries[employee.maNhanVien];
        if (summary) {
          summary.totalCommission += commission;
          summary.totalSessions += 1;

          summary.sessionDetails.push({
            date: session.ngayThucHien,
            customer: session.tenKhachHang,
            service: session.dichVuThucHien,
            commission: commission
          });

          // Update period summary
          if (!summary.periodSummary[monthKey]) {
            summary.periodSummary[monthKey] = {
              commission: 0,
              managementSalary: 0,
              sessions: 0,
              basicSalary: 0,
              allowance: 0
            };
          }
          summary.periodSummary[monthKey].commission += commission;
          summary.periodSummary[monthKey].sessions += 1;
        }
      }

      // Find supervisor for management salary
      if (session.nguoiChinh && managementSalary > 0) {
        const supervisor = employees.find((emp: NhanVien) => {
          if (emp.maNhanVien === session.nguoiChinh) return true;
          if (emp.hoVaTen === session.nguoiChinh) return true;
          // Check if session data contains "Name - Position" format
          if (session.nguoiChinh?.includes(' - ')) {
            const nameInSession = session.nguoiChinh.split(' - ')[0];
            return emp.hoVaTen === nameInSession;
          }
          return false;
        });

        if (supervisor) {
          const summary = employeeSummaries[supervisor.maNhanVien];
          if (summary) {
            summary.totalManagementSalary += managementSalary;

            // Add to session details or update existing
            const existingDetail = summary.sessionDetails.find(d =>
              d.date === session.ngayThucHien && d.customer === session.tenKhachHang
            );

            if (existingDetail) {
              existingDetail.managementSalary = managementSalary;
            } else {
              summary.sessionDetails.push({
                date: session.ngayThucHien,
                customer: session.tenKhachHang,
                service: session.dichVuThucHien,
                commission: 0,
                managementSalary: managementSalary
              });
            }

            // Update period summary
            if (!summary.periodSummary[monthKey]) {
              summary.periodSummary[monthKey] = {
                commission: 0,
                managementSalary: 0,
                sessions: 0,
                basicSalary: 0,
                allowance: 0
              };
            }
            summary.periodSummary[monthKey].managementSalary += managementSalary;
          }
        }
      }
    });

    // Calculate basic salary and allowance based on worked days
    // For each employee, calculate proportional salary based on sessions worked
    const fromDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to as string) : new Date();
    const daysInPeriod = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workDaysInMonth = 26; // Standard work days per month

    // Get the month key for the period to distribute salaries
    const getMonthsInPeriod = (from: Date, to: Date): string[] => {
      const months: string[] = [];
      const current = new Date(from);
      while (current <= to) {
        months.push(getMonthKey(current.toISOString()));
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    };

    const monthsInPeriod = getMonthsInPeriod(fromDate, toDate);

    Object.values(employeeSummaries).forEach((summary) => {
      const employee = employees.find((emp: NhanVien) => emp.maNhanVien === summary.maNhanVien);
      if (!employee) return;

      // Get salary from employee sheet or position config
      let basicSalary = parseFloat(employee.luongCoBan || '0');
      let allowance = parseFloat(employee.phuCap || '0');

      console.log(`💰 Employee ${employee.maNhanVien} (${employee.chucVu}): basicSalary=${basicSalary}, allowance=${allowance}`);

      // If not set in employee sheet, get from position config
      if (basicSalary === 0 || allowance === 0) {
        const posConfig = getPositionSalaryConfig(employee.chucVu);
        console.log(`🔍 Position config for ${employee.chucVu}:`, posConfig);
        if (posConfig) {
          if (basicSalary === 0) basicSalary = posConfig.luongCoBanMacDinh || 0;
          if (allowance === 0) allowance = posConfig.phuCapMacDinh || 0;
          console.log(`✅ Updated basicSalary=${basicSalary}, allowance=${allowance}`);
        }
      }

      // Calculate total salary for the period (monthly salary * number of months)
      const monthlyBasicSalary = basicSalary || 0;
      const monthlyAllowance = allowance || 0;

      summary.totalBasicSalary = monthlyBasicSalary * monthsInPeriod.length;
      summary.totalAllowance = monthlyAllowance * monthsInPeriod.length;

      // Ensure period summary exists for all months in the period
      monthsInPeriod.forEach((monthKey) => {
        if (!summary.periodSummary[monthKey]) {
          summary.periodSummary[monthKey] = {
            commission: 0,
            managementSalary: 0,
            sessions: 0,
            basicSalary: monthlyBasicSalary,
            allowance: monthlyAllowance
          };
        } else {
          summary.periodSummary[monthKey].basicSalary = monthlyBasicSalary;
          summary.periodSummary[monthKey].allowance = monthlyAllowance;
        }
      });
    });

    // Debug: Log all employee summaries before filtering
    console.log('📋 All employee summaries before filtering:');
    Object.values(employeeSummaries).forEach(summary => {
      console.log(`  ${summary.maNhanVien} (${summary.chucVu}):`, {
        commission: summary.totalCommission,
        mgmtSalary: summary.totalManagementSalary,
        basicSalary: summary.totalBasicSalary,
        allowance: summary.totalAllowance,
        sessions: summary.totalSessions
      });
    });

    // Filter out employees with no salary data
    const activeEmployees = Object.values(employeeSummaries)
      .filter(summary =>
        summary.totalCommission > 0 ||
        summary.totalManagementSalary > 0 ||
        summary.totalSessions > 0 ||
        summary.totalBasicSalary > 0 ||
        summary.totalAllowance > 0
      )
      .sort((a, b) =>
        (b.totalCommission + b.totalManagementSalary + b.totalBasicSalary + b.totalAllowance) -
        (a.totalCommission + a.totalManagementSalary + a.totalBasicSalary + a.totalAllowance)
      );

    // Calculate totals
    const totalCommission = activeEmployees.reduce((sum, emp) => sum + emp.totalCommission, 0);
    const totalManagementSalary = activeEmployees.reduce((sum, emp) => sum + emp.totalManagementSalary, 0);
    const totalBasicSalary = activeEmployees.reduce((sum, emp) => sum + emp.totalBasicSalary, 0);
    const totalAllowance = activeEmployees.reduce((sum, emp) => sum + emp.totalAllowance, 0);
    const totalSessions = activeEmployees.reduce((sum, emp) => sum + emp.totalSessions, 0);

    console.log('💼 Salary summary calculated:', {
      employees: activeEmployees.length,
      totalCommission,
      totalManagementSalary,
      totalBasicSalary,
      totalAllowance,
      totalSessions
    });

    return res.status(200).json({
      employees: activeEmployees,
      totalCommission,
      totalManagementSalary,
      totalBasicSalary,
      totalAllowance,
      totalSessions,
      periodRange: {
        from: from as string || '',
        to: to as string || ''
      }
    });


  } catch (error) {
    console.error('❌ Salary summary API error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    } as { error: string });
  }
}
``