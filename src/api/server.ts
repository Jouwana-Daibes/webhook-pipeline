// Initialize Express Server

import express from 'express'; // import express framework
import dotenv from 'dotenv';  // load environment variables
dotenv.config();           
import pipelinesRouter from './pipelines';
import subscribersRouter from './subscribers';

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

const PORT = process.env.PORT || 3000; // use environment variable for port or default to 3000

// start the server and log that it’s running.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Connect Pipelines Router to Server
app.use('/pipelines', pipelinesRouter);

// Connect Subscribers Router to Server
app.use('/subscribers', subscribersRouter);
