import { Request, Response } from 'express';
import { snowflakeService } from '../services/snowflake.service';

export interface QueryCondition {
  column: string;
  operator: string;
  value: string;
}

export interface QueryOptions {
  tableName: string;
  selectedColumns: string[];
  whereConditions: QueryCondition[];
  limit: number;
  offset: number;
}

class QueryBuilderController {
  // Get all available tables
  public async getTables(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT 
          TABLE_NAME 
        FROM 
          INFORMATION_SCHEMA.TABLES 
        WHERE 
          TABLE_SCHEMA = CURRENT_SCHEMA()
        ORDER BY 
          TABLE_NAME
      `;
      
      const tables = await snowflakeService.executeQuery(query);
      res.status(200).json(tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      res.status(500).json({ error: 'Failed to fetch tables' });
    }
  }

  // Get columns for a specific table
  public async getTableColumns(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const columns = await snowflakeService.getTableColumns(tableName);
      res.status(200).json(columns);
    } catch (error) {
      console.error('Error fetching columns:', error);
      res.status(500).json({ error: 'Failed to fetch columns' });
    }
  }

  // Execute a query with filters
  public async executeQuery(req: Request, res: Response): Promise<void> {
    try {
      const { 
        tableName, 
        selectedColumns = ['*'], 
        whereConditions = [],
        limit = 100,
        offset = 0
      } = req.body as QueryOptions;
      
      if (!tableName) {
        res.status(400).json({ error: 'Table name is required' });
        return;
      }
      
      // Validate operators to prevent SQL injection
      const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'];
      
      for (const condition of whereConditions) {
        if (!validOperators.includes(condition.operator)) {
          res.status(400).json({ error: `Invalid operator: ${condition.operator}` });
          return;
        }
      }
      
      const result = await snowflakeService.getTableData(
        tableName,
        selectedColumns,
        whereConditions,
        limit,
        offset
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Failed to execute query' });
    }
  }

  // Build and execute a custom SQL query
  public async executeCustomQuery(req: Request, res: Response): Promise<void> {
    try {
      const { sqlQuery, binds = [] } = req.body;
      
      if (!sqlQuery) {
        res.status(400).json({ error: 'SQL query is required' });
        return;
      }
      
      // Simple SQL injection prevention - block multiple statements and dangerous keywords
      const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE', 'GRANT', 'REVOKE'];
      const hasDangerousKeywords = dangerousKeywords.some(keyword => 
        sqlQuery.toUpperCase().includes(keyword)
      );
      
      if (sqlQuery.includes(';') || hasDangerousKeywords) {
        res.status(403).json({ error: 'Potentially harmful SQL query detected' });
        return;
      }
      
      const result = await snowflakeService.executeQuery(sqlQuery, binds);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error executing custom query:', error);
      res.status(500).json({ error: 'Failed to execute custom query' });
    }
  }

  // Get sample data from a table
  public async getSampleData(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const { limit = 10 } = req.query;
      
      if (!tableName) {
        res.status(400).json({ error: 'Table name is required' });
        return;
      }
      
      const query = `SELECT * FROM ${tableName} LIMIT ${limit}`;
      const result = await snowflakeService.executeQuery(query);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching sample data:', error);
      res.status(500).json({ error: 'Failed to fetch sample data' });
    }
  }
}

export const queryBuilderController = new QueryBuilderController();
