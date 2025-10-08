import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  POSITION_SALARY_CONFIGS,
  PositionSalaryConfig,
  validatePositionConfig,
  getPositionSalaryConfig
} from '../../utils/positionSalaryConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin can manage position salary config
  if (session.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Chỉ Admin mới có quyền quản lý cấu hình lương theo chức vụ' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all position salary configurations
        const { chucVu } = req.query;

        if (chucVu) {
          // Get specific position config
          const config = getPositionSalaryConfig(chucVu as string);
          if (!config) {
            return res.status(404).json({ error: 'Không tìm thấy cấu hình cho chức vụ này' });
          }
          return res.status(200).json(config);
        }

        // Return all configs
        return res.status(200).json(POSITION_SALARY_CONFIGS);

      case 'POST':
        // Add new position salary config (this would require persisting to database/file)
        const newConfig = req.body as PositionSalaryConfig;

        const validationErrors = validatePositionConfig(newConfig);
        if (validationErrors.length > 0) {
          return res.status(400).json({
            error: 'Dữ liệu không hợp lệ',
            details: validationErrors
          });
        }

        // Check if position already exists
        const existingConfig = getPositionSalaryConfig(newConfig.chucVu);
        if (existingConfig) {
          return res.status(400).json({
            error: 'Chức vụ này đã có cấu hình'
          });
        }

        console.log('ℹ️ Note: Position salary config is currently read-only from code');
        console.log('📝 To add new position, update POSITION_SALARY_CONFIGS in positionSalaryConfig.ts');

        return res.status(501).json({
          error: 'Chức năng này hiện đang được cấu hình trong code',
          message: 'Vui lòng cập nhật file positionSalaryConfig.ts để thêm chức vụ mới'
        });

      case 'PUT':
        // Update position salary config (this would require persisting to database/file)
        const { chucVu: positionToUpdate } = req.body;

        if (!positionToUpdate) {
          return res.status(400).json({ error: 'Chức vụ là bắt buộc' });
        }

        console.log('ℹ️ Note: Position salary config is currently read-only from code');
        console.log('📝 To update position, modify POSITION_SALARY_CONFIGS in positionSalaryConfig.ts');

        return res.status(501).json({
          error: 'Chức năng này hiện đang được cấu hình trong code',
          message: 'Vui lòng cập nhật file positionSalaryConfig.ts để sửa cấu hình chức vụ'
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('❌ Position salary config API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
