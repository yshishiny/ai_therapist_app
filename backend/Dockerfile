# -----------------------------------------------------------------------
# PRODUCTION Dockerfile — used by Railway (railway.toml → dockerfilePath)
# Build context MUST be the repository ROOT:
#   docker build -f backend/Dockerfile -t ai_therapist_backend .
# -----------------------------------------------------------------------
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for asyncpg
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend/ subdirectory (repo root is the Docker context)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# Expose port (Railway auto-injects PORT)
EXPOSE $PORT

# Run using Uvicorn
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
