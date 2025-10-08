// Commission and management salary calculation utilities
import { getAllRows, SHEETS } from './googleSheets';
import { mappingDichVu, mappingNhanVien, DichVu, NhanVien } from './columnMapping';
import { getDefaultCommissionRate } from './positionSalaryConfig';

// Default commission rate when manager does the service themselves (50%)
export const DEFAULT_MANAGEMENT_COMMISSION_RATE = 50;

// Commission rate for supervisor/manager when supervising only (20%)
export const SUPERVISOR_COMMISSION_RATE = 20;

// Configuration for commission rates by service type
export interface CommissionConfig {
  serviceName: string;
  commissionRate: number; // percentage
}

export interface CommissionCalculationResult {
  employeeCommission: number;
  managementSalary: number;
  employeeCommissionRate: number;
  managementCommissionRate: number;
  servicePrice: number;
  calculation: {
    formula: string;
    steps: string[];
  };
}

export interface ServiceCommissionData {
  maDichVu: string;
  tenDichVu: string;
  giaDichVu: number;
  hoaHongPercent: number;
}

/**
 * Get service commission data from Google Sheets
 */
export async function getServiceCommissionData(): Promise<ServiceCommissionData[]> {
  try {
    const services = await getAllRows(SHEETS.DICH_VU, mappingDichVu);
    console.log('💼 Loading service commission data...');

    return services.map((service: DichVu) => ({
      maDichVu: service.maDichVu,
      tenDichVu: service.tenDichVu,
      giaDichVu: parseFloat(service.giaDichVu || '0'),
      hoaHongPercent: parseFloat(service.hoaHongPercent || '0')
    }));
  } catch (error) {
    console.error('❌ Error loading service commission data:', error);
    return [];
  }
}

/**
 * Get employee commission rate from their profile
 * Priority:
 * 1. Custom rate from employee.hoaHong
 * 2. Position-based rate from positionSalaryConfig
 * 3. Default: 0%
 */
export async function getEmployeeCommissionRate(employeeIdentifier: string): Promise<number> {
  try {
    const employees = await getAllRows(SHEETS.NHAN_VIEN, mappingNhanVien);

    // Find by employee code or name
    const employee = employees.find((emp: NhanVien) => {
      const trimmedIdentifier = employeeIdentifier?.trim();
      const trimmedCode = emp.maNhanVien?.trim();
      const trimmedName = emp.hoVaTen?.trim();

      // Match by code
      if (trimmedCode === trimmedIdentifier) return true;

      // Match by name
      if (trimmedName === trimmedIdentifier) return true;

      // Match by name with position format (e.g., "Name - Position")
      if (trimmedIdentifier?.includes(' - ')) {
        const nameInIdentifier = trimmedIdentifier.split(' - ')[0].trim();
        return trimmedName === nameInIdentifier;
      }

      return false;
    });

    if (!employee) {
      console.log(`⚠️ Employee "${employeeIdentifier}" not found, using 0%`);
      return 0;
    }

    console.log(`✅ Found employee: ${employee.maNhanVien} - ${employee.hoVaTen}`);

    // Check if employee has custom commission rate
    if (employee.hoaHong) {
      const customRate = parseFloat(employee.hoaHong);
      if (!isNaN(customRate) && customRate > 0) {
        console.log(`👤 Employee ${employee.maNhanVien} custom commission rate: ${customRate}%`);
        return customRate;
      }
    }

    // Get position-based rate from config
    const position = employee.chucVu || '';
    const positionRate = getDefaultCommissionRate(position);

    if (positionRate > 0) {
      console.log(`👤 Employee ${employee.maNhanVien} (${position}) position-based rate: ${positionRate}%`);
      return positionRate;
    }

    console.log(`⚠️ No commission rate found for employee ${employee.maNhanVien} (${position}), using 0%`);
    return 0;
  } catch (error) {
    console.error('❌ Error loading employee commission rate:', error);
    return 0;
  }
}

/**
 * Calculate commission and management salary for a treatment session
 */
