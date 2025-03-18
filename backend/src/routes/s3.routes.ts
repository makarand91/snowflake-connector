import express, { Request, Response } from 'express';
import { s3Service } from '../services/s3.service';
import { snowflakeService } from '../services/snowflake.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Export query results to S3
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { 
      tableName, 
      selectedColumns, 
      whereConditions 
    } = req.body;
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    // Get all data without pagination for export
    const result = await snowflakeService.getTableData(
      tableName,
      selectedColumns,
      whereConditions,
      10000, // Higher limit for export
      0
    );
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const fileName = `export_${tableName}_${timestamp}.json`;
    
    // Upload to S3
    const s3Url = await s3Service.uploadData(result.data, fileName);
    
    // Generate a signed URL for download
    const signedUrl = await s3Service.generateSignedUrl(fileName, 3600); // 1 hour expiry
    
    res.status(200).json({ 
      message: 'Data exported successfully',
      fileName,
      downloadUrl: signedUrl,
      totalRecords: result.totalCount
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Upload file to S3
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const timestamp = new Date().getTime();
    const fileName = `upload_${timestamp}_${originalName}`;
    
    // Upload to S3
    const s3Url = await s3Service.uploadFile(filePath, fileName);
    
    // Generate a signed URL for download
    const signedUrl = await s3Service.generateSignedUrl(fileName, 3600); // 1 hour expiry
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    res.status(200).json({ 
      message: 'File uploaded successfully',
      fileName,
      downloadUrl: signedUrl
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get signed URL for existing file
router.get('/download/:fileName', async (req: Request, res: Response) => {
  try {
    const { fileName } = req.params;
    const { expiresIn } = req.query;
    
    const expiry = expiresIn ? parseInt(expiresIn as string) : 3600;
    
    const signedUrl = await s3Service.generateSignedUrl(fileName, expiry);
    
    res.status(200).json({ 
      fileName,
      downloadUrl: signedUrl
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

export default router;
