"""Tests for the POST /api/transcribe endpoint (Gemini audio transcription)."""
import io
import os
import requests


SPEECH_WAV = "/tmp/fixtures/speech.wav"


def test_transcribe_valid_audio_returns_text(api_client, base_url):
    assert os.path.exists(SPEECH_WAV), "Speech fixture missing; build it first."
    with open(SPEECH_WAV, "rb") as f:
        files = {"file": ("speech.wav", f, "audio/wav")}
        r = api_client.post(f"{base_url}/api/transcribe", files=files, timeout=120)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "text" in data
    text = data["text"]
    assert isinstance(text, str)
    assert len(text.strip()) > 0, f"Whisper returned empty text: {data!r}"


def test_transcribe_empty_file_returns_400(api_client, base_url):
    files = {"file": ("empty.wav", io.BytesIO(b""), "audio/wav")}
    r = api_client.post(f"{base_url}/api/transcribe", files=files, timeout=30)
    assert r.status_code == 400, f"Expected 400 for empty file, got {r.status_code}: {r.text}"
    body = r.json()
    assert "detail" in body
    assert "empty" in body["detail"].lower()


def test_transcribe_too_large_returns_400(api_client, base_url):
    # 25 MB of zeros — should exceed the 24 MB limit
    big = b"\x00" * (25 * 1024 * 1024)
    files = {"file": ("huge.wav", io.BytesIO(big), "audio/wav")}
    r = api_client.post(f"{base_url}/api/transcribe", files=files, timeout=60)
    assert r.status_code == 400, f"Expected 400 for >24MB file, got {r.status_code}: {r.text}"
    body = r.json()
    assert "detail" in body
    assert "large" in body["detail"].lower() or "24" in body["detail"]
