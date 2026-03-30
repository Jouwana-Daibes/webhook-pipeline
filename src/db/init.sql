
-- Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source_url VARCHAR(255) UNIQUE NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    pipeline_id INT REFERENCES pipelines(id) ON DELETE CASCADE,
    target_url TEXT  NOT NULL
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    pipeline_id INT REFERENCES pipelines(id),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Job attempts table
CREATE TABLE IF NOT EXISTS job_attempts (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id),
    attempt_number INT,
    status VARCHAR(20),
    response TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id),
    subscriber_id INT,
    attempt_number INT,
    attempt_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20),
    response_code JSONB,
    response_body TEXT,
    success BOOLEAN
);

/*
CREATE TABLE IF NOT EXISTS delivery_attempts (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id),
    attempt_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20),
    response_code JSONB,
    response_body TEXT,
    success BOOLEAN
);*/
