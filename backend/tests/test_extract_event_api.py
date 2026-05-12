"""Route tests for POST /api/extract-event (injectable extractor, no real LLM)."""

import pytest

from app import app
from extraction import ExtractionError


def _valid_body(**kwargs):
    base = {
        "text": "Party tomorrow",
        "timezone": "America/Los_Angeles",
        "currentDate": "2026-05-12",
    }
    base.update(kwargs)
    return base


def _valid_draft(**kwargs):
    d = {
        "title": "Party",
        "date": "2026-05-13",
        "startTime": "17:00",
        "endTime": "18:00",
        "timezone": "America/Los_Angeles",
        "location": "Park",
        "notes": "",
        "guests": [],
        "missingStartTime": False,
    }
    d.update(kwargs)
    return d


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["EXTRACT_EVENT_FN"] = None
    with app.test_client() as c:
        yield c
    app.config.pop("EXTRACT_EVENT_FN", None)


def test_extract_event_empty_input(client):
    rv = client.post("/api/extract-event", json={"text": "   "})
    assert rv.status_code == 400
    assert rv.get_json()["error"]["code"] == "EMPTY_INPUT"


def test_extract_event_invalid_request(client):
    rv = client.post("/api/extract-event", json={"text": "hello"})
    assert rv.status_code == 400
    assert rv.get_json()["error"]["code"] == "INVALID_REQUEST"


def test_extract_event_invalid_timezone(client):
    rv = client.post("/api/extract-event", json=_valid_body(timezone="Not/A_Real_Zone_999"))
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "INVALID_REQUEST"
    assert "timezone" in body["error"]["message"].lower()


def test_extract_event_success_with_fake_extractor(client):
    secret = "unique-secret-token-xyz"

    def fake_extract(payload):
        assert secret in payload["text"]
        return {"draft": _valid_draft(), "warnings": []}

    app.config["EXTRACT_EVENT_FN"] = fake_extract
    rv = client.post("/api/extract-event", json=_valid_body(text=f"Meetup {secret}"))
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["draft"]["title"] == "Party"
    assert data["warnings"] == []


def test_extract_event_missing_start_time_response(client):
    def fake_extract(_payload):
        return {
            "draft": _valid_draft(
                startTime=None,
                endTime=None,
                missingStartTime=True,
            ),
            "warnings": [
                {
                    "field": "startTime",
                    "code": "MISSING_START_TIME",
                    "message": "No start time in source text.",
                }
            ],
        }

    app.config["EXTRACT_EVENT_FN"] = fake_extract
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["draft"]["missingStartTime"] is True
    assert body["draft"]["startTime"] is None


def test_extract_event_extraction_error_llm_failed(client):
    def fail(_payload):
        raise ExtractionError("LLM_EXTRACTION_FAILED", "Upstream failed.")

    app.config["EXTRACT_EVENT_FN"] = fail
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 502
    assert rv.get_json()["error"]["code"] == "LLM_EXTRACTION_FAILED"


def test_extract_event_extraction_error_rate_limited(client):
    def rate_limited(_payload):
        raise ExtractionError("RATE_LIMITED", "Too many requests.")

    app.config["EXTRACT_EVENT_FN"] = rate_limited
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 429
    assert rv.get_json()["error"]["code"] == "RATE_LIMITED"


def test_extract_event_invalid_model_output_not_object(client):
    app.config["EXTRACT_EVENT_FN"] = lambda _p: "not an object"
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 502
    assert rv.get_json()["error"]["code"] == "INVALID_MODEL_OUTPUT"


def test_extract_event_invalid_model_output_schema(client):
    app.config["EXTRACT_EVENT_FN"] = lambda _p: {
        "draft": _valid_draft(startTime=None, missingStartTime=False),
        "warnings": [],
    }
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 502
    body = rv.get_json()
    assert body["error"]["code"] == "INVALID_MODEL_OUTPUT"


def test_extract_event_unknown_error_no_leak(client):
    secret = "do-not-leak-this-email@example.com"

    def bad(_payload):
        raise RuntimeError(secret)

    app.config["EXTRACT_EVENT_FN"] = bad
    rv = client.post("/api/extract-event", json=_valid_body(text="hello"))
    assert rv.status_code == 500
    body = rv.get_json()
    assert body["error"]["code"] == "UNKNOWN"
    assert secret not in str(body)


def test_extract_event_llm_not_configured_without_key(client, monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    app.config["EXTRACT_EVENT_FN"] = None
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 502
    body = rv.get_json()
    assert body["error"]["code"] == "LLM_EXTRACTION_FAILED"
