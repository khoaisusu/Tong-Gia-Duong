# Transaction Management System

## Overview

This document describes the transaction management system for Google Sheets operations in the Tống Gia Đường clinic management system.

## Problem Statement

**CRITICAL ISSUE #2**: Without proper transaction management, partial failures can lead to data inconsistency:

- ❌ Orders created but no transaction recorded (money lost)
- ❌ Treatments created but never added to customer (orphaned data)
- ❌ Commissions paid but treatment not completed (financial loss)
- ❌ Inventory reduced but order failed (stock count wrong)

## Solution: Transaction Manager

The `transactionManager.ts` utility provides:

✅ **Atomic operations**: All-or-nothing execution
✅ **Rollback capability**: Undo operations on failure
✅ **Operation tracking**: Audit trail for debugging
✅ **Error handling**: Graceful failure with cleanup

## Usage

### Basic Pattern

```typescript
import { withTransaction } from '../../utils/transactionManager';
import { SHEETS } from '../../utils/googleSheets';
import { mappingDonHang, mappingGiaoDich } from '../../utils/columnMapping';

// Wrap multi-step operations in a transaction
const result = await withTransaction(async (tx) => {
  // Step 1: Create order
  await tx.create(SHEETS.DON_HANG, mappingDonHang, orderData);

  // Step 2: Create transaction (if Step 1 fails, nothing is created)
  await tx.create(SHEETS.GIAO_DICH, mappingGiaoDich, transactionData);

  // Step 3: Update inventory (if this fails, Steps 1 & 2 are rolled back)
  await tx.update(SHEETS.SAN_PHAM, mappingSanPham, 'maSanPham', productId, currentData, { soLuongTon: newStock });

  return orderData;
});
```

### Example: Order Creation with Payment

**BEFORE (Dangerous - no rollback):**

```typescript
// ❌ PROBLEM: If transaction creation fails, order exists but no payment record
await appendRow(SHEETS.DON_HANG, mappingDonHang, orderData);
await appendRow(SHEETS.GIAO_DICH, mappingGiaoDich, transactionData); // Might fail!
await updateInventory(productId, newStock); // Might fail!
```

**AFTER (Safe - automatic rollback):**

```typescript
// ✅ SOLUTION: All steps succeed or all are rolled back
await withTransaction(async (tx) => {
  await tx.create(SHEETS.DON_HANG, mappingDonHang, orderData);
  await tx.create(SHEETS.GIAO_DICH, mappingGiaoDich, transactionData);
  // Inventory update would need custom logic
  return orderData;
});
```

## Critical Operations Requiring Transactions

### 1. Order Creation (`/api/don-hang POST`)

**Steps:**
1. Create order record
2. Create transaction record (if paid)
3. Update product inventory

**Risk**: If Step 3 fails, money is recorded but inventory not reduced.

**Fix**: Wrap in transaction

### 2. Treatment Session Completion (`/api/luot-tri-lieu PUT`)

**Steps:**
1. Update session status to "Hoàn thành"
2. Create additional service details
3. Calculate and record commissions

**Risk**: If Step 3 fails, session marked complete but no commission paid.

**Fix**: Wrap in transaction

### 3. Treatment Plan Creation (`/api/lieu-trinh POST`)

**Steps:**
1. Create treatment plan
2. Create initial transaction (if pre-paid)
3. Update customer status

**Risk**: If Step 2 fails, plan created but no payment recorded.

**Fix**: Wrap in transaction

## API Examples

### Example 1: Safe Order Creation

