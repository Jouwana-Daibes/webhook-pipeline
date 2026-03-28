import express from 'express';
import { pool } from '../db';
import Redis from 'ioredis';

const router = express.Router();

const redis = new Redis({
  host: 'redis',
  port: 6379
});

// POST /webhooks/:pipeline_id
router.post('/:pipeline_id', async (req, res) => {
  const { pipeline_id } = req.params;
  const payload = req.body;

  try {
    // 1. Check pipeline exists
    const pipelineCheck = await pool.query(
      'SELECT * FROM pipelines WHERE id = $1',
      [pipeline_id]
    );

    if (pipelineCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // 2. Create job in DB
    const jobResult = await pool.query(
      `INSERT INTO jobs (pipeline_id, payload, status)
       VALUES ($1, $2, 'pending') RETURNING *`,
      [pipeline_id, payload]
    );

    const job = jobResult.rows[0];

    // 3. Push job to Redis queue
    await redis.lpush(
      'jobs',
      JSON.stringify({
        job_id: job.id,
        pipeline_id: job.pipeline_id,
        payload: job.payload
      })
    );

    // 4. Respond quickly (DO NOT process here)
    res.status(202).json({
      message: 'Webhook received, job queued',
      job_id: job.id
    });

  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