export async function calculateCommissionAndSalary(
  serviceName: string,
  maNhanVien: string,
  customServicePrice?: number
): Promise<CommissionCalculationResult> {
  console.log(`🧮 Calculating commission for service: "${serviceName}", employee: ${maNhanVien}`);

  try {
    // Get service commission data
    const servicesData = await getServiceCommissionData();

    // Normalize for comparison
    const normalizedSearchName = serviceName.toLowerCase().trim();

    // Try exact match first
    let service = servicesData.find(s =>
      s.tenDichVu.toLowerCase().trim() === normalizedSearchName
    );

    // If no exact match, try partial match
    if (!service) {
      service = servicesData.find(s => {
        const normalizedServiceName = s.tenDichVu.toLowerCase().trim();
        return normalizedServiceName.includes(normalizedSearchName) ||
               normalizedSearchName.includes(normalizedServiceName);
      });
    }

    if (!service) {
      console.error('❌ Service not found. Available services:', servicesData.map(s => s.tenDichVu));
      throw new Error(`Service "${serviceName}" not found in commission data. Available services: ${servicesData.map(s => s.tenDichVu).join(', ')}`);
    }

    console.log(`✅ Found service match: "${service.tenDichVu}" for search term "${serviceName}"`);

    // Use custom price if provided, otherwise use service default price
    const servicePrice = customServicePrice || service.giaDichVu;
    const serviceCommissionRate = service.hoaHongPercent;

    // Get employee commission rate
    const employeeCommissionRate = await getEmployeeCommissionRate(maNhanVien);

    // Calculate employee commission
    const employeeCommission = (employeeCommissionRate / 100) * servicePrice;

    // Calculate management salary (difference between standard rate and employee rate)
    const managementCommissionRate = Math.max(0, DEFAULT_MANAGEMENT_COMMISSION_RATE - employeeCommissionRate);
    const managementSalary = (managementCommissionRate / 100) * servicePrice;

    // Create calculation breakdown
    const formula = `(${DEFAULT_MANAGEMENT_COMMISSION_RATE}% - ${employeeCommissionRate}%) × ${servicePrice.toLocaleString('vi-VN')} = ${managementSalary.toLocaleString('vi-VN')} VNĐ`;

    const steps = [
      `Dịch vụ: ${serviceName}`,
      `Giá dịch vụ: ${servicePrice.toLocaleString('vi-VN')} VNĐ`,
      `Tỷ lệ chuẩn quản lý: ${DEFAULT_MANAGEMENT_COMMISSION_RATE}%`,
      `Tỷ lệ hoa hồng nhân viên: ${employeeCommissionRate}%`,
      `Chênh lệch: ${DEFAULT_MANAGEMENT_COMMISSION_RATE}% - ${employeeCommissionRate}% = ${managementCommissionRate}%`,
      `Lương quản lý: ${managementCommissionRate}% × ${servicePrice.toLocaleString('vi-VN')} = ${managementSalary.toLocaleString('vi-VN')} VNĐ`,
      `Hoa hồng nhân viên: ${employeeCommissionRate}% × ${servicePrice.toLocaleString('vi-VN')} = ${employeeCommission.toLocaleString('vi-VN')} VNĐ`
    ];

    console.log('💰 Calculation result:', {
      employeeCommission,
      managementSalary,
      employeeCommissionRate,
      managementCommissionRate
    });

    return {
      employeeCommission,
      managementSalary,
      employeeCommissionRate,
      managementCommissionRate,
      servicePrice,
      calculation: {
        formula,
        steps
      }
    };

  } catch (error) {
    console.error('❌ Error calculating commission:', error);

    // Return zero values on error
    return {
      employeeCommission: 0,
      managementSalary: 0,
      employeeCommissionRate: 0,
      managementCommissionRate: 0,
      servicePrice: customServicePrice || 0,
      calculation: {
        formula: 'Error in calculation',
        steps: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    };
  }
}

/**
 * Validate commission configuration
 */
export function validateCommissionRates(commissionRate: number): string[] {
  const errors: string[] = [];

  if (commissionRate < 0) {
    errors.push('Tỷ lệ hoa hồng không thể âm');
  }

  if (commissionRate > 100) {
    errors.push('Tỷ lệ hoa hồng không thể vượt quá 100%');
  }

  if (commissionRate > DEFAULT_MANAGEMENT_COMMISSION_RATE) {
    errors.push(`Tỷ lệ hoa hồng nhân viên (${commissionRate}%) vượt quá tỷ lệ chuẩn quản lý (${DEFAULT_MANAGEMENT_COMMISSION_RATE}%)`);
  }

  return errors;
}

/**
 * Format currency for display
 */
export function formatCommissionCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' VNĐ';
}

/**
 * Parse service from treatment session data
 */
export function parseServiceFromTreatment(dichVuThucHien: string): string[] {
  try {
    if (!dichVuThucHien || dichVuThucHien.trim() === '') {
      return [];
    }

    const trimmed = dichVuThucHien.trim();

    // Try parsing as JSON array
    if (trimmed.startsWith('[')) {
      try {
        const services = JSON.parse(trimmed);
        if (Array.isArray(services)) {
          return services.map((s: any) => {
            if (typeof s === 'string') return s;
            return s.tenDichVu || s.name || s.ten || '';
          }).filter(Boolean);
        }
      } catch (jsonError) {
        console.warn('⚠️ JSON parse failed, trying alternative parsing:', jsonError);
        // If JSON is malformed, try to extract service name from the string
        // Pattern: [{"maDichVu":"XXX","tenDichVu":"Service Name",...}]
        const match = trimmed.match(/"tenDichVu"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          console.log('✅ Extracted service name from malformed JSON:', match[1]);
          return [match[1]];
        }
      }
    }

    // Simple string format - could be comma-separated
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Single service
    return [trimmed].filter(Boolean);
  } catch (error) {
    console.warn('⚠️ Could not parse service data:', error);
    // Return empty array on complete failure to avoid using malformed data
    return [];
  }
}