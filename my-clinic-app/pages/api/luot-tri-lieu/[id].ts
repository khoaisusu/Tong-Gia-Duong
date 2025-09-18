import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  updateRow,
  getRowById,
  SHEETS
} from '../../../utils/googleSheets';
import {
  mappingLuotTriLieu,
  LuotTriLieu
} from '../../../utils/columnMapping';

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
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    console.log('Treatment session API called:', {
      method: req.method,
      id: id,
      body: req.body
    });

    switch (req.method) {
      case 'GET':
        // Get specific treatment session
        const session = await getRowById(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu, 'maLuot', id);
        if (!session) {
          return res.status(404).json({ error: 'Treatment session not found' });
        }
        return res.status(200).json(session);

      case 'PUT':
        // Update treatment session
        const updateData = req.body;

        // Validate required fields for status update
        if (updateData.trangThai && !['Đã lên lịch', 'Đã xác nhận', 'Hoàn thành', 'Hủy'].includes(updateData.trangThai)) {
          return res.status(400).json({ error: 'Invalid status value' });
        }

        // Get current session data to merge with updates
        const currentSession = await getRowById(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu, 'maLuot', id);
        if (!currentSession) {
          return res.status(404).json({ error: 'Treatment session not found' });
        }

        const result = await updateRow(SHEETS.LUOT_TRI_LIEU, mappingLuotTriLieu, 'maLuot', id, updateData);

        if (!result) {
          return res.status(500).json({ error: 'Failed to update treatment session' });
        }

        return res.status(200).json(result);

      case 'DELETE':
        // Delete treatment session (optional - may want to just mark as cancelled instead)
        // For now, we'll mark as cancelled rather than delete
        const cancelledSession = await updateRow(
          SHEETS.LUOT_TRI_LIEU,
          mappingLuotTriLieu,
          'maLuot',
          id,
          { trangThai: 'Hủy' }
        );

        if (!cancelledSession) {
          return res.status(500).json({ error: 'Failed to cancel treatment session' });
        }

        return res.status(200).json({ message: 'Treatment session cancelled successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Treatment session API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      id: id,
      method: req.method,
      body: req.body
    });
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}