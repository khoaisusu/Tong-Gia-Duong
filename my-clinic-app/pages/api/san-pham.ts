import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { 
  getAllRows, 
  appendRow,
  updateRow,
  deleteRow,
  SHEETS,
  generateId
} from '../../utils/googleSheets';
import { mappingSanPham, SanPham } from '../../utils/columnMapping';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  // Temporary disable auth check for debugging
  // if (!session) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    switch (req.method) {
      case 'GET':
        // Get all products
        const products = await getAllRows(SHEETS.SAN_PHAM, mappingSanPham);
        return res.status(200).json(products);

      case 'POST':
        // Only admin can create products
        if (!session || session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền thêm sản phẩm' 
          });
        }

        const newProduct = req.body as Partial<SanPham>;
        
        // Validate required fields
        if (!newProduct.tenSanPham || !newProduct.giaBan) {
          return res.status(400).json({ 
            error: 'Tên sản phẩm và giá bán là bắt buộc' 
          });
        }

        // Add metadata
        const productData = {
          ...newProduct,
          maSanPham: generateId('SP'),
          soLuongTon: newProduct.soLuongTon || '0',
          trangThai: newProduct.trangThai || 'Còn hàng',
        };

        await appendRow(SHEETS.SAN_PHAM, mappingSanPham, productData);
        
        return res.status(201).json({ 
          message: 'Thêm sản phẩm thành công',
          data: productData 
        });

      case 'PUT':
        // Only admin can update products
        if (!session || session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền cập nhật sản phẩm' 
          });
        }

        const { maSanPham, ...updates } = req.body;
        
        if (!maSanPham) {
          return res.status(400).json({ error: 'Mã sản phẩm là bắt buộc' });
        }

        const updated = await updateRow(
          SHEETS.SAN_PHAM,
          mappingSanPham,
          'maSanPham',
          maSanPham,
          updates
        );
        
        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật sản phẩm' });
        }
        
        return res.status(200).json({ 
          message: 'Cập nhật sản phẩm thành công' 
        });

      case 'DELETE':
        // Only admin can delete products
        if (!session || session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền xóa sản phẩm' 
          });
        }

        const { id } = req.query;
        
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Mã sản phẩm không hợp lệ' });
        }

        const deleted = await deleteRow(
          SHEETS.SAN_PHAM,
          mappingSanPham,
          'maSanPham',
          id
        );
        
        if (!deleted) {
          return res.status(500).json({ error: 'Không thể xóa sản phẩm' });
        }
        
        return res.status(200).json({ 
          message: 'Xóa sản phẩm thành công' 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi xử lý dữ liệu',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}