```typescript
// pages/api/don-hang.ts (POST handler)
case 'POST':
  const newOrder = req.body as Partial<DonHang>;

  // Validate required fields
  if (!newOrder.maKhachHang || !newOrder.danhSachSanPham) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate order ID
  const orderData = {
    ...newOrder,
    maDonHang: await generateSequentialId('DH', SHEETS.DON_HANG, mappingDonHang, 'maDonHang'),
    ngayTao: new Date().toISOString().split('T')[0],
    nhanVienTao: session.user?.name || '',
    trangThaiThanhToan: newOrder.trangThaiThanhToan || 'Chưa thanh toán',
  };

  // ✅ Wrap in transaction
  try {
    await withTransaction(async (tx) => {
      // Step 1: Create order
      await tx.create(SHEETS.DON_HANG, mappingDonHang, orderData);

      // Step 2: Create transaction if paid
      if (orderData.trangThaiThanhToan === 'Đã thanh toán') {
        const transactionData = {
          maGiaoDich: generateId('GD'),
          loaiGiaoDich: 'Thu',
          maThamChieu: orderData.maDonHang,
          maKhachHang: orderData.maKhachHang,
          tenKhachHang: orderData.tenKhachHang,
          soTien: orderData.thanhTien,
          phuongThuc: orderData.phuongThucThanhToan,
          ngayGiaoDich: orderData.ngayTao,
          noiDung: `Thanh toán đơn hàng ${orderData.maDonHang}`,
          trangThai: 'Hoàn thành',
          nhanVienXuLy: orderData.nhanVienTao,
        };

        await tx.create(SHEETS.GIAO_DICH, mappingGiaoDich, transactionData);
      }
    });

    return res.status(201).json({
      message: 'Tạo đơn hàng thành công',
      data: orderData
    });
  } catch (error) {
    // Transaction automatically rolled back
    console.error('Order creation failed:', error);
    return res.status(500).json({
      error: 'Không thể tạo đơn hàng',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
```

### Example 2: Safe Treatment Session Completion

```typescript
// pages/api/luot-tri-lieu.ts (PUT handler)
case 'PUT':
  const { maLuot, trangThai, ...updates } = req.body;

  if (!maLuot) {
    return res.status(400).json({ error: 'Mã lượt là bắt buộc' });
  }

  // Get current session data
  const sessions = await getAllRows(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu);
  const currentSession = sessions.find((s: LuotTriLieu) => s.maLuot === maLuot);

  if (!currentSession) {
    return res.status(404).json({ error: 'Lượt trị liệu không tồn tại' });
  }

  // ✅ Wrap in transaction
  try {
    await withTransaction(async (tx) => {
      // Step 1: Update session status
      await tx.update(
        SHEETS.LUOT_TRI_LIEU,
        mappingLuotTriLieu,
        'maLuot',
        maLuot,
        currentSession,
        { trangThai, ...updates }
      );

      // Step 2: Create commission records if completed
      if (trangThai === 'Hoàn thành') {
        // Calculate commissions (would need to implement this)
        const commissionData = calculateCommissions(currentSession);
        await tx.create(SHEETS.HOA_HONG, mappingHoaHong, commissionData);
      }
    });

    return res.status(200).json({ message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Session update failed:', error);
    return res.status(500).json({
      error: 'Không thể cập nhật lượt trị liệu',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
```

## Limitations

### Cannot Rollback DELETE Operations

Google Sheets API does not support "undelete". Once a row is deleted, it cannot be restored through the API.

**Workaround**: Instead of DELETE, use UPDATE to set a "deleted" flag:

```typescript
// ❌ BAD: Cannot be rolled back
await deleteRow(SHEETS.DON_HANG, mappingDonHang, 'maDonHang', orderId);

// ✅ GOOD: Soft delete can be rolled back
await updateRow(SHEETS.DON_HANG, mappingDonHang, 'maDonHang', orderId, {
  trangThai: 'Đã xóa',
  ngayXoa: new Date().toISOString()
});
```

### Race Conditions

If two requests modify the same data simultaneously, one transaction might roll back changes from another transaction.

**Mitigation**: Use appropriate locking mechanisms or retry logic for high-conflict operations.

### External Side Effects

Transactions only control Google Sheets operations. External side effects (sending emails, webhooks, etc.) cannot be rolled back.

