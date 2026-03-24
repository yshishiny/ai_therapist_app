FROM python:3.10-slim

WORKDIR /app

# Install dependencies required for asyncpg/psycopg2 compilation if needed
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend ./backend

# Expose port (default 8000, overridden by Railway)
EXPOSE $PORT

# Run using Uvicorn
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
