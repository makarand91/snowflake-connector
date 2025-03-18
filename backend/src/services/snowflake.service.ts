import { createConnection, Connection } from 'snowflake-sdk';
import { snowflakeConfig } from '../config/snowflake.config';

class SnowflakeService {
  private connection: Connection | null = null;

  constructor() {
    this.initConnection();
  }

  private initConnection(): void {
    try {
      this.connection = createConnection({
        account: snowflakeConfig.account,
        username: snowflakeConfig.username,
        password: snowflakeConfig.password,
        warehouse: snowflakeConfig.warehouse,
        database: snowflakeConfig.database,
        schema: snowflakeConfig.schema,
        role: snowflakeConfig.role
      });

      this.connection.connect((err) => {
        if (err) {
          console.error('Unable to connect to Snowflake:', err);
          return;
        }
        console.log('Successfully connected to Snowflake!');
      });
    } catch (error) {
      console.error('Error initializing Snowflake connection:', error);
    }
  }

  public async executeQuery(query: string, binds: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.connection) {
        reject(new Error('Snowflake connection not established'));
        return;
      }

      this.connection.execute({
        sqlText: query,
        binds: binds,
        complete: (err, stmt) => {
          if (err) {
            console.error('Failed to execute statement due to the following error: ' + err.message);
            reject(err);
            return;
          }

          // Use streamRows to collect all rows
          let rows: any[] = [];
          stmt.streamRows()
            .on('error', (err: any) => {
              console.error('Error streaming rows:', err);
              reject(err);
            })
            .on('data', (row: any) => {
              rows.push(row);
            })
            .on('end', () => {
              resolve(rows);
            });
        }
      });
    });
  }

  public async getTableColumns(tableName: string): Promise<any[]> {
    const query = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE 
      FROM 
        INFORMATION_SCHEMA.COLUMNS 
      WHERE 
        TABLE_NAME = UPPER(?)
      ORDER BY 
        ORDINAL_POSITION
    `;
    
    return this.executeQuery(query, [tableName]);
  }

  public async getTableData(
    tableName: string, 
    selectedColumns: string[] = ['*'], 
    whereConditions: { column: string, operator: string, value: string }[] = [],
    limit: number = 100,
    offset: number = 0
  ): Promise<{ data: any[], totalCount: number }> {
    // Build the columns part of the query
    const columnsStr = selectedColumns.length > 0 && selectedColumns[0] !== '*' 
      ? selectedColumns.join(', ') 
      : '*';
    
    // Build the WHERE clause
    let whereClause = '';
    const binds: any[] = [];
    
    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.map((condition, index) => {
        binds.push(condition.value);
        return `${condition.column} ${condition.operator} ?`;
      }).join(' AND ');
    }
    
    // Query for data with pagination
    const dataQuery = `
      SELECT ${columnsStr}
      FROM ${tableName}
      ${whereClause}
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    // Query for total count
    const countQuery = `
      SELECT COUNT(*) as TOTAL_COUNT
      FROM ${tableName}
      ${whereClause}
    `;
    
    try {
      const [data, countResult] = await Promise.all([
        this.executeQuery(dataQuery, binds),
        this.executeQuery(countQuery, binds)
      ]);
      
      const totalCount = countResult[0]?.TOTAL_COUNT || 0;
      
      return {
        data,
        totalCount
      };
    } catch (error) {
      console.error('Error fetching table data:', error);
      throw error;
    }
  }

  public disconnect(): void {
    if (this.connection) {
      this.connection.destroy((err) => {
        if (err) {
          console.error('Error disconnecting from Snowflake:', err);
          return;
        }
        console.log('Disconnected from Snowflake');
        this.connection = null;
      });
    }
  }
}

// Export as singleton
export const snowflakeService = new SnowflakeService();
