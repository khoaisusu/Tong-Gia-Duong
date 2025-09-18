import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { 
  getAllRows, 
  appendRow,
  SHEETS 
} from '../../utils/googleSheets';
import { mappingGiaoDich, GiaoDich } from '../../utils/columnMapping';

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
    switch (req.method) {
      case 'GET':
        // Get all transactions
        const transactions = await getAllRows(SHEETS.GIAO_DICH, mappingGiaoDich);
        
        // Apply filters if provided
        const { startDate, endDate, customerId, type } = req.query;
        
        let filteredTransactions = transactions;
        
        if (startDate) {
          filteredTransactions = filteredTransactions.filter((t: GiaoDich) => 
            new Date(t.ngayGiaoDich) >= new Date(startDate as string)
          );
        }
        
        if (endDate) {
          filteredTransactions = filteredTransactions.filter((t: GiaoDich) => 
            new Date(t.ngayGiaoDich) <= new Date(endDate as string)
          );
        }
        
        if (customerId) {
          filteredTransactions = filteredTransactions.filter((t: GiaoDich) => 
            t.maKhachHang === customerId
          );
        }
        
        if (type) {
          filteredTransactions = filteredTransactions.filter((t: GiaoDich) => 
            t.loaiGiaoDich === type
          );
        }
        
        // Sort by date (newest first)
        filteredTransactions.sort((a: GiaoDich, b: GiaoDich) => 
          new Date(b.ngayGiaoDich).getTime() - new Date(a.ngayGiaoDich).getTime()
        );
        
        return res.status(200).json(filteredTransactions);

      case 'POST':
        // Create new transaction
        const newTransaction = req.body as Partial<GiaoDich>;
        
        // Validate required fields
        if (!newTransaction.soTien || !newTransaction.loaiGiaoDich) {
          return res.status(400).json({ 
            error: 'Số tiền và loại giao dịch là bắt buộc' 
          });
        }

        // Add metadata
        const transactionData = {
          ...newTransaction,
          ngayGiaoDich: newTransaction.ngayGiaoDich || new Date().toISOString().split('T')[0],
          trangThai: newTransaction.trangThai || 'Hoàn thành',
          nhanVienXuLy: session.user?.name || session.user?.email || '',
        };

        await appendRow(SHEETS.GIAO_DICH, mappingGiaoDich, transactionData);
        
        return res.status(201).json({ 
          message: 'Tạo giao dịch thành công',
          data: transactionData 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
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