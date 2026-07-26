FROM python:3.10-slim

WORKDIR /app

# Install dependencies required for asyncpg/psycopg2 compilation if needed
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend directory (assuming build context is repo root)
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend ./backend
COPY assessments ./assessments

# Expose port (default 8000, overridden by Cloud Run/Railway)
EXPOSE 8000

# Run as a module (not a script) so `from backend.src...` imports resolve
# against /app on sys.path, rather than /app/backend.
CMD ["python", "-m", "backend.app"]
