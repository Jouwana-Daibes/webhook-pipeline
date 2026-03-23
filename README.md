# Webhook-Driven Task Processing System

##  Overview

This project is a **Webhook-Driven Pipeline System** that allows users to:

* Create pipelines with specific processing actions
* Subscribe external services (via webhooks) to pipelines
* Submit jobs containing payloads
* Process jobs asynchronously using a background worker
* Deliver processed data to subscribers

---

## Architecture

The system consists of:

* **API Server (Express + PostgreSQL)**
* **Redis Queue**
* **Worker (Background Processor)**
* **Subscribers (Webhook endpoints)**

### Flow:
1. User creates a pipeline
2. User subscribes a webhook URL
3. User submits a job
4. Job is pushed to Redis queue
5. Worker processes the job
6. Processed payload is sent to subscribers
---

## Technologies Used

* Node.js + Express
* PostgreSQL
* Redis (ioredis)
* Docker & Docker Compose
* Axios (for webhook delivery)

---

##  Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Jouwana-Daibes/webhook-pipeline.git
cd webhook-pipeline
```

### 2. Start services

```bash
docker compose up --build
```

### 3. Services will run on:

* API: http://localhost:3000
* Redis: port 6379
* PostgreSQL: port 5432

---

##  Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgres://user:password@db:5432/webhook_db
```

---

##  API Usage (cURL Examples)

---

### 1️. Create a Pipeline

```bash
curl -X POST http://localhost:3000/pipelines \
-H "Content-Type: application/json" \
-d '{
  "name": "Test Pipeline",
  "action_type": "uppercase_field",
  "source_url": "/pipeline/1/webhook"
}'
```

---

### 2️. Add Subscriber

```bash
curl -X POST http://localhost:3000/subscribers \
-H "Content-Type: application/json" \
-d '{
  "pipeline_id": 1,
  "target_url": "https://webhook.site/YOUR-UNIQUE-URL"
}'
```

---

### 3️. Create Job

```bash
curl -X POST http://localhost:3000/jobs \
-H "Content-Type: application/json" \
-d '{
  "pipeline_id": 1,
  "payload": {
    "text": "hello world",
    "amount": 150
  }
}'
```

---

### 4️. Get Job

```bash
curl http://localhost:3000/jobs/1
```

---

## Supported Action Types

### 1. `uppercase_field`

* Converts `payload.text` to uppercase

### 2. `add_timestamp`

* Adds `processed_at` timestamp to payload

### 3. `route_high_value`

* Sends only jobs with `amount > 100`

---

##  Worker Behavior

The worker:

* Listens to Redis queue (`jobs`)
* Marks job as `processing`
* Applies pipeline action
* Sends processed payload to subscribers
* Logs success/failure in `delivery_attempts`
* Marks job as `completed`

---

##  Job Lifecycle

```
pending → processing → completed / failed / cancelled
```

---

##  Debugging

### View worker logs:

```bash
docker compose logs -f worker
```

### Common issues:

* No subscribers → no webhook calls
* Wrong action_type → no processing applied
* No Redis connection → jobs not processed
---

##  Future Improvements

* Retry mechanism for failed deliveries
* Dead-letter queue
* Authentication for webhooks
* UI dashboard
* Rate limiting
---
