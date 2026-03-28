import Redis from 'ioredis';
import axios from 'axios';
import { pool } from '../db';

const redis = new Redis({
  host: 'redis', // docker service name
  port: 6379
});

const QUEUE_NAME = 'jobs';
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deliverWithRetry(
  job_id: number,
  subscriber: any,
  payload: any
) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;

      console.log(`[JOB ${job_id}][SUB ${subscriber.id}] Attempt ${attempt} → ${subscriber.target_url}`);

      const response = await axios.post(subscriber.target_url, payload, {
        timeout: 5000
      });

      await pool.query(
        `INSERT INTO delivery_attempts
        (job_id, subscriber_id, attempt_number, status, response_code, response_body, success)
        VALUES ($1, $2, $3, 'completed', $4, $5, true)`,
        [
          job_id,
          subscriber.id,
          attempt,
          response.status,
          JSON.stringify(response.data)
        ]
      );

      console.log(`[JOB ${job_id}][SUB ${subscriber.id}] ✅ SUCCESS (${response.status})`);
      return;

    } catch (err: any) {
      const errorCode = err.response?.status || 'NO_RESPONSE';

      console.log(
        `[JOB ${job_id}][SUB ${subscriber.id}] ❌ FAILED (Attempt ${attempt}) → ${errorCode}`
      );

      await pool.query(
        `INSERT INTO delivery_attempts
        (job_id, subscriber_id, attempt_number, status, response_code, response_body, success)
        VALUES ($1, $2, $3, 'failed', $4, $5, false)`,
        [
          job_id,
          subscriber.id,
          attempt,
          err.response?.status || 500,
          err.message
        ]
      );

      if (attempt >= MAX_RETRIES) {
        console.log(
          `[JOB ${job_id}][SUB ${subscriber.id}] 🚨 MAX RETRIES REACHED`
        );
        return;
      }

      const delay = BASE_DELAY * Math.pow(2, attempt);

      console.log(
        `[JOB ${job_id}][SUB ${subscriber.id}] ⏳ Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }
}

async function processJobAction(pipeline_id: number, payload: any): Promise<any> {
  const pipelineRes = await pool.query(
    `SELECT * FROM pipelines WHERE id=$1`,
    [pipeline_id]
  );
  const pipeline = pipelineRes.rows[0];

  let newPayload = { ...payload };

  console.log(`----------------------------------`);
  console.log(`[PIPELINE ${pipeline_id}] ⚙️ Action: ${pipeline.action_type}`);
  console.log(`[PIPELINE ${pipeline_id}] 📥 Input:`, payload);

  switch (pipeline.action_type) {
    case 'uppercase_field':
      if (newPayload.message) {
        newPayload.message = newPayload.message.toUpperCase();
        console.log(`[ACTION uppercase_field] 🔠 Converted message to uppercase`);
      }
      break;

    case 'add_timestamp':
      newPayload.processed_at = new Date().toISOString();
      console.log(`[ACTION add_timestamp] ⏱ Added timestamp`);
      break;

    case 'route_high_value':
      console.log(`[ACTION route_high_value] 💰 Will filter subscribers based on amount`);
      break;

    default:
      console.log(`[ACTION default] ⚠️ No processing applied`);
      break;
  }

  console.log(`[PIPELINE ${pipeline_id}] 📤 Output:`, newPayload);
  console.log(`----------------------------------`);

  return newPayload;
}

/*
async function processJobAction(pipeline_id: number, payload: any): Promise<any> {
  // Fetch pipeline action type
  const pipelineRes = await pool.query(`SELECT * FROM pipelines WHERE id=$1`, [pipeline_id]);
  const pipeline = pipelineRes.rows[0];

  let newPayload = { ...payload };

  switch (pipeline.action_type) {
    case 'uppercase_field':
      if (newPayload.message) newPayload.message = newPayload.message.toUpperCase();
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
*/
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

//console.log(`Processing job ${job_id}`);
      console.log(`\n==============================`);
      console.log(`[JOB ${job_id}] 🚀 Processing started`);    
      // Mark as processing
      await pool.query(`UPDATE jobs SET status='processing' WHERE id=$1`, [job_id]);

      // Apply processing action
      const processedPayload = await processJobAction(pipeline_id, payload);
      
      // After processing
      await pool.query(
  	`UPDATE jobs SET status='completed', result=$1 WHERE id=$2`,
  	[processedPayload, job_id]
      );
      console.log(`[JOB ${job_id}] ✅ Processing completed`);
      console.log(`[JOB ${job_id}] Payload:`, processedPayload);
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
/*
        try {
	console.log('Sending to subscriber:', sub.target_url, 'Payload:', processedPayload);
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
        } */
      }

      for (const sub of subs.rows) {
        // route_high_value logic stays
  	if (
    	  processedPayload.amount &&
          processedPayload.amount <= 100 &&
          (await pool.query(`SELECT action_type FROM pipelines WHERE id=$1`, [pipeline_id])).rows[0].action_type === 'route_high_value'
        ) {
    //    console.log(`Skipping subscriber ${sub.target_url}`);
      console.log(
  `[JOB ${job_id}] ⏭ Skipping subscriber ${sub.id} (${sub.target_url})`
);
       continue;
        }

     //   console.log(`Sending to subscriber: ${sub.target_url}`);
     console.log(
      `[JOB ${job_id}] 📤 Sending to subscriber ${sub.id} → ${sub.target_url}`
     );
        await deliverWithRetry(job_id, sub, processedPayload);
      }
      // Mark job as completed
      await pool.query(`UPDATE jobs SET status='completed' WHERE id=$1`, [job_id]);
      console.log(`[JOB ${job_id}] 🎉 COMPLETED`);
      console.log(`==============================\n`);
      } catch (err) {
      console.error('Worker error:', err);
    }
  }
}

startWorker();

