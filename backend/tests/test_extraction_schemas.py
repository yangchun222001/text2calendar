import pytest
from jsonschema import ValidationError

from validators import (
    validate_event_draft,
    validate_extraction_warning,
    validate_extract_event_error,
    validate_extract_event_request,
    validate_extract_event_response,
)


def _valid_draft(**kwargs):
    base = {
        "title": "T",
        "date": "2026-05-12",
        "startTime": "10:00",
        "endTime": "11:00",
        "timezone": "America/Los_Angeles",
        "location": "",
        "notes": "",
        "guests": [],
        "missingStartTime": False,
    }
    base.update(kwargs)
    return base


def test_validate_request_ok():
    validate_extract_event_request(
        {
            "text": "hello",
            "timezone": "UTC",
            "currentDate": "2026-05-12",
        }
    )


def test_validate_request_ok_with_current_time():
    validate_extract_event_request(
        {
            "text": "hello",
            "timezone": "UTC",
            "currentDate": "2026-05-12",
            "currentTime": "23:20",
        }
    )


def test_validate_request_bad_current_time():
    with pytest.raises(ValidationError):
        validate_extract_event_request(
            {
                "text": "hello",
                "timezone": "UTC",
                "currentDate": "2026-05-12",
                "currentTime": "24:00",
            }
        )


def test_validate_request_empty_text():
    with pytest.raises(ValidationError):
        validate_extract_event_request(
            {
                "text": "",
                "timezone": "UTC",
                "currentDate": "2026-05-12",
            }
        )


def test_validate_request_bad_date():
    with pytest.raises(ValidationError):
        validate_extract_event_request(
            {
                "text": "a",
                "timezone": "UTC",
                "currentDate": "5/12/2026",
            }
        )


def test_validate_draft_ok():
    validate_event_draft(_valid_draft())


def test_validate_draft_missing_start_consistent():
    validate_event_draft(
        _valid_draft(startTime=None, endTime=None, missingStartTime=True)
    )


def test_validate_draft_missing_start_inconsistent():
    with pytest.raises(ValueError, match="missingStartTime"):
        validate_event_draft(_valid_draft(startTime=None, missingStartTime=False))


def test_validate_draft_bad_time():
    with pytest.raises(ValidationError):
        validate_event_draft(_valid_draft(startTime="25:99"))


def test_validate_warning_ok():
    validate_extraction_warning(
        {
            "field": "date",
            "code": "INFERRED_DATE",
            "message": "Inferred year.",
        }
    )


def test_validate_default_start_time_warning_ok():
    validate_extraction_warning(
        {
            "field": "startTime",
            "code": "DEFAULT_START_TIME",
            "message": "No clear start time found; defaulted to 10:00 AM.",
        }
    )


def test_validate_warning_bad_code():
    with pytest.raises(ValidationError):
        validate_extraction_warning(
            {
                "field": "date",
                "code": "NOT_A_CODE",
                "message": "m",
            }
        )


def test_validate_response_ok():
    validate_extract_event_response({"draft": _valid_draft(), "warnings": []})


def test_validate_error_ok():
    validate_extract_event_error(
        {"error": {"code": "EMPTY_INPUT", "message": "Event text is required."}}
    )


def test_validate_error_invalid_request_code():
    validate_extract_event_error(
        {"error": {"code": "INVALID_REQUEST", "message": "Bad body."}}
    )


def test_validate_error_bad_code():
    with pytest.raises(ValidationError):
        validate_extract_event_error(
            {"error": {"code": "NOPE", "message": "x"}}
        )


def test_draft_rejects_extra_properties():
    d = _valid_draft()
    d["rawPastedText"] = "secret"
    with pytest.raises(ValidationError):
        validate_event_draft(d)
