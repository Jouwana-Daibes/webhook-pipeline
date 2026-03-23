// This file contains all pipeline endpoints: create, get, get by ID, delete.
import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Create pipeline
router.post('/', async (req, res) => {
  const { name, source_url, action_type, action_config } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pipelines (name, source_url, action_type, action_config)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, source_url, action_type, action_config]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pipelines
router.get('/', async (_req, res) => {
  const result = await pool.query('SELECT * FROM pipelines');
  res.json(result.rows);
});

// Get pipeline by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM pipelines WHERE id=$1', [id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

// Update pipeline
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, source_url, action_type, action_config } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pipelines SET name=$1, source_url=$2, action_type=$3, action_config=$4
       WHERE id=$5 RETURNING *`,
      [name, source_url, action_type, action_config, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete pipeline
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM pipelines WHERE id=$1', [id]);
  res.json({ message: 'Pipeline deleted' });
});

export default router;
