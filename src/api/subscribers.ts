// This file contains all subscriber endpoints: create, get by pipeline, delete.
import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Create subscriber
router.post('/', async (req, res) => {
  const { pipeline_id, target_url } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO subscribers (pipeline_id, target_url)
       VALUES ($1, $2) RETURNING *`,
      [pipeline_id, target_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all subscribers for a pipeline
router.get('/pipeline/:pipeline_id', async (req, res) => {
  const { pipeline_id } = req.params;

  const result = await pool.query(
    'SELECT * FROM subscribers WHERE pipeline_id=$1',
    [pipeline_id]
  );

  res.json(result.rows);
});

// Get subscriber by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'SELECT * FROM subscribers WHERE id=$1',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(result.rows[0]);
});

// Update subscriber
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { pipeline_id, target_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE subscribers SET pipeline_id=$1, target_url=$2 WHERE id=$3 RETURNING *`,
      [pipeline_id, target_url, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete subscriber
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  await pool.query('DELETE FROM subscribers WHERE id=$1', [id]);

  res.json({ message: 'Subscriber deleted' });
});

export default router;
