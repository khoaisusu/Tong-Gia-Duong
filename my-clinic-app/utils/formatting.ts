// Format currency
export function formatCurrency(amount: number | string): string {
  // Handle null, undefined, empty string cases
  if (amount === null || amount === undefined || amount === '') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(0);
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  // If parseFloat returns NaN, default to 0
  const safeNum = isNaN(num) ? 0 : num;

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(safeNum);
}

// Parse currency string to number
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d]/g, '')) || 0;
}

// Generate unique ID
export function generateId(prefix: string): string {
  // For customer IDs, generate shorter 4-character codes
  if (prefix === 'KH') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + result;
  }

  // For other IDs, use the original long format
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}