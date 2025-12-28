import { google, sheets_v4 } from 'googleapis';
import { mapRowToObject, mapObjectToRow } from './columnMapping';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheetsClient: sheets_v4.Sheets | null = null;

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (!sheetsClient) {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable is required');
    }

    if (!process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('GOOGLE_PRIVATE_KEY environment variable is required');
    }

    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID environment variable is required');
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
      });

      sheetsClient = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets client:', error);
      throw error;
    }
  }

  return sheetsClient;
}

export const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Sheet names
export const SHEETS = {
  KHACH_HANG: 'Khách hàng',
  SAN_PHAM: 'Sản phẩm',
  DICH_VU: 'Dịch vụ',
  DON_HANG: 'Đơn hàng',
  LIEU_TRINH: 'Liệu trình',
  LUOT_TRI_LIEU: 'Lượt trị liệu',
  NHAN_VIEN: 'Nhân viên',
  GIAO_DICH: 'Giao dịch',
  HOA_HONG: 'Hoa hồng',
  CHI_TIET_DICH_VU_THEM: 'Chi tiết dịch vụ thêm',
} as const;

// Helper functions for CRUD operations
export async function getAllRows<T extends Record<string, string>>(
  sheetName: string,
  mapping: T
): Promise<any[]> {
  const sheets = await getSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      return [];
    }

    const [headers, ...rows] = values;
    console.log(`🔍 [${sheetName}] Headers from sheet:`, headers);
    console.log(`🔍 [${sheetName}] Mapping being used:`, mapping);
    console.log(`🔍 [${sheetName}] First row data:`, rows[0]);

    const mappedData = rows.map(row => mapRowToObject(headers, row, mapping));
    console.log(`🔍 [${sheetName}] First mapped object:`, mappedData[0]);

    return mappedData;
  } catch (error) {
    console.error(`❌ [${sheetName}] Error fetching data:`, error);
    throw error;
  }
}

export async function getRowById<T extends Record<string, string>>(
  sheetName: string,
  mapping: T,
  idField: string,
  idValue: string
): Promise<any | null> {
  const rows = await getAllRows(sheetName, mapping);
  return rows.find(row => row[idField] === idValue) || null;
}

export async function appendRow<T extends Record<string, string>>(
  sheetName: string,
  mapping: T,
  data: Record<string, any>
): Promise<void> {
  const sheets = await getSheetsClient();

  try {
    console.log(`📝 Getting headers for sheet "${sheetName}"`);

    // Get headers to ensure correct column order
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    });

    let headers = headerResponse.data.values?.[0];
    console.log('📝 Current headers:', headers);

    // If no headers exist, create them
    if (!headers || headers.length === 0) {
      headers = Object.keys(mapping);
      console.log('📝 Creating new headers:', headers);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // Map data to row using actual sheet headers order
    const row = headers.map(header => {
      const field = mapping[header as keyof typeof mapping];
      const value = field ? (data[field] || '') : '';
      console.log(`📝 Header "${header}" -> Field "${field}" -> Value "${value}"`);
      return value;
    });
    console.log('📝 Mapped row data:', row);
    console.log('📝 Data being appended:', data);
    console.log('📝 Headers order:', headers);

    // Append the row
    console.log(`📝 Appending to sheet "${sheetName}" range "A:Z"`);
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    console.log('📝 Append result:', appendResult.data);
    console.log('✅ Successfully appended row to Google Sheets');
  } catch (error) {
    console.error(`❌ Error appending row to ${sheetName}:`, error);
    throw error;
  }
}

export async function updateRow<T extends Record<string, string>>(
  sheetName: string,
  mapping: T,
  idField: string,
  idValue: string,
  updates: Partial<Record<string, any>>
): Promise<boolean> {
  const sheets = await getSheetsClient();

  try {
    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const values = response.data.values || [];
    if (values.length === 0) return false;

    const [headers, ...rows] = values;

    // Find the row index to update
    let rowIndex = -1;
    const idFieldIndex = headers.indexOf(Object.keys(mapping).find(k => mapping[k as keyof T] === idField) || '');

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][idFieldIndex] === idValue) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) return false;

    // Get current row data
    const currentData = mapRowToObject(headers, rows[rowIndex], mapping);

    // Merge with updates
    const updatedData = { ...currentData, ...updates };

    // Convert back to row format
    const updatedRow = mapObjectToRow(updatedData, mapping);

    // Update the row in sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A${rowIndex + 2}:Z${rowIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow],
      },
    });

    return true;
  } catch (error) {
    console.error(`Error updating row in ${sheetName}:`, error);
    throw error;
  }
}

export async function deleteRow<T extends Record<string, string>>(
  sheetName: string,
  mapping: T,
  idField: string,
  idValue: string
): Promise<boolean> {
  const sheets = await getSheetsClient();

  try {
    // Get sheet metadata to find sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

    const sheetId = sheet.properties?.sheetId;
    if (sheetId === undefined) throw new Error(`Sheet ID not found for ${sheetName}`);

    // Get all data to find row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const values = response.data.values || [];
    if (values.length === 0) return false;

    const [headers, ...rows] = values;

    // Find the row index to delete
    let rowIndex = -1;
    const idFieldIndex = headers.indexOf(Object.keys(mapping).find(k => mapping[k as keyof T] === idField) || '');

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][idFieldIndex] === idValue) {
        rowIndex = i + 1; // +1 because of header row
        break;
      }
    }

    if (rowIndex === -1) return false;

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });

    return true;
  } catch (error) {
    console.error(`Error deleting row from ${sheetName}:`, error);
    throw error;
  }
}

// Utility function to generate unique IDs (legacy - for backward compatibility)
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${randomStr}`.toUpperCase();
}

// Helper: Random delay to reduce collision probability
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Generate sequential ID with retry logic to handle race conditions
// Uses timestamp-based fallback if sequential generation fails after retries
export async function generateSequentialId<T extends Record<string, string>>(
  prefix: string,
  sheetName: string,
  mapping: T,
  idField: string,
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add random delay on retry to reduce collision probability
      if (attempt > 0) {
        await randomDelay(50 * attempt, 200 * attempt);
        console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} for ${prefix} ID generation`);
      }

      const allRows = await getAllRows(sheetName, mapping);

      // Extract numbers from existing IDs
      const existingNumbers = allRows
        .map(row => {
          const id = row[idField];
          if (!id || typeof id !== 'string') return 0;

          // Extract digits after prefix (DH0001 -> 0001, LT0023 -> 0023)
          const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      // Find max number and increment
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const nextNumber = maxNumber + 1;

      // Format with 4 digits
      const formattedNumber = nextNumber.toString().padStart(4, '0');
      const generatedId = `${prefix}${formattedNumber}`;

      console.log(`📝 Generated sequential ID: ${generatedId} (previous max: ${maxNumber})`);

      // Verify ID doesn't exist (double-check for race condition)
      const exists = allRows.some(row => row[idField] === generatedId);
      if (exists) {
        console.warn(`⚠️ ID ${generatedId} already exists, retrying...`);
        continue; // Retry
      }

      return generatedId;
    } catch (error) {
      console.error(`❌ Error generating sequential ID (attempt ${attempt + 1}/${maxRetries}):`, error);

      // On last attempt, fallback to timestamp-based ID
      if (attempt === maxRetries - 1) {
        console.warn(`⚠️ Falling back to timestamp-based ID after ${maxRetries} failed attempts`);
        return generateId(prefix);
      }
    }
  }

  // Fallback (should never reach here, but TypeScript requires it)
  return generateId(prefix);
}

