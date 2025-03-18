import express from 'express';
import { queryBuilderController } from '../controllers/query-builder.controller';

const router = express.Router();

// Get all tables
router.get('/tables', queryBuilderController.getTables);

// Get columns for a specific table
router.get('/tables/:tableName/columns', queryBuilderController.getTableColumns);

// Get sample data from a table
router.get('/tables/:tableName/sample', queryBuilderController.getSampleData);

// Execute query with filters
router.post('/query', queryBuilderController.executeQuery);

// Execute custom SQL query
router.post('/custom-query', queryBuilderController.executeCustomQuery);

export default router;
