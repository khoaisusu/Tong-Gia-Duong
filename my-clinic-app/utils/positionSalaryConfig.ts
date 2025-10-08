// Cấu hình lương và hoa hồng theo chức vụ
export interface PositionSalaryConfig {
  chucVu: string;
  hoaHongMacDinh: number; // Phần trăm hoa hồng mặc định
  luongCoBanMacDinh?: number; // Lương cơ bản mặc định
  phuCapMacDinh?: number; // Phụ cấp mặc định
  moTa?: string;
}

// Cấu hình lương theo chức vụ
export const POSITION_SALARY_CONFIGS: PositionSalaryConfig[] = [
  {
    chucVu: 'Bác sỹ',
    hoaHongMacDinh: 0,
    luongCoBanMacDinh: 15000000,
    phuCapMacDinh: 2000000,
    moTa: 'Bác sỹ không nhận hoa hồng, chỉ nhận lương cố định'
  },
  {
    chucVu: 'Nhân viên thực tập',
    hoaHongMacDinh: 20,
    luongCoBanMacDinh: 3000000,
    phuCapMacDinh: 500000,
    moTa: 'Nhân viên mới vào, đang trong thời gian thực tập'
  },
  {
    chucVu: 'Nhân viên thử việc',
    hoaHongMacDinh: 20,
    luongCoBanMacDinh: 3000000,
    phuCapMacDinh: 500000,
    moTa: 'Nhân viên thử việc (tương đương thực tập)'
  },
  {
    chucVu: 'Nhân viên mới',
    hoaHongMacDinh: 15,
    luongCoBanMacDinh: 4000000,
    phuCapMacDinh: 700000,
    moTa: 'Nhân viên mới hoàn thành thực tập, chính thức làm việc'
  },
  {
    chucVu: 'Nhân viên',
    hoaHongMacDinh: 30,
    luongCoBanMacDinh: 5000000,
    phuCapMacDinh: 1000000,
    moTa: 'Nhân viên chính thức có kinh nghiệm'
  },
  {
    chucVu: 'Quản lý',
    hoaHongMacDinh: 35,
    luongCoBanMacDinh: 8000000,
    phuCapMacDinh: 1500000,
    moTa: 'Quản lý chi nhánh hoặc bộ phận'
  }
];

/**
 * Tìm cấu hình lương theo chức vụ
 */
export function getPositionSalaryConfig(chucVu: string): PositionSalaryConfig | null {
  if (!chucVu) return null;

  // Tìm kiếm chính xác trước
  const exactMatch = POSITION_SALARY_CONFIGS.find(
    config => config.chucVu.toLowerCase().trim() === chucVu.toLowerCase().trim()
  );

  if (exactMatch) return exactMatch;

  // Tìm kiếm gần đúng (chứa từ khóa)
  const partialMatch = POSITION_SALARY_CONFIGS.find(
    config => chucVu.toLowerCase().includes(config.chucVu.toLowerCase()) ||
              config.chucVu.toLowerCase().includes(chucVu.toLowerCase())
  );

  return partialMatch || null;
}

/**
 * Lấy tỷ lệ hoa hồng mặc định theo chức vụ
 */
export function getDefaultCommissionRate(chucVu: string): number {
  const config = getPositionSalaryConfig(chucVu);
  return config?.hoaHongMacDinh ?? 0;
}

/**
 * Lấy lương cơ bản mặc định theo chức vụ
 */
export function getDefaultBasicSalary(chucVu: string): number {
  const config = getPositionSalaryConfig(chucVu);
  return config?.luongCoBanMacDinh ?? 0;
}

/**
 * Lấy phụ cấp mặc định theo chức vụ
 */
export function getDefaultAllowance(chucVu: string): number {
  const config = getPositionSalaryConfig(chucVu);
  return config?.phuCapMacDinh ?? 0;
}

/**
 * Validate cấu hình chức vụ
 */
export function validatePositionConfig(config: PositionSalaryConfig): string[] {
  const errors: string[] = [];

  if (!config.chucVu || config.chucVu.trim() === '') {
    errors.push('Tên chức vụ không được để trống');
  }

  if (config.hoaHongMacDinh < 0 || config.hoaHongMacDinh > 100) {
    errors.push('Hoa hồng phải từ 0% đến 100%');
  }

  if (config.luongCoBanMacDinh && config.luongCoBanMacDinh < 0) {
    errors.push('Lương cơ bản không được âm');
  }

  if (config.phuCapMacDinh && config.phuCapMacDinh < 0) {
    errors.push('Phụ cấp không được âm');
  }

  return errors;
}

/**
 * Lấy danh sách tất cả chức vụ
 */
export function getAllPositions(): string[] {
  return POSITION_SALARY_CONFIGS.map(config => config.chucVu);
}