**Best Practice**: Perform external side effects AFTER transaction commits:

```typescript
const result = await withTransaction(async (tx) => {
  await tx.create(SHEETS.DON_HANG, mappingDonHang, orderData);
  // Don't send email here!
  return orderData;
});

// ✅ Send email only after transaction succeeds
await sendOrderConfirmationEmail(result);
```

## Testing

### Test Rollback Behavior

```typescript
// Test that rollback works correctly
test('order creation rolls back on transaction failure', async () => {
  const mockFail = jest.fn().mockRejectedValue(new Error('Transaction API failed'));

  try {
    await withTransaction(async (tx) => {
      await tx.create(SHEETS.DON_HANG, mappingDonHang, orderData);
      await mockFail(); // Simulate failure in transaction creation
    });
  } catch (error) {
    // Transaction should have rolled back
  }

  // Verify order was NOT created
  const orders = await getAllRows(SHEETS.DON_HANG, mappingDonHang);
  expect(orders).not.toContain(expect.objectContaining({ maDonHang: orderData.maDonHang }));
});
```

## Migration Guide

### Step 1: Identify Critical Operations

Review your API routes for multi-step operations that need atomicity.

**Red flags:**
- Multiple `appendRow()` calls
- `appendRow()` followed by `updateRow()`
- Operations that create related records in different sheets

### Step 2: Wrap in Transactions

Convert dangerous patterns to safe patterns:

```typescript
// BEFORE
await appendRow(SHEETS.A, mappingA, dataA);
await appendRow(SHEETS.B, mappingB, dataB); // Might fail!

// AFTER
await withTransaction(async (tx) => {
  await tx.create(SHEETS.A, mappingA, dataA);
  await tx.create(SHEETS.B, mappingB, dataB);
});
```

### Step 3: Add Error Handling

Ensure proper error handling and user feedback:

```typescript
try {
  await withTransaction(async (tx) => {
    // ... operations
  });
  return res.status(200).json({ message: 'Success' });
} catch (error) {
  console.error('Transaction failed:', error);
  return res.status(500).json({
    error: 'Operation failed',
    details: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

### Step 4: Test Thoroughly

Test both success and failure paths:
- Happy path: All operations succeed
- Failure path: One operation fails, verify rollback
- Race conditions: Concurrent requests don't corrupt data

## Best Practices

1. ✅ **Always use transactions** for multi-step operations
2. ✅ **Keep transactions short** - don't hold them open for expensive operations
3. ✅ **Handle errors gracefully** - provide meaningful error messages to users
4. ✅ **Log transaction operations** - helps with debugging
5. ✅ **Test rollback behavior** - verify data integrity on failures
6. ✅ **Avoid DELETE operations** - use soft deletes instead
7. ✅ **Perform side effects after commit** - email, webhooks, etc.

## Monitoring

Add logging to track transaction health:

```typescript
// Log transaction metrics
console.log(`📊 Transaction stats:`, {
  operationCount: tx.getOperationCount(),
  status: tx.getStatus(),
  duration: Date.now() - startTime
});
```

Monitor for:
- High rollback rates (indicates system issues)
- Long transaction durations (performance problem)
- Frequent transaction failures (data validation issues)

## Future Improvements

1. **Pessimistic Locking**: Add row-level locking to prevent concurrent modifications
2. **Transaction History**: Store transaction logs for audit and debugging
3. **Automatic Retry**: Retry failed transactions with exponential backoff
4. **Distributed Transactions**: Extend to support operations across multiple services
5. **Real Rollback**: Implement true rollback by tracking row versions

## Support

For questions or issues with the transaction system:
1. Check logs for transaction operation details
2. Review `transactionManager.ts` source code
3. Contact: [Your Support Contact]

---

**Version**: 1.0.0
**Last Updated**: 2025-10-13
**Author**: Bác sỹ Lực / Claude Code
