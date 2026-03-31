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

### 2. `duplicate_detector`

* Check if the same text has processed

### 3. `sentiment_analysis`

* classify the sentence to positive, negative or neutral.



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
## Webhook Pipeline Service

This service processes jobs through different pipelines and performs actions on the payload based on the specified action type. Below are the available action types that can be assigned to a pipeline.

### Action Types

#### 1. **`uppercase_field`**
This action type converts a specific field (in this case, the `message` field) to uppercase.

#### Example:
- **Pipeline Name**: Uppercase
- **Action Type**: `uppercase_field`

Payload Before Action:
  ```json
  {
    "message": "hello"
  }
  ```
Payload After Action:
```json
{
  "message": "HELLO"
}
```
**Description:**
This action scans the message field of the payload and converts the value to uppercase.
If the message field is not present, it will be ignored.

#### 2. duplicate_detector

This action type checks if a message has been seen before. If the message is duplicated, the is_duplicate flag is set to true; otherwise, it is set to false.

**Example:**

- Pipeline Name: Duplicate Detector
- Action Type: `duplicate_detector`

Payload Before Action:
```json
{
  "message": "same"
}
```
Payload After Action:
```json
{
  "message": "same",
  "is_duplicate": true
}
```
**Description:**

This action checks if the message field in the payload has already been processed. If the same message is encountered again, it is flagged as a duplicate.
The flag is_duplicate will be true for duplicate messages, and false for unique ones.

#### 3. sentiment_analysis

This action type analyzes the sentiment of the message field. It will assign a sentiment label based on the text content.

**Example:**
- Pipeline Name: Sentiment Analysis
- Action Type: `sentiment_analysis`

Payload Before Action:
```json
{
  "message": "this is amazing and perfect"
}
```
Payload After Action:
```json
{
  "message": "this is amazing and perfect",
  "sentiment": "positive"
}
```
**Description:**
This action type evaluates the message field and assigns one of three sentiment labels:
  - positive
  - neutral
  - negative
The sentiment is determined based on the presence of predefined positive and negative words in the message field.
How to Use Action Types in a Pipeline

**To create a pipeline with a specific action type, you can make a POST request to the /pipelines endpoint with the appropriate action type.**

- Example of Creating a Pipeline with Action Types:
```
curl -X POST http://localhost:3000/pipelines \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Uppercase Pipeline",
        "source_url": "http://example.com",
        "action_type": "uppercase_field"
      }'
```
- Pipeline Example with Subscribers
    1. Create the pipeline.
    2. Add subscribers to the pipeline.
    3. Send a webhook to trigger the pipeline action.
##### i. Create a pipeline
```
curl -X POST http://localhost:3000/pipelines \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Sentiment Analysis Pipeline",
        "source_url": "http://example.com",
        "action_type": "sentiment_analysis"
      }'
```
##### ii. Add a subscriber
```
curl -X POST http://localhost:3000/subscribers \
  -H "Content-Type: application/json" \
  -d '{
        "pipeline_id": 3,
        "target_url": "http://webhook.site/target-url"
      }'
```
##### iii. Send a test webhook
```
curl -X POST http://localhost:3000/webhooks/3 \
  -H "Content-Type: application/json" \
  -d '{"message": "I love this service!"}'
```
**Conclusion**

These action types allow for simple but effective processing of incoming webhook data. You can create complex workflows by chaining multiple pipelines and applying different actions to the payloads. Customize the behavior by adjusting the action_type and related configurations for each pipeline.

##  Debugging

### View worker logs:

```bash
docker compose logs -f worker
```
## CI/CD Actions
- CI (Continuous Integration) steps:
    - 1. Checkout code (actions/checkout@v3)
    - 2. Start the system (API, Worker, DB, Redis)
    - 3. Wait for API readiness
    - 4. Run full system tests:
      - Create pipelines
      - Add subscribers
      - Send webhooks
      - Verify job results
      - Test delivery attempts

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
