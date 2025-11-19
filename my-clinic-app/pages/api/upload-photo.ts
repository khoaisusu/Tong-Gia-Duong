import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser for file upload
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const fileName = Array.isArray(fields.fileName) ? fields.fileName[0] : fields.fileName;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate safe filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalFilename || '.jpg');
    const finalFileName = fileName || `photo_${timestamp}${ext}`;
    const safeFinalFileName = finalFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');

    // Save file to public/uploads
    const destinationPath = path.join(uploadsDir, safeFinalFileName);
    fs.copyFileSync(file.filepath, destinationPath);

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    // Generate public URL
    const publicUrl = `/uploads/${safeFinalFileName}`;

    console.log('✅ Uploaded file locally:', {
      fileName: safeFinalFileName,
      path: destinationPath,
      url: publicUrl,
    });

    return res.status(200).json({
      success: true,
      fileName: safeFinalFileName,
      url: publicUrl,
    });

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
