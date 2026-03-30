// Initialize Express Server

import express from 'express'; // import express framework
import dotenv from 'dotenv';  // load environment variables
dotenv.config();           
import pipelinesRouter from './pipelines';
import subscribersRouter from './subscribers';
import jobsRouter from './jobs';
import deliveryAttemptsRouter from './delivery_attempts';
import webhooksRouter from './webhooks';

const app = express();       // create an express application
app.use(express.json());    //  middleware to parse JSON request bodies.

app.use('/pipelines', pipelinesRouter);
app.use('/subscribers', subscribersRouter);
app.use('/jobs', jobsRouter);
app.use('/delivery_attempts', deliveryAttemptsRouter);
// simple health-check route, returns a message to confirm the server is running
app.get('/', (_req, res) => {
  res.send('Webhook Pipeline API running');
});

app.get('/delivery/:id', (req, res) => {
  const { id } = req.params;

  console.log(`GET test for subscriber ${id}`);

  res.send(`Delivery endpoint is reachable for subscriber ${id}`);
});

app.post('/delivery/:id', (req, res) => {
  const { id } = req.params;

  console.log(`Delivery received for subscriber ${id}:`, req.body);

  res.status(200).json({
    message: 'Delivery received successfully'
  });
});

app.use('/webhooks', webhooksRouter);
const PORT = process.env.PORT || 3000; // use environment variable for port or default to 3000


app.post('/test-receiver', (req, res) => {
  console.log("✅ Received webhook:", req.body);
  res.status(200).json({ ok: true });
});

// start the server and log that it’s running.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

