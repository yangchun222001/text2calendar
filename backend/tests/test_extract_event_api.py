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
    rv = client.post(
        "/api/extract-event",
        json=_valid_body(timezone="Not/A_Real_Zone_999"),
    )
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


def test_extract_event_prd_sample_fixture(client):
    sample = (
        '5/6 : Wednesday May 6th will be our "Restaurant Night" Fundraiser at '
        "the Foster City Food Trucks at Leo J. Ryan Park. If you choose to "
        "participate, bring your child to the event at 5:15 to check in with "
        "Mrs. Lazar (finding parking is difficult, so plan ahead). Performances "
        "will be between 5:30 and 6:00pm. Please send your child in the their "
        "Beach Park T-Shirt."
    )

    def fake_extract(payload):
        assert "Restaurant Night" in payload["text"]
        return {
            "draft": _valid_draft(
                title="Nora Performance @ Food Truck Night",
                date="2026-05-06",
                startTime="17:15",
                endTime="18:00",
                location="Foster City Food Trucks at Leo J. Ryan Park",
                notes=(
                    "5:15 check-in with Mrs. Lazar\n"
                    "5:30-6:00 performance\n"
                    "Wear Beach Park T-Shirt\n"
                    "Parking is difficult, plan ahead"
                ),
            ),
            "warnings": [],
        }

    app.config["EXTRACT_EVENT_FN"] = fake_extract
    rv = client.post("/api/extract-event", json=_valid_body(text=sample))
    body = rv.get_json()

    assert rv.status_code == 200
    assert body["draft"]["title"] == "Nora Performance @ Food Truck Night"
    assert body["draft"]["startTime"] == "17:15"
    assert body["draft"]["endTime"] == "18:00"
    assert "Parking is difficult" in body["draft"]["notes"]


def test_extract_event_default_duration_fixture(client):
    def fake_extract(_payload):
        return {
            "draft": _valid_draft(
                title="Dentist Appointment",
                date="2026-05-13",
                startTime="09:30",
                endTime="10:30",
                notes="Duration was not provided.",
            ),
            "warnings": [
                {
                    "field": "endTime",
                    "code": "DEFAULT_DURATION",
                    "message": "No duration found; defaulted to one hour.",
                }
            ],
        }

    app.config["EXTRACT_EVENT_FN"] = fake_extract
    rv = client.post(
        "/api/extract-event",
        json=_valid_body(text="Dentist at 9:30"),
    )
    body = rv.get_json()

    assert rv.status_code == 200
    assert body["draft"]["endTime"] == "10:30"
    assert body["warnings"][0]["code"] == "DEFAULT_DURATION"


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


def test_extract_event_multiple_times_fixture(client):
    def fake_extract(_payload):
        return {
            "draft": _valid_draft(
                title="School Performance",
                date="2026-05-06",
                startTime="17:15",
                endTime="18:00",
                notes="Check in at 5:15\nPerformance 5:30-6:00",
            ),
            "warnings": [
                {
                    "field": "startTime",
                    "code": "MULTIPLE_POSSIBLE_TIMES",
                    "message": "Selected check-in time as the event start.",
                }
            ],
        }

    app.config["EXTRACT_EVENT_FN"] = fake_extract
    rv = client.post(
        "/api/extract-event",
        json=_valid_body(text="Check in at 5:15, performance 5:30-6:00"),
    )
    body = rv.get_json()

    assert rv.status_code == 200
    assert body["draft"]["startTime"] == "17:15"
    assert "Performance 5:30-6:00" in body["draft"]["notes"]
    assert body["warnings"][0]["code"] == "MULTIPLE_POSSIBLE_TIMES"


def test_extract_event_extraction_error_llm_failed(client):
    def fail(_payload):
        raise ExtractionError("LLM_EXTRACTION_FAILED", "Upstream failed.")

    app.config["EXTRACT_EVENT_FN"] = fail
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 502
    assert rv.get_json()["error"]["code"] == "LLM_EXTRACTION_FAILED"


def test_extract_event_extraction_error_message_no_leak(client, caplog):
    secret = "private-guest@example.com"

    def fail(_payload):
        raise ExtractionError("LLM_EXTRACTION_FAILED", f"Provider echoed {secret}")

    app.config["EXTRACT_EVENT_FN"] = fail
    rv = client.post(
        "/api/extract-event",
        json=_valid_body(text=f"Dinner with {secret}"),
    )
    body = rv.get_json()
    logs = "\n".join(record.getMessage() for record in caplog.records)

    assert rv.status_code == 502
    assert body["error"]["code"] == "LLM_EXTRACTION_FAILED"
    assert body["error"]["message"] == "The language model request failed."
    assert secret not in str(body)
    assert secret not in logs


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


def test_extract_event_unknown_error_no_log_leak(client, caplog):
    secret = "hidden-party-address@example.com"

    def bad(_payload):
        raise RuntimeError(secret)

    app.config["EXTRACT_EVENT_FN"] = bad
    rv = client.post(
        "/api/extract-event",
        json=_valid_body(text=f"Invite {secret}"),
    )
    logs = "\n".join(record.getMessage() for record in caplog.records)

    assert rv.status_code == 500
    assert secret not in logs


def test_extract_event_llm_not_configured_without_key(client, monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    app.config["EXTRACT_EVENT_FN"] = None
    rv = client.post("/api/extract-event", json=_valid_body())
    assert rv.status_code == 502
    body = rv.get_json()
    assert body["error"]["code"] == "LLM_EXTRACTION_FAILED"
