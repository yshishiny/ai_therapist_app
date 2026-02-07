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

## License

Private - All rights reserved
