import express from 'express';
import { pool } from '../db';
import Redis from 'ioredis';

const redis = new Redis({
  host: 'redis',
  port: 6379
});

const router = express.Router();

// Get all jobs
router.get('/', async (_req, res) => {
  const result = await pool.query('SELECT * FROM jobs');
  res.json(result.rows);
});

router.get('/completed', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM jobs WHERE status = 'completed' ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

router.get('/failed', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM jobs WHERE status = 'failed' ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

router.get('/processing', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM jobs WHERE status = 'processing' ORDER BY created_at DESC`
  );
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
  const { status, payload } = req.body;
  try {
    const result = await pool.query(
      `UPDATE jobs SET status=$1, payload=$2 WHERE id=$3 RETURNING *`,
      [status, payload, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

//  create job manually (usually worker does this)
router.post('/', async (req, res) => {
  const { pipeline_id, payload } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO jobs (pipeline_id, payload, status) VALUES ($1, $2, 'pending') RETURNING *`,
      [pipeline_id, payload]
    );

    const job = result.rows[0];

    // push to Redis queue
    await redis.lpush('jobs', JSON.stringify({
      job_id: job.id,
      pipeline_id,
      payload
    }));

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


// Get job with delivery attempts (FULL HISTORY)
router.get('/:id/full', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get job
    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id=$1`,
      [id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    // 2. Get delivery attempts
    const attemptsResult = await pool.query(
      `SELECT * FROM delivery_attempts WHERE job_id=$1 ORDER BY attempt_time ASC`,
      [id]
    );

    // 3. Return combined response
    res.json({
      job,
      delivery_attempts: attemptsResult.rows
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Get all jobs for a pipeline (history)
router.get('/pipeline/:pipeline_id', async (req, res) => {
  const { pipeline_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM jobs WHERE pipeline_id=$1 ORDER BY created_at DESC`,
      [pipeline_id]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get ONLY job status
router.get('/:id/status', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, status, result FROM jobs WHERE id=$1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/*
// Get ONLY job history (delivery attempts)
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
          subscriber_id,
          attempt_number,
          status,
          response_code,
          success,
          attempt_time
       FROM delivery_attempts
       WHERE job_id=$1
       ORDER BY attempt_time ASC`,
      [id]
    );

    res.json({
      job_id: id,
      attempts: result.rows
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});*/

export default router;
