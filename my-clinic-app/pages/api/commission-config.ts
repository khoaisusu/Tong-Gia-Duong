import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import {
  getAllRows,
  updateRow,
  SHEETS
} from '../../utils/googleSheets';
import { mappingDichVu, DichVu } from '../../utils/columnMapping';
import { validateCommissionRates } from '../../utils/commissionCalculator';

// Check if user has admin privileges
function isAdmin(session: any): boolean {
  // You may need to adjust this based on your user role system
  return session?.user?.role === 'admin' ||
         session?.user?.email === 'admin@tongiaduong.com' ||
         session?.user?.name?.toLowerCase().includes('admin');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check admin privileges
  if (!isAdmin(session)) {
    return res.status(403).json({
      error: 'Forbidden: Only administrators can manage commission rates'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all services with commission rates
        const services = await getAllRows(SHEETS.DICH_VU, mappingDichVu);

        const servicesWithCommission = services.map((service: DichVu) => ({
          maDichVu: service.maDichVu,
          tenDichVu: service.tenDichVu,
          loaiDichVu: service.loaiDichVu,
          giaDichVu: parseFloat(service.giaDichVu || '0'),
          hoaHongPercent: parseFloat(service.hoaHongPercent || '0'),
          trangThai: service.trangThai
        }));

        console.log('📊 Retrieved', servicesWithCommission.length, 'services with commission data');
        return res.status(200).json(servicesWithCommission);

      case 'PUT':
        // Update commission rate for a specific service
        const { maDichVu, hoaHongPercent } = req.body;

        if (!maDichVu || hoaHongPercent === undefined) {
          return res.status(400).json({
            error: 'Service ID and commission rate are required'
          });
        }

        // Validate commission rate
        const commissionRate = parseFloat(hoaHongPercent);
        const validationErrors = validateCommissionRates(commissionRate);

        if (validationErrors.length > 0) {
          return res.status(400).json({
            error: 'Invalid commission rate',
            details: validationErrors
          });
        }

        // Update the service commission rate
        const updateSuccess = await updateRow(
          SHEETS.DICH_VU,
          mappingDichVu,
          'maDichVu',
          maDichVu,
          { hoaHongPercent: commissionRate.toString() }
        );

        if (updateSuccess) {
          console.log(`✅ Updated commission rate for service ${maDichVu}: ${commissionRate}%`);
          return res.status(200).json({
            message: 'Commission rate updated successfully',
            data: { maDichVu, hoaHongPercent: commissionRate }
          });
        } else {
          return res.status(500).json({
            error: 'Failed to update commission rate'
          });
        }

      case 'POST':
        // Batch update multiple commission rates
        const { updates } = req.body;

        if (!Array.isArray(updates)) {
          return res.status(400).json({
            error: 'Updates must be an array of { maDichVu, hoaHongPercent }'
          });
        }

        const results = [];
        const errors = [];

        for (const update of updates) {
          try {
            const { maDichVu, hoaHongPercent } = update;

            if (!maDichVu || hoaHongPercent === undefined) {
              errors.push(`Missing data for service ${maDichVu}`);
              continue;
            }

            const rate = parseFloat(hoaHongPercent);
            const validationErrors = validateCommissionRates(rate);

            if (validationErrors.length > 0) {
              errors.push(`Service ${maDichVu}: ${validationErrors.join(', ')}`);
              continue;
            }

            const success = await updateRow(
              SHEETS.DICH_VU,
              mappingDichVu,
              'maDichVu',
              maDichVu,
              { hoaHongPercent: rate.toString() }
            );

            if (success) {
              results.push({ maDichVu, hoaHongPercent: rate, status: 'success' });
              console.log(`✅ Batch updated commission for ${maDichVu}: ${rate}%`);
            } else {
              errors.push(`Failed to update service ${maDichVu}`);
            }

          } catch (error) {
            errors.push(`Error updating service ${update.maDichVu}: ${error}`);
          }
        }

        return res.status(200).json({
          message: 'Batch update completed',
          successful: results.length,
          failed: errors.length,
          results,
          errors
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('❌ Commission config API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}