# Async Notification Worker

Background job processing service built with **Node.js**, **TypeScript**, **Express**, **BullMQ**, **Redis**, **PostgreSQL**, and **Prisma**.

This project demonstrates how to separate API request handling from heavy background processing using a queue-based worker architecture.

## Features

- Create background jobs through REST API
- Store job metadata and statuses in PostgreSQL
- Enqueue jobs with BullMQ
- Process jobs asynchronously in a separate worker
- Retry failed jobs with exponential backoff
- Support delayed jobs
- Manually retry failed jobs through API
- Track job lifecycle with statuses:
  - `pending`
  - `queued`
  - `processing`
  - `completed`
  - `failed`

## Tech Stack

- Node.js
- TypeScript
- Express
- BullMQ
- Redis
- PostgreSQL
- Prisma
- Docker Compose

## Architecture Overview

This service is split into several responsibilities:

- **API layer**  
  Receives HTTP requests, validates input, creates jobs, and returns responses.

- **Database layer**  
  PostgreSQL stores job records, statuses, timestamps, attempts count, and error details.

- **Queue layer**  
  BullMQ uses Redis to queue jobs for background processing.

- **Worker layer**  
  A separate worker process consumes queued jobs and updates job statuses in PostgreSQL.

## Job Flow

1. Client sends `POST /jobs`
2. API validates the request
3. API creates a `Job` record in PostgreSQL
4. API enqueues the job in Redis using BullMQ
5. API updates the job status to `queued`
6. Worker picks up the job
7. Worker updates status to `processing`
8. Worker completes the task or fails
9. PostgreSQL stores the final status and error details if needed

## Supported Job Types

- `welcome-email`
- `delayed-reminder`
- `report-export`

## Project Structure

```text
src/
  constants/
  lib/
  queues/
  services/
  workers/
  app.ts
  server.ts

prisma/
docker-compose.yml
```
