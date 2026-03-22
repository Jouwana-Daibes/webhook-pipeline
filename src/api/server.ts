// Initialize Express Server

import express from 'express'; // import express framework
import dotenv from 'dotenv';  // load environment variables

dotenv.config();           

const app = express();       // create an express application
app.use(express.json());    //  middleware to parse JSON request bodies.

// simple health-check route, returns a message to confirm the server is running
app.get('/', (_req, res) => {
  res.send('Webhook Pipeline API running');
});

const PORT = process.env.PORT || 3000; // use environment variable for port or default to 3000

// start the server and log that it’s running.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
