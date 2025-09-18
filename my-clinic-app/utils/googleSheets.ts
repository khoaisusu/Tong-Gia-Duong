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
    const mappedData = rows.map(row => mapRowToObject(headers, row, mapping));

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
    // Get headers to ensure correct column order
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    });
    
    let headers = headerResponse.data.values?.[0];
    
    // If no headers exist, create them
    if (!headers || headers.length === 0) {
      headers = Object.keys(mapping);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }
    
    // Map data to row
    const row = mapObjectToRow(data, mapping);
    
    // Append the row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });
  } catch (error) {
    console.error(`Error appending row to ${sheetName}:`, error);
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
      valueInputOption: 'USER_ENTERED',
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

// Utility function to generate unique IDs
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${randomStr}`.toUpperCase();
}

