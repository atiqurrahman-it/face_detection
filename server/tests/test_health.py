def test_health_endpoint_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_main_module_reexports_app():
    from main import app
    from fastapi import FastAPI

    assert isinstance(app, FastAPI)
