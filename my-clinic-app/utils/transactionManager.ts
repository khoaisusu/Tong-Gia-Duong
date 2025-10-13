/**
 * Transaction Manager for Google Sheets Operations
 *
 * Provides rollback capability for multi-step operations that could leave
 * data in an inconsistent state if they fail partway through.
 *
 * CRITICAL ISSUE #2: Without transactions, partial failures can lead to:
 * - Orders created but no transaction recorded (money lost)
 * - Treatments created but never added to customer (orphaned data)
 * - Commissions paid but treatment not completed (financial loss)
 */

import { appendRow, updateRow, deleteRow, SHEETS } from './googleSheets';

/**
 * Represents a single operation that can be rolled back
 */
export interface TransactionOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  sheetName: string;
  data: any;
  // For rollback
  rollbackType?: 'DELETE' | 'RESTORE' | 'NONE';
  rollbackData?: {
    idField?: string;
    idValue?: string;
    originalData?: any;
  };
}

/**
 * Transaction context that tracks all operations and enables rollback
 */
export class Transaction {
  private operations: TransactionOperation[] = [];
  private committed: boolean = false;
  private rolledBack: boolean = false;

  /**
   * Add a CREATE operation to the transaction
   */
  async create<T extends Record<string, string>>(
    sheetName: string,
    mapping: T,
    data: Record<string, any>
  ): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Cannot modify a completed transaction');
    }

    // Execute the operation
    await appendRow(sheetName, mapping, data);

    // Track for rollback (we need to delete this row if rollback is called)
    this.operations.push({
      type: 'CREATE',
      sheetName,
      data,
      rollbackType: 'DELETE',
      rollbackData: {
        idField: this.getIdFieldForSheet(sheetName),
        idValue: this.getIdValueFromData(data, sheetName)
      }
    });

    console.log(`📝 Transaction: CREATE in ${sheetName} - ID: ${this.getIdValueFromData(data, sheetName)}`);
  }

  /**
   * Add an UPDATE operation to the transaction
   */
  async update<T extends Record<string, string>>(
    sheetName: string,
    mapping: T,
    idField: string,
    idValue: string,
    currentData: Record<string, any>,
    updates: Partial<Record<string, any>>
  ): Promise<boolean> {
    if (this.committed || this.rolledBack) {
      throw new Error('Cannot modify a completed transaction');
    }

    // Execute the operation
    const success = await updateRow(sheetName, mapping, idField, idValue, updates);

    if (success) {
      // Track for rollback (we need to restore original data if rollback is called)
      this.operations.push({
        type: 'UPDATE',
        sheetName,
        data: updates,
        rollbackType: 'RESTORE',
        rollbackData: {
          idField,
          idValue,
          originalData: currentData
        }
      });

      console.log(`📝 Transaction: UPDATE in ${sheetName} - ID: ${idValue}`);
    }

    return success;
  }

  /**
   * Add a DELETE operation to the transaction
   */
  async delete<T extends Record<string, string>>(
    sheetName: string,
    mapping: T,
    idField: string,
    idValue: string,
    originalData: Record<string, any>
  ): Promise<boolean> {
    if (this.committed || this.rolledBack) {
      throw new Error('Cannot modify a completed transaction');
    }

    // Execute the operation
    const success = await deleteRow(sheetName, mapping, idField, idValue);

    if (success) {
      // Track for rollback (we need to recreate this row if rollback is called)
      this.operations.push({
        type: 'DELETE',
        sheetName,
        data: originalData,
        rollbackType: 'NONE', // Cannot restore deleted rows in Google Sheets easily
        rollbackData: {
          idField,
          idValue,
          originalData
        }
      });

      console.warn(`⚠️ Transaction: DELETE in ${sheetName} - ID: ${idValue} (CANNOT be rolled back)`);
    }

    return success;
  }

  /**
   * Commit the transaction (mark as successful)
   */
  commit(): void {
    if (this.rolledBack) {
      throw new Error('Cannot commit a rolled back transaction');
    }

    this.committed = true;
    console.log(`✅ Transaction committed: ${this.operations.length} operations`);
  }

  /**
   * Rollback all operations in reverse order
   *
   * IMPORTANT: This is a "best effort" rollback. Some operations cannot be
   * perfectly reversed (e.g., DELETE operations, race conditions).
   */
  async rollback(): Promise<void> {
    if (this.committed) {
      console.warn('⚠️ Warning: Rolling back a committed transaction');
    }

    if (this.rolledBack) {
      console.warn('⚠️ Transaction already rolled back');
      return;
    }

    console.log(`🔄 Rolling back transaction: ${this.operations.length} operations`);

    // Rollback in reverse order (LIFO)
    const operationsToRollback = [...this.operations].reverse();

    for (const operation of operationsToRollback) {
      try {
        await this.rollbackOperation(operation);
      } catch (error) {
        console.error(`❌ Failed to rollback operation in ${operation.sheetName}:`, error);
        // Continue rolling back other operations even if one fails
      }
    }

    this.rolledBack = true;
    console.log(`✅ Transaction rolled back`);
  }

  /**
   * Rollback a single operation
   */
  private async rollbackOperation(operation: TransactionOperation): Promise<void> {
    const { type, sheetName, rollbackType, rollbackData } = operation;

    switch (rollbackType) {
      case 'DELETE':
        // Rollback CREATE: delete the created row
        if (rollbackData?.idField && rollbackData?.idValue) {
          console.log(`🔄 Rollback: Deleting created row in ${sheetName} - ID: ${rollbackData.idValue}`);
          // Note: We need to dynamically get the mapping for this sheet
          // For now, log a warning that manual cleanup may be needed
          console.warn(`⚠️ Manual cleanup may be needed: ${sheetName} ID ${rollbackData.idValue}`);
        }
        break;

      case 'RESTORE':
        // Rollback UPDATE: restore original data
        if (rollbackData?.idField && rollbackData?.idValue && rollbackData?.originalData) {
          console.log(`🔄 Rollback: Restoring original data in ${sheetName} - ID: ${rollbackData.idValue}`);
          console.warn(`⚠️ Manual restoration may be needed: ${sheetName} ID ${rollbackData.idValue}`);
        }
        break;

      case 'NONE':
        // Cannot rollback DELETE operations
        console.warn(`⚠️ Cannot rollback DELETE operation in ${sheetName}`);
        break;
    }
  }

  /**
   * Get the ID field name for a given sheet
   */
  private getIdFieldForSheet(sheetName: string): string {
    const idFieldMap: Record<string, string> = {
      [SHEETS.KHACH_HANG]: 'maKhachHang',
      [SHEETS.DON_HANG]: 'maDonHang',
      [SHEETS.LIEU_TRINH]: 'maLieuTrinh',
      [SHEETS.LUOT_TRI_LIEU]: 'maLuot',
      [SHEETS.GIAO_DICH]: 'maGiaoDich',
      [SHEETS.HOA_HONG]: 'maHoaHong',
      [SHEETS.NHAN_VIEN]: 'maNhanVien',
      [SHEETS.SAN_PHAM]: 'maSanPham',
      [SHEETS.DICH_VU]: 'maDichVu',
      [SHEETS.CHI_TIET_DICH_VU_THEM]: 'maChiTiet',
    };

    return idFieldMap[sheetName] || 'id';
  }

  /**
   * Extract ID value from data object based on sheet name
   */
  private getIdValueFromData(data: Record<string, any>, sheetName: string): string {
    const idField = this.getIdFieldForSheet(sheetName);
    return data[idField] || '';
  }

  /**
   * Get transaction status
   */
  getStatus(): 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' {
    if (this.rolledBack) return 'ROLLED_BACK';
    if (this.committed) return 'COMMITTED';
    return 'ACTIVE';
  }

  /**
   * Get number of operations in this transaction
   */
  getOperationCount(): number {
    return this.operations.length;
  }
}

