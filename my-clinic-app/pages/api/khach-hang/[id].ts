import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { 
  getRowById,
  updateRow,
  deleteRow,
  SHEETS 
} from '../../../utils/googleSheets';
import { mappingKhachHang, KhachHang } from '../../../utils/columnMapping';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid customer ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get single customer
        const customer = await getRowById(
          SHEETS.KHACH_HANG, 
          mappingKhachHang, 
          'maKhachHang', 
          id
        );
        
        if (!customer) {
          return res.status(404).json({ error: 'Khách hàng không tồn tại' });
        }
        
        return res.status(200).json(customer);

      case 'PUT':
        // Update customer
        const updates = req.body as Partial<KhachHang>;
        
        // Check if customer exists
        const existingCustomer = await getRowById(
          SHEETS.KHACH_HANG,
          mappingKhachHang,
          'maKhachHang',
          id
        );
        
        if (!existingCustomer) {
          return res.status(404).json({ error: 'Khách hàng không tồn tại' });
        }

        const updated = await updateRow(
          SHEETS.KHACH_HANG,
          mappingKhachHang,
          'maKhachHang',
          id,
          updates
        );
        
        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật khách hàng' });
        }
        
        return res.status(200).json({ 
          message: 'Cập nhật khách hàng thành công',
          data: { ...existingCustomer, ...updates }
        });

      case 'DELETE':
        // Check if user is admin
        if (!session || session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền xóa khách hàng' 
          });
        }

        // Check if customer exists
        const customerToDelete = await getRowById(
          SHEETS.KHACH_HANG,
          mappingKhachHang,
          'maKhachHang',
          id
        );
        
        if (!customerToDelete) {
          return res.status(404).json({ error: 'Khách hàng không tồn tại' });
        }

        const deleted = await deleteRow(
          SHEETS.KHACH_HANG,
          mappingKhachHang,
          'maKhachHang',
          id
        );
        
        if (!deleted) {
          return res.status(500).json({ error: 'Không thể xóa khách hàng' });
        }
        
        return res.status(200).json({ 
          message: 'Xóa khách hàng thành công' 
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
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