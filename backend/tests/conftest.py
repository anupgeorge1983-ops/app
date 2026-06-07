import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get the public EXPO backend URL (the URL the mobile app talks to).
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

_BASE = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
)
if not _BASE:
    raise RuntimeError("EXPO_(PUBLIC_)BACKEND_URL not set in /app/frontend/.env")
BASE_URL = _BASE.rstrip("/")


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    return session
