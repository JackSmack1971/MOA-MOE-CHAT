import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * db:migrate script
 * traces: D0-3, FR-19
 */
async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('[Migration] Connecting to database...');
    await client.connect();
    
    const schemaPath = path.join(__dirname, '../src/db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('[Migration] Executing schema.sql...');
    await client.query(sql);
    
    console.log('[Migration] Success!');
  } catch (err) {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
