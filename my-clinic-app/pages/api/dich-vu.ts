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
import { mappingDichVu, DichVu } from '../../utils/columnMapping';

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
        // Get all services
        const services = await getAllRows(SHEETS.DICH_VU, mappingDichVu);
        return res.status(200).json(services);

      case 'POST':
        // Only admin can create services
        if (!session || session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền thêm dịch vụ' 
          });
        }

        const newService = req.body as Partial<DichVu>;
        
        // Validate required fields
        if (!newService.tenDichVu || !newService.giaDichVu) {
          return res.status(400).json({ 
            error: 'Tên dịch vụ và giá là bắt buộc' 
          });
        }

        // Add metadata
        const serviceData = {
          ...newService,
          maDichVu: generateId('DV'),
          trangThai: newService.trangThai || 'Hoạt động',
        };

        await appendRow(SHEETS.DICH_VU, mappingDichVu, serviceData);
        
        return res.status(201).json({ 
          message: 'Thêm dịch vụ thành công',
          data: serviceData 
        });

      case 'PUT':
        // Only admin can update services
        if (!session || session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền cập nhật dịch vụ' 
          });
        }

        const { maDichVu, ...updates } = req.body;
        
        if (!maDichVu) {
          return res.status(400).json({ error: 'Mã dịch vụ là bắt buộc' });
        }

        const updated = await updateRow(
          SHEETS.DICH_VU,
          mappingDichVu,
          'maDichVu',
          maDichVu,
          updates
        );
        
        if (!updated) {
          return res.status(500).json({ error: 'Không thể cập nhật dịch vụ' });
        }
        
        return res.status(200).json({ 
          message: 'Cập nhật dịch vụ thành công' 
        });

      case 'DELETE':
        // Only admin can delete services
        if (!session || session.user?.role !== 'Admin') {
          return res.status(403).json({ 
            error: 'Chỉ quản trị viên mới có quyền xóa dịch vụ' 
          });
        }

        const { id } = req.query;
        
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Mã dịch vụ không hợp lệ' });
        }

        const deleted = await deleteRow(
          SHEETS.DICH_VU,
          mappingDichVu,
          'maDichVu',
          id
        );
        
        if (!deleted) {
          return res.status(500).json({ error: 'Không thể xóa dịch vụ' });
        }
        
        return res.status(200).json({ 
          message: 'Xóa dịch vụ thành công' 
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