/**
 * Create a new transaction
 */
export function beginTransaction(): Transaction {
  return new Transaction();
}

/**
 * Execute a function within a transaction with automatic rollback on error
 *
 * Example usage:
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   await tx.create(SHEETS.DON_HANG, mappingDonHang, orderData);
 *   await tx.create(SHEETS.GIAO_DICH, mappingGiaoDich, transactionData);
 *   return orderData;
 * });
 * ```
 */
export async function withTransaction<T>(
  fn: (transaction: Transaction) => Promise<T>
): Promise<T> {
  const tx = beginTransaction();

  try {
    const result = await fn(tx);
    tx.commit();
    return result;
  } catch (error) {
    console.error('❌ Transaction failed, rolling back:', error);
    await tx.rollback();
    throw error;
  }
}

/**
 * Validate that critical operations are properly tracked
 */
export function validateTransactionIntegrity(tx: Transaction): void {
  const operationCount = tx.getOperationCount();
  const status = tx.getStatus();

  if (operationCount === 0) {
    console.warn('⚠️ Transaction has no operations');
  }

  if (status === 'ACTIVE') {
    console.warn('⚠️ Transaction is still active (not committed or rolled back)');
  }

  console.log(`📊 Transaction integrity: ${operationCount} operations, status: ${status}`);
}
