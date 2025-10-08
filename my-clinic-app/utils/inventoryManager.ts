
// Inventory management utilities for updating stock quantities
import { getAllRows, updateRow, SHEETS } from './googleSheets';
import { mappingSanPham, SanPham } from './columnMapping';

interface ProductSale {
  maSanPham?: string;
  tenSanPham: string;
  soLuong: number;
}

export async function updateInventoryAfterSale(soldProducts: ProductSale[]): Promise<{
  success: boolean;
  errors: string[];
  updatedProducts: { maSanPham: string; oldStock: number; newStock: number; }[];
}> {
  console.log('📦 Starting inventory update for', soldProducts.length, 'products');

  const errors: string[] = [];
  const updatedProducts: { maSanPham: string; oldStock: number; newStock: number; }[] = [];

  try {
    // Get all products from Google Sheets
    const allProducts = await getAllRows(SHEETS.SAN_PHAM, mappingSanPham);
    console.log('📊 Found', allProducts.length, 'products in inventory');

    for (const soldProduct of soldProducts) {
      console.log('🔍 Processing sold product:', soldProduct.tenSanPham, 'qty:', soldProduct.soLuong);

      // Find the product in inventory
      let product: SanPham | undefined;

      // First try to match by product code if available
      if (soldProduct.maSanPham) {
        product = allProducts.find((p: SanPham) => p.maSanPham === soldProduct.maSanPham);
      }

      // If not found by code, try matching by name
      if (!product) {
        product = allProducts.find((p: SanPham) =>
          p.tenSanPham?.toLowerCase().trim() === soldProduct.tenSanPham?.toLowerCase().trim()
        );
      }

      if (!product) {
        console.log('⚠️ Product not found in inventory:', soldProduct.tenSanPham);
        errors.push(`Sản phẩm "${soldProduct.tenSanPham}" không tìm thấy trong kho`);
        continue;
      }

      const currentStock = parseInt(product.soLuongTon || '0');
      const soldQuantity = parseInt(soldProduct.soLuong.toString());
      const newStock = currentStock - soldQuantity;

      console.log(`📈 Product "${product.tenSanPham}": ${currentStock} - ${soldQuantity} = ${newStock}`);

      // Check if there's enough stock
      if (currentStock < soldQuantity) {
        console.log('❌ Insufficient stock for:', product.tenSanPham);
        errors.push(`Sản phẩm "${product.tenSanPham}" không đủ hàng (còn ${currentStock}, cần ${soldQuantity})`);
        continue;
      }

      // Update the inventory
      try {
        const updateSuccess = await updateRow(
          SHEETS.SAN_PHAM,
          mappingSanPham,
          'maSanPham',
          product.maSanPham,
          { soLuongTon: newStock.toString() }
        );

        if (updateSuccess) {
          console.log('✅ Updated inventory for:', product.tenSanPham);
          updatedProducts.push({
            maSanPham: product.maSanPham,
            oldStock: currentStock,
            newStock: newStock
          });
        } else {
          errors.push(`Không thể cập nhật số lượng cho "${product.tenSanPham}"`);
        }
      } catch (updateError) {
        console.error('❌ Error updating inventory for', product.tenSanPham, ':', updateError);
        errors.push(`Lỗi cập nhật "${product.tenSanPham}": ${updateError}`);
      }
    }

    const success = errors.length === 0;
    console.log('📦 Inventory update completed:', success ? 'SUCCESS' : 'WITH ERRORS');
    console.log('✅ Updated products:', updatedProducts.length);
    console.log('❌ Errors:', errors.length);

    return {
      success,
      errors,
      updatedProducts
    };

  } catch (error) {
    console.error('❌ Fatal error in inventory update:', error);
    return {
      success: false,
      errors: [`Lỗi hệ thống: ${error instanceof Error ? error.message : 'Unknown error'}`],
      updatedProducts: []
    };
  }
}

export function parseProductsFromOrder(danhSachSanPham: string): ProductSale[] {
  try {
    const products = JSON.parse(danhSachSanPham || '[]');
    console.log('🛒 Parsing products from order:', products);

    return products.filter((item: any) => {
      // Filter out treatment entries, keep only actual products
      const isProduct = item.maSanPham ||
                       (item.tenSanPham && !item.tenSanPham.includes('Liệu trình'));

      if (isProduct) {
        console.log('✅ Valid product:', item.tenSanPham, 'qty:', item.soLuong);
      } else {
        console.log('⏭️ Skipping non-product:', item.tenSanPham);
      }

      return isProduct;
    }).map((item: any) => ({
      maSanPham: item.maSanPham,
      tenSanPham: item.tenSanPham,
      soLuong: parseInt(item.soLuong || '1')
    }));
  } catch (error) {
    console.error('❌ Error parsing products from order:', error);
    return [];
  }
}