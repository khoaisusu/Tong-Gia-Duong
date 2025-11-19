/**
 * Input Validation Utilities
 *
 * Comprehensive validation for API inputs to prevent:
 * - SQL injection (even though we use Google Sheets, still good practice)
 * - XSS attacks
 * - Invalid data types
 * - Business logic violations
 * - Data integrity issues
 */

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validation rules for a field
 */
export interface FieldValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'date' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean | string; // Return true or error message
  allowedValues?: any[];
}

/**
 * Schema definition for validation
 */
export type ValidationSchema = Record<string, FieldValidationRule>;

/**
 * Validate data against a schema
 */
export function validateData(
  data: Record<string, any>,
  schema: ValidationSchema
): ValidationResult {
  const errors: string[] = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = data[fieldName];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Trường "${fieldName}" là bắt buộc`);
      continue;
    }

    // Skip validation if field is not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const typeError = validateType(fieldName, value, rules.type);
      if (typeError) {
        errors.push(typeError);
        continue; // Skip other validations if type is wrong
      }
    }

    // String-specific validations
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`Trường "${fieldName}" phải có ít nhất ${rules.minLength} ký tự`);
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`Trường "${fieldName}" không được vượt quá ${rules.maxLength} ký tự`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Trường "${fieldName}" không đúng định dạng`);
      }
    }

    // Number-specific validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Trường "${fieldName}" phải >= ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Trường "${fieldName}" phải <= ${rules.max}`);
      }
    }

    // Allowed values validation
    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      errors.push(`Trường "${fieldName}" phải là một trong: ${rules.allowedValues.join(', ')}`);
    }

    // Custom validator
    if (rules.customValidator) {
      const result = rules.customValidator(value);
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : `Trường "${fieldName}" không hợp lệ`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate type of a value
 */
function validateType(fieldName: string, value: any, expectedType: string): string | null {
  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        return `Trường "${fieldName}" phải là chuỗi`;
      }
      break;

    case 'number':
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (typeof num !== 'number' || isNaN(num)) {
        return `Trường "${fieldName}" phải là số`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Trường "${fieldName}" phải là true/false`;
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return `Trường "${fieldName}" phải là email hợp lệ`;
      }
      break;

    case 'phone':
      if (typeof value !== 'string' || !isValidPhone(value)) {
        return `Trường "${fieldName}" phải là số điện thoại hợp lệ`;
      }
      break;

    case 'date':
      if (typeof value !== 'string' || !isValidDate(value)) {
        return `Trường "${fieldName}" phải là ngày hợp lệ (YYYY-MM-DD)`;
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return `Trường "${fieldName}" phải là mảng`;
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return `Trường "${fieldName}" phải là object`;
      }
      break;
  }

  return null;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Vietnamese phone number
 * Supports formats: 0912345678, +84912345678, 84912345678
 */
export function isValidPhone(phone: string): boolean {
  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, '');

  // Vietnamese phone number patterns
  const patterns = [
    /^0\d{9,10}$/,           // 0912345678 or 09123456789
    /^\+84\d{9,10}$/,        // +84912345678
    /^84\d{9,10}$/,          // 84912345678
  ];

  return patterns.some(pattern => pattern.test(cleanPhone));
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Sanitize string input (remove potential XSS)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object (recursively sanitize all string values)
 * Skips JSON fields to preserve data integrity
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  // Fields that contain JSON data and should NOT be sanitized
  const jsonFields = [
    'danhSachSanPham',
    'chiTietDonHang',
    'danhSachDichVu',
    'dichVuThucHien',
    'anhTruocDieuTri',
    'anhSauDieuTri'
  ];

  for (const [key, value] of Object.entries(obj)) {
    // Skip sanitization for JSON fields
    if (jsonFields.includes(key)) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item) :
        item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate customer ID format
 */
export function isValidCustomerId(id: string): boolean {
  // Format: KH + alphanumeric (e.g., KH0001, KHABCD)
  return /^KH[A-Z0-9]+$/i.test(id);
}

/**
 * Validate order ID format
 */
export function isValidOrderId(id: string): boolean {
  // Format: DH + alphanumeric (e.g., DH0001, DHABCD)
  return /^DH[A-Z0-9]+$/i.test(id);
}

/**
 * Validate treatment plan ID format
 */
export function isValidTreatmentId(id: string): boolean {
  // Format: LT + alphanumeric (e.g., LT0001, LTABCD)
  return /^LT[A-Z0-9]+$/i.test(id);
}

/**
 * Validate session ID format
 */
export function isValidSessionId(id: string): boolean {
  // Format: Various formats supported
  return typeof id === 'string' && id.length > 0;
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: any): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return typeof num === 'number' && !isNaN(num) && num > 0;
}

/**
 * Validate non-negative number
 */
export function isNonNegativeNumber(value: any): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return typeof num === 'number' && !isNaN(num) && num >= 0;
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: any): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return typeof num === 'number' && !isNaN(num) && num >= 0 && num <= 100;
}

// ========================================
// Pre-defined schemas for common entities
// ========================================

export const CustomerSchema: ValidationSchema = {
  hoVaTen: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100
  },
  soDienThoai: {
    required: true,
    type: 'phone'
  },
  email: {
    required: false,
    type: 'email'
  },
  ngaySinh: {
    required: false,
    type: 'date'
  },
  gioiTinh: {
    required: false,
    type: 'string',
    allowedValues: ['Nam', 'Nữ', 'Khác']
  },
  diaChi: {
    required: false,
    type: 'string',
    maxLength: 500
  }
};

export const OrderSchema: ValidationSchema = {
  maKhachHang: {
    required: true,
    type: 'string',
    customValidator: isValidCustomerId
  },
  tenKhachHang: {
    required: true,
    type: 'string',
    minLength: 2
  },
  danhSachSanPham: {
    required: true,
    type: 'string',
    minLength: 2
  },
  thanhTien: {
    required: true,
    type: 'number',
    customValidator: isPositiveNumber
  },
  trangThaiThanhToan: {
    required: false,
    type: 'string',
    allowedValues: ['Chưa thanh toán', 'Đã thanh toán', 'Thanh toán một phần', 'Đã hoàn tiền']
  },
  phuongThucThanhToan: {
    required: false,
    type: 'string',
    allowedValues: ['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử']
  }
};

export const TreatmentPlanSchema: ValidationSchema = {
  maKhachHang: {
    required: true,
    type: 'string',
    customValidator: isValidCustomerId
  },
  tenKhachHang: {
    required: true,
    type: 'string',
    minLength: 2
  },
  tenLieuTrinh: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 200
  },
  soBuoi: {
    required: true,
    type: 'number',
    customValidator: (value) => {
      const num = typeof value === 'string' ? parseInt(value) : value;
      return num > 0 && num <= 1000 ? true : 'Số buổi phải từ 1-1000';
    }
  },
  danhSachDichVu: {
    required: true,
    type: 'string',
    minLength: 2
  },
  ngayBatDau: {
    required: true,
    type: 'date'
  }
};

export const TreatmentSessionSchema: ValidationSchema = {
  maLieuTrinh: {
    required: true,
    type: 'string',
    customValidator: isValidTreatmentId
  },
  maKhachHang: {
    required: true,
    type: 'string',
    customValidator: isValidCustomerId
  },
  tenKhachHang: {
    required: true,
    type: 'string',
    minLength: 2
  },
  ngayThucHien: {
    required: true,
    type: 'date'
  },
  gioBatDau: {
    required: true,
    type: 'string',
    pattern: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:MM format
  },
  gioKetThuc: {
    required: true,
    type: 'string',
    pattern: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:MM format
  },
  dichVuThucHien: {
    required: true,
    type: 'string',
    minLength: 2
  },
  nhanVienThucHien: {
    required: false,
    type: 'string'
  },
  trangThai: {
    required: false,
    type: 'string',
    allowedValues: ['Đã lên lịch', 'Đã xác nhận', 'Hoàn thành', 'Hủy']
  }
};

export const StaffSchema: ValidationSchema = {
  hoVaTen: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100
  },
  soDienThoai: {
    required: true,
    type: 'phone'
  },
  email: {
    required: true,
    type: 'email'
  },
  chucVu: {
    required: true,
    type: 'string',
    allowedValues: ['Bác sỹ', 'Kỹ thuật viên', 'Y tá', 'Lễ tân', 'Quản lý']
  },
  quyenHan: {
    required: true,
    type: 'string',
    allowedValues: ['Admin', 'Nhân viên']
  },
  trangThai: {
    required: false,
    type: 'string',
    allowedValues: ['Hoạt động', 'Tạm nghỉ', 'Đã nghỉ việc']
  }
};

export const CommissionSchema: ValidationSchema = {
  maNhanVien: {
    required: true,
    type: 'string'
  },
  tenNhanVien: {
    required: true,
    type: 'string',
    minLength: 2
  },
  maDichVu: {
    required: true,
    type: 'string'
  },
  tyLeHoaHong: {
    required: true,
    type: 'number',
    customValidator: isValidPercentage
  }
};

/**
 * Validate request body against schema and return errors
 */
export function validateRequest<T extends Record<string, any>>(
  body: T,
  schema: ValidationSchema
): { valid: boolean; errors: string[]; data?: T } {
  const result = validateData(body, schema);

  if (!result.isValid) {
    return {
      valid: false,
      errors: result.errors
    };
  }

  // Sanitize the data
  const sanitizedData = sanitizeObject(body);

  return {
    valid: true,
    errors: [],
    data: sanitizedData
  };
}
