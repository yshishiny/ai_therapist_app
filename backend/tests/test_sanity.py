import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

def test_minimal():
    app = FastAPI()
    client = TestClient(app)
    @app.get("/")
    def read_root(): return {"Hello": "World"}
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"Hello": "World"}
