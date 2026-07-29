# AI Therapist

A mobile-first clinical practice OS for psychological therapists.

## Features

- Patient management & clinical profiling
- Scheduling with reminders
- In-session assessments (PHQ-9, GAD-7, etc.)
- AI-assisted session summaries
- Phased treatment plan generator (CBT/DBT/ACT/Trauma/IFS/Art therapy)
- Dashboard with patient status & trends

## Quick Start

```bash
# Start services
docker-compose up -d

# API available at
http://localhost:8001

# Check health
curl http://localhost:8001/health
```

## Tech Stack

- **Backend**: FastAPI + PostgreSQL
- **Mobile**: Flutter (planned)
- **AI**: LM Studio / OpenAI compatible

## API Endpoints

| Method | Endpoint               | Description           |
| ------ | ---------------------- | --------------------- |
| GET    | /patients              | List patients         |
| POST   | /patients              | Create patient        |
| GET    | /patients/{id}         | Get patient           |
| GET    | /assessments/templates | List assessment types |
| POST   | /assessments           | Submit assessment     |
| GET    | /dashboard             | Quick stats           |

## Deployment (Railway)

This backend is structured to deploy automatically via **Railway** when commits are pushed to the `main` branch. 

### Prerequisites & Variables
You must set the following environment variables in your Railway Project Settings:
- `DATABASE_URL` (Required: connection string)
- `OPENAI_API_KEY` (Optional: AI integrations)
- `ENVIRONMENT` (Set to `production`)

### Railway Setup Steps
1. Push this repository to GitHub.
2. In Railway, click **New Project** -> **Deploy from GitHub repo**.
3. Select this repository. Railway reads `railway.toml`, which builds the root `Dockerfile` — that is the **portal** image. The **backend** image is built separately from `backend/Dockerfile` (see `backend-cloudbuild.yaml`); point the backend service's `dockerfilePath` at `backend/Dockerfile` rather than letting it auto-detect the root one.
4. Add the environment variables listed above.
5. Railway will automatically inject the `PORT` variable. The `/health` endpoint serves as a rolling gate; if the container fails to start or the endpoint returns !== HTTP 200, Railway will abort the deployment preventing downtime.

### Rollback Process
If a deployment fails or introduces a bug, click on the **Deployments** tab in Railway, find the previous successful deployment, and click the vertical dots `⋮` -> **Redeploy**. Railway gracefully manages traffic switching.

## License

Private - All rights reserved
