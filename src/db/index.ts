/**
 * Database Connection & Utilities for Brivia Eats
 * 
 * This module provides:
 * - Database connection pool management
 * - Query helpers
 * - Transaction support
 * - Type-safe query builders
 * 
 * Usage:
 *   import { db, sql } from '@/db';
 *   const restaurants = await db.query<DbRestaurant>('SELECT * FROM restaurants WHERE status = $1', ['active']);
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Re-export all types
export * from './types';

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;         // Maximum pool size
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

function getConfig(): DatabaseConfig {
  // Prefer connection string if available
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
    };
  }

  // Fall back to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'brivia_eats',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
  };
}

// =============================================================================
// CONNECTION POOL
// =============================================================================

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(getConfig());
    
    // Log connection errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }
  return pool;
}

// =============================================================================
// DATABASE CLIENT
// =============================================================================

export interface QueryOptions {
  timeout?: number;
}

export const db = {
  /**
   * Execute a query and return all rows
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<T[]> {
    const pool = getPool();
    const result: QueryResult<T> = await pool.query({
      text,
      values: params,
      ...(options?.timeout && { query_timeout: options.timeout }),
    });
    return result.rows;
  },

  /**
   * Execute a query and return the first row or null
   */
  async queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<T | null> {
    const rows = await this.query<T>(text, params, options);
    return rows[0] ?? null;
  },

  /**
   * Execute a query and return the first row, throwing if not found
   */
  async queryOneOrThrow<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<T> {
    const row = await this.queryOne<T>(text, params, options);
    if (!row) {
      throw new Error('Expected exactly one row, but found none');
    }
    return row;
  },

  /**
   * Execute a query and return the count of affected rows
   */
  async execute(
    text: string,
    params?: unknown[],
    options?: QueryOptions
  ): Promise<number> {
    const pool = getPool();
    const result = await pool.query({
      text,
      values: params,
      ...(options?.timeout && { query_timeout: options.timeout }),
    });
    return result.rowCount ?? 0;
  },

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return getPool().connect();
  },

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(
    callback: (client: TransactionClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    const txClient = new TransactionClient(client);
    
    try {
      await client.query('BEGIN');
      const result = await callback(txClient);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Close all connections in the pool
   */
  async end(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },

  /**
   * Health check - verify database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  },
};

// =============================================================================
// TRANSACTION CLIENT
// =============================================================================

class TransactionClient {
  constructor(private client: PoolClient) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result: QueryResult<T> = await this.client.query(text, params);
    return result.rows;
  }

  async queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  async execute(text: string, params?: unknown[]): Promise<number> {
    const result = await this.client.query(text, params);
    return result.rowCount ?? 0;
  }
}

export type { TransactionClient };

// =============================================================================
// SQL TEMPLATE HELPERS
// =============================================================================

/**
 * Tagged template literal for SQL queries with parameter interpolation
 * 
 * Usage:
 *   const { text, values } = sql`SELECT * FROM dishes WHERE menu_id = ${menuId} AND status = ${status}`;
 *   const dishes = await db.query(text, values);
 */
export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): { text: string; values: unknown[] } {
  const text = strings.reduce((acc, str, i) => {
    return acc + str + (i < values.length ? `$${i + 1}` : '');
  }, '');
  return { text, values };
}

/**
 * Build an INSERT statement with RETURNING
 */
export function buildInsert<T extends Record<string, unknown>>(
  table: string,
  data: T,
  returning: string = '*'
): { text: string; values: unknown[] } {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');
  
  return {
    text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING ${returning}`,
    values,
  };
}

/**
 * Build an UPDATE statement
 */
export function buildUpdate<T extends Record<string, unknown>>(
  table: string,
  data: T,
  whereClause: string,
  whereValues: unknown[],
  returning: string = '*'
): { text: string; values: unknown[] } {
  const keys = Object.keys(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const updateValues = Object.values(data);
  
  // Offset where clause placeholders
  const offsetWhereClause = whereClause.replace(
    /\$(\d+)/g,
    (_, num) => `$${parseInt(num, 10) + keys.length}`
  );
  
  return {
    text: `UPDATE ${table} SET ${setClause} WHERE ${offsetWhereClause} RETURNING ${returning}`,
    values: [...updateValues, ...whereValues],
  };
}

// =============================================================================
// COMMON QUERIES
// =============================================================================

export const queries = {
  // Published menu lookup (the main public query)
  getPublishedMenu: `
    SELECT 
      ms.*,
      pm.published_at as current_published_at
    FROM published_menus pm
    JOIN menu_snapshots ms ON ms.id = pm.current_snapshot_id
    WHERE pm.restaurant_id = $1
  `,

  getPublishedDishes: `
    SELECT ds.*
    FROM dish_snapshots ds
    WHERE ds.menu_snapshot_id = $1
    ORDER BY ds.section_id, ds.sort_order
  `,

  // Working table queries (for admin/editing)
  getRestaurantById: `
    SELECT * FROM restaurants WHERE id = $1
  `,

  getMenusByRestaurant: `
    SELECT * FROM menus WHERE restaurant_id = $1 ORDER BY created_at DESC
  `,

  getDishesByMenu: `
    SELECT d.*, 
      COALESCE(
        json_agg(di.* ORDER BY di.sort_order) FILTER (WHERE di.id IS NOT NULL),
        '[]'
      ) as ingredients
    FROM dishes d
    LEFT JOIN dish_ingredients di ON di.dish_id = d.id
    WHERE d.menu_id = $1
    GROUP BY d.id
    ORDER BY d.created_at
  `,

  // Snapshot queries
  getMenuSnapshots: `
    SELECT * FROM menu_snapshots 
    WHERE menu_id = $1 
    ORDER BY version DESC
  `,

  // Change log
  logChange: `
    INSERT INTO change_logs (entity_type, entity_id, changed_by, changed_fields, before_snapshot, after_snapshot, reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `,
};
