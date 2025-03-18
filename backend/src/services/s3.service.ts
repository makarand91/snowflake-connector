import { S3 } from 'aws-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export const s3Config: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || '',
  bucket: process.env.S3_BUCKET || ''
};

class S3Service {
  private s3: S3;

  constructor() {
    this.s3 = new S3({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region
    });
  }

  public async uploadData(data: any, fileName: string): Promise<string> {
    const params = {
      Bucket: s3Config.bucket,
      Key: fileName,
      Body: JSON.stringify(data),
      ContentType: 'application/json'
    };

    try {
      const result = await this.s3.upload(params).promise();
      console.log(`Successfully uploaded data to ${result.Location}`);
      return result.Location;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  public async uploadFile(filePath: string, fileName: string): Promise<string> {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: s3Config.bucket,
      Key: fileName,
      Body: fileContent,
      ContentType: this.getContentType(filePath)
    };

    try {
      const result = await this.s3.upload(params).promise();
      console.log(`Successfully uploaded file to ${result.Location}`);
      return result.Location;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  public async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: s3Config.bucket,
      Key: key,
      Expires: expiresIn
    };

    try {
      const url = await this.s3.getSignedUrlPromise('getObject', params);
      console.log(`Generated signed URL for ${key} with ${expiresIn}s expiry`);
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const contentTypes: {[key: string]: string} = {
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

export const s3Service = new S3Service();
