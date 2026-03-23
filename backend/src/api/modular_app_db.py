from fastapi import FastAPI

app = FastAPI(title='AI Therapist API Modular DB', version='0.4.0')


@app.get('/health')
async def health():
    return {'status': 'ok', 'mode': 'modular-db-scaffold'}
