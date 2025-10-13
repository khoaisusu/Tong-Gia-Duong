import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  getAllRows,
  appendRow,
  deleteRow,
  SHEETS,
  generateId,
} from '../../utils/googleSheets';
import { mappingChiTietDichVuThem, ChiTietDichVuThem } from '../../utils/columnMapping';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Get additional service details
      // Support filtering by maLuot
      const { maLuot } = req.query;

      const allDetails = await getAllRows(
        SHEETS.CHI_TIET_DICH_VU_THEM,
        mappingChiTietDichVuThem
      );

      // Filter by maLuot if provided
      if (maLuot && typeof maLuot === 'string') {
        const filtered = allDetails.filter(
          (detail: ChiTietDichVuThem) => detail.maLuot === maLuot
        );
        return res.status(200).json(filtered);
      }

      return res.status(200).json(allDetails);
    } else if (req.method === 'POST') {
      // Add new additional service detail
      const newDetail: Partial<ChiTietDichVuThem> = req.body;

      // Generate ID if not provided
      const detailData = {
        ...newDetail,
        maChiTiet: newDetail.maChiTiet || generateId('CTDVT'),
      };

      await appendRow(SHEETS.CHI_TIET_DICH_VU_THEM, mappingChiTietDichVuThem, detailData);

      return res.status(201).json(detailData);
    } else if (req.method === 'DELETE') {
      // Delete additional service detail by ID
      const { maChiTiet } = req.query;

      if (!maChiTiet || typeof maChiTiet !== 'string') {
        return res.status(400).json({ error: 'maChiTiet is required' });
      }

      const deleted = await deleteRow(
        SHEETS.CHI_TIET_DICH_VU_THEM,
        mappingChiTietDichVuThem,
        'maChiTiet',
        maChiTiet
      );

      if (!deleted) {
        return res.status(404).json({ error: 'Detail not found' });
      }

      return res.status(200).json({ success: true });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
