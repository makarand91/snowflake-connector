import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { snowflakeService } from './services/snowflake.service';
import queryBuilderRoutes from './routes/query-builder.routes';
import s3Routes from './routes/s3.routes';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Use query builder routes
app.use('/api', queryBuilderRoutes);

// Use S3 routes
app.use('/api/s3', s3Routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  snowflakeService.disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  snowflakeService.disconnect();
  process.exit(0);
});
