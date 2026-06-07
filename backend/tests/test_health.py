"""Health and root endpoint tests for Be Heard API."""
import requests


def test_root_ok(api_client, base_url):
    r = api_client.get(f"{base_url}/api/")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert "Be Heard" in data.get("message", "")
