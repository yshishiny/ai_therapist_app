# -----------------------------------------------------------------------
# PRODUCTION Dockerfile — Railway deployment
#
# Railway is configured with Root Directory = backend/
# so the build context IS the backend/ folder.
# All COPY paths are relative to backend/.
#
# For local Docker builds from repo root use:
#   docker build -f backend/Dockerfile --build-arg CONTEXT=root -t ai_therapist_backend .
# -----------------------------------------------------------------------
FROM python:3.12-slim

WORKDIR /app

# No gcc/libpq needed — asyncpg uses its own C extension bundled in the wheel
# psycopg2-binary is pre-compiled — no libpq-dev needed
# Only install if a package actually requires a system lib
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
# (Railway builds from backend/ as root, so '.' = backend/)
COPY . .

# Expose port (Railway auto-injects $PORT at runtime)
EXPOSE 8000

# Run using Uvicorn
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
