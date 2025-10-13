/**
 * Commission Validation Functions (Client-Safe)
 *
 * These functions can be safely imported in both client and server code
 * because they don't depend on server-only modules like googleapis.
 */

// Default commission rate when manager does the service themselves (50%)
export const DEFAULT_MANAGEMENT_COMMISSION_RATE = 50;

// Commission rate for supervisor/manager when supervising only (20%)
export const SUPERVISOR_COMMISSION_RATE = 20;

/**
 * Calculate supervisor/manager commission with proper validation
 *
 * BUSINESS RULES:
 * - Supervisor gets: (supervisorRate - employeeRate) × servicePrice
 * - Commission CANNOT be negative
 * - If supervisorRate < employeeRate, supervisor gets 0
 *
 * @param servicePrice - Price of the service
 * @param employeeRate - Employee's commission rate (%)
 * @param supervisorRate - Supervisor's commission rate (%)
 * @returns Supervisor commission amount
 */
export function calculateSupervisorCommission(
  servicePrice: number,
  employeeRate: number,
  supervisorRate: number
): number {
  // Validate inputs
  if (servicePrice < 0) {
    console.error(`❌ Invalid service price: ${servicePrice}`);
    return 0;
  }

  if (employeeRate < 0 || employeeRate > 100) {
    console.error(`❌ Invalid employee rate: ${employeeRate}%`);
    return 0;
  }

  if (supervisorRate < 0 || supervisorRate > 100) {
    console.error(`❌ Invalid supervisor rate: ${supervisorRate}%`);
    return 0;
  }

  // Supervisor should have higher or equal rate than employee
  if (supervisorRate < employeeRate) {
    console.warn(`⚠️ Supervisor rate (${supervisorRate}%) < Employee rate (${employeeRate}%) - returning 0`);
    return 0;
  }

  // Calculate: (supervisorRate - employeeRate) × servicePrice / 100
  const rateDifference = supervisorRate - employeeRate;
  const commission = (servicePrice * rateDifference) / 100;

  // Ensure non-negative (safety check)
  return Math.max(0, commission);
}

/**
 * Calculate employee commission with validation
 *
 * @param servicePrice - Price of the service
 * @param employeeRate - Employee's commission rate (%)
 * @returns Employee commission amount
 */
export function calculateEmployeeCommission(
  servicePrice: number,
  employeeRate: number
): number {
  // Validate inputs
  if (servicePrice < 0) {
    console.error(`❌ Invalid service price: ${servicePrice}`);
    return 0;
  }

  if (employeeRate < 0 || employeeRate > 100) {
    console.error(`❌ Invalid employee rate: ${employeeRate}%`);
    return 0;
  }

  // Calculate: employeeRate × servicePrice / 100
  const commission = (servicePrice * employeeRate) / 100;

  return Math.max(0, commission);
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
