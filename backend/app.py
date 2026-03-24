import os

from backend.src.api.modular_app_consolidated import app


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.app:app", host="0.0.0.0", port=port, reload=False)
