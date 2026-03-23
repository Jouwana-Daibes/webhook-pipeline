import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get all jobs
router.get('/', async (_req, res) => {
  const result = await pool.query('SELECT * FROM jobs');
  res.json(result.rows);
});

// Get job by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM jobs WHERE id=$1', [id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

// Update job (status, etc.)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, data } = req.body;
  try {
    const result = await pool.query(
      `UPDATE jobs SET status=$1, data=$2 WHERE id=$3 RETURNING *`,
      [status, data, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

//  create job manually (usually worker does this)
router.post('/', async (req, res) => {
  const { pipeline_id, data } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO jobs (pipeline_id, data, status) VALUES ($1, $2, 'pending') RETURNING *`,
      [pipeline_id, data]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// job status update - for worker
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      `UPDATE jobs SET status=$1 WHERE id=$2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// cancel a job
router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE jobs SET status='cancelled' WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job cancelled', job: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// mark job as completed
router.patch('/:id/complete', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE jobs SET status='completed' WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job completed', job: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// mark job as failed
router.patch('/:id/fail', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE jobs SET status='failed' WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job failed', job: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/*
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM jobs WHERE id=$1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ message: 'Job deleted', job: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Delete jobs by pipeline
router.delete('/pipeline/:pipeline_id', async (req, res) => {
  const { pipeline_id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM jobs WHERE pipeline_id=$1 RETURNING *',
      [pipeline_id]
    );

    res.json({
      message: 'Jobs deleted for pipeline',
      count: result.rowCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
*/
export default router;
