from fastapi import FastAPI

app = FastAPI(title='AI Therapist API Modular', version='0.1.0')

@app.get('/health')
async def health():
    return {'status': 'ok', 'mode': 'modular-scaffold'}
