import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function truncate() {
  console.log('Truncating agent_memory...');
  await pool.query('TRUNCATE TABLE agent_memory;');
  console.log('Truncated.');
  await pool.end();
}

truncate().catch(console.error);
