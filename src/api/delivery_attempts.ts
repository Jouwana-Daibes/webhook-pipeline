import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get all delivery attempts
router.get('/', async (_req, res) => {
  const result = await pool.query('SELECT * FROM delivery_attempts');
  res.json(result.rows);
});

// Get delivery attempts by job
router.get('/:job_id', async (req, res) => {
  const { job_id } = req.params;
  const result = await pool.query(
    'SELECT * FROM delivery_attempts WHERE job_id=$1',
    [job_id]
  );
  res.json(result.rows);
});

// create delivery attempt (usually worker)
router.post('/', async (req, res) => {
  const { job_id, success, response_code, response_body } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO delivery_attempts (job_id, success, response_code, response_body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [job_id, success, response_code, response_body]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
