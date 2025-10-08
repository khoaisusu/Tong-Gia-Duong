// Utility to synchronize payment status based on completed transactions
import { getAllRows, SHEETS } from './googleSheets';
import { mappingGiaoDich } from './columnMapping';

export async function getCompletedTransactionMap(): Promise<Set<string>> {
  try {
    const transactions = await getAllRows(SHEETS.GIAO_DICH, mappingGiaoDich);
    console.log('🔍 Checking', transactions.length, 'transactions for completed payments');

    const completedTransactions = new Set<string>();

    transactions.forEach((transaction: any) => {
      if (transaction.trangThai === 'Hoàn thành' && transaction.maThamChieu) {
        completedTransactions.add(transaction.maThamChieu);
        console.log('✅ Found completed transaction for reference:', transaction.maThamChieu);
      }
    });

    console.log('📊 Total completed transaction references:', completedTransactions.size);
    return completedTransactions;
  } catch (error) {
    console.error('❌ Error fetching transaction data:', error);
    return new Set();
  }
}

export function updatePaymentStatusBasedOnTransactions<T extends { [key: string]: any }>(
  items: T[],
  completedTransactions: Set<string>,
  idField: string,
  statusField: string = 'trangThaiThanhToan',
  fallbackLogic?: (item: T) => string
): T[] {
  return items.map((item: T) => {
    let finalStatus = item[statusField];

    // Check if there's a completed transaction for this item
    if (completedTransactions.has(item[idField])) {
      finalStatus = 'Đã thanh toán';
      console.log('💰', idField, item[idField], 'marked as paid due to completed transaction');
    }
    // Apply fallback logic if no status set and fallback provided
    else if (!finalStatus && fallbackLogic) {
      finalStatus = fallbackLogic(item);
    }

    return {
      ...item,
      [statusField]: finalStatus
    };
  });
}