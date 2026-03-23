// centralized place to connect to PostgreSQL so any file can import pool to run queries.

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
