import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../core/logger';

dotenv.config();

/**
 * Database Service Singleton
 * traces: FR-04, ADR-005, ADR-008, PRD §7.1
 * Manages pgvector persistence for agent memory and semantic cache.
 */
export class DbService {
  private static instance: DbService;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres_password@localhost:5432/moa_moe_db'
    });
  }

  public static getInstance(): DbService {
    if (!DbService.instance) {
      DbService.instance = new DbService();
    }
    return DbService.instance;
  }

  /**
   * Save a memory entry with embedding
   * traces: FR-04
   */
  public async saveMemory(content: string, embedding: number[], metadata: any = {}): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        INSERT INTO agent_memory (content, embedding, metadata)
        VALUES ($1, $2, $3)
      `;
      await client.query(query, [content, JSON.stringify(embedding), metadata]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err }, '[DbService] Transaction failed. Rolled back.');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Search for similar memories using cosine distance (<=>)
   * traces: SM-4, ADR-008
   */
  public async searchMemory(embedding: number[], threshold: number = 0.95, limit: number = 1): Promise<any[]> {
    const query = `
      SELECT content, metadata, 1 - (embedding <=> $1) as similarity
      FROM agent_memory
      WHERE 1 - (embedding <=> $1) >= $2
      ORDER BY similarity DESC
      LIMIT $3
    `;
    const res = await this.pool.query(query, [JSON.stringify(embedding), threshold, limit]);
    return res.rows;
  }

  /**
   * Close the connection pool
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}
