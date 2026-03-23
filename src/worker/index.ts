import Redis from 'ioredis';
import axios from 'axios';
import { pool } from '../db';

const redis = new Redis({
  host: 'redis', // docker service name
  port: 6379
});

const QUEUE_NAME = 'jobs';

async function processJobAction(pipeline_id: number, payload: any): Promise<any> {
  // Fetch pipeline action type
  const pipelineRes = await pool.query(`SELECT * FROM pipelines WHERE id=$1`, [pipeline_id]);
  const pipeline = pipelineRes.rows[0];

  let newPayload = { ...payload };

  switch (pipeline.action_type) {
    case 'uppercase_field':
      if (newPayload.text) newPayload.text = newPayload.text.toUpperCase();
      break;

    case 'add_timestamp':
      newPayload.processed_at = new Date().toISOString();
      break;

    case 'route_high_value':
      // We’ll handle conditional routing in the delivery loop
      break;

    default:
      // No action
      break;
  }

  return newPayload;
}

// Worker loop
async function startWorker() {
  console.log('Worker started...');

  while (true) {
    try {
      // Wait for a job from Redis
      const job = await redis.brpop(QUEUE_NAME, 0);

      if (!job) continue;

      const jobData = JSON.parse(job[1]);
      const { job_id, pipeline_id, payload } = jobData;

console.log(`Processing job ${job_id}`);
      // Mark as processing
      await pool.query(`UPDATE jobs SET status='processing' WHERE id=$1`, [job_id]);

      // Apply processing action
      const processedPayload = await processJobAction(pipeline_id, payload);

      // Get subscribers
      const subs = await pool.query(`SELECT * FROM subscribers WHERE pipeline_id=$1`, [pipeline_id]);


      for (const sub of subs.rows) {
        // Conditional routing for 'route_high_value' action
        if (
          processedPayload.amount &&
          processedPayload.amount <= 100 &&
          (await pool.query(`SELECT action_type FROM pipelines WHERE id=$1`, [pipeline_id])).rows[0].action_type === 'route_high_value'
        ) {
          console.log(`Skipping subscriber ${sub.target_url} for low amount`);
          continue;
        }

        try {
          const response = await axios.post(sub.target_url, processedPayload);

          // Save success
          await pool.query(
            `INSERT INTO delivery_attempts (job_id, status, response_code, response_body, success)
             VALUES ($1, 'completed', $2, $3, true)`,
            [job_id, JSON.stringify(response.status), JSON.stringify(response.data)]
          );
        } catch (err: any) {
          // Save failure
          await pool.query(
            `INSERT INTO delivery_attempts (job_id, status, response_code, response_body, success)
             VALUES ($1, 'failed', $2, $3, false)`,
            [job_id, err.response?.status || 500, err.message]
          );
        }
      }

      // Mark job as completed
      await pool.query(`UPDATE jobs SET status='completed' WHERE id=$1`, [job_id]);
    } catch (err) {
      console.error('Worker error:', err);
    }
  }
}

startWorker();
