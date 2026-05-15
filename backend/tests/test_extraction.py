from extraction import _normalize_response
from validators import validate_extract_event_response


def _payload(**kwargs):
    base = {
        "text": "Party sometime tomorrow",
        "timezone": "America/Los_Angeles",
        "currentDate": "2026-05-12",
    }
    base.update(kwargs)
    return base


def _draft(**kwargs):
    base = {
        "title": "Party",
        "date": "2026-05-13",
        "startTime": "18:00",
        "endTime": "19:00",
        "timezone": "UTC",
        "location": "",
        "notes": "",
        "guests": [],
        "missingStartTime": False,
    }
    base.update(kwargs)
    return base


def test_normalize_response_defaults_missing_start_time():
    result = _normalize_response(
        _payload(),
        {
            "draft": _draft(
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
        },
    )

    assert result["draft"]["startTime"] == "10:00"
    assert result["draft"]["endTime"] == "11:00"
    assert result["draft"]["missingStartTime"] is False
    assert result["draft"]["timezone"] == "America/Los_Angeles"
    assert [warning["code"] for warning in result["warnings"]] == [
        "DEFAULT_DURATION",
        "DEFAULT_START_TIME",
    ]


def test_normalize_response_moves_expired_default_start_to_tomorrow():
    result = _normalize_response(
        _payload(currentDate="2026-05-14", currentTime="23:20"),
        {
            "draft": _draft(
                date="2026-05-14",
                startTime=None,
                endTime=None,
                missingStartTime=True,
            ),
            "warnings": [],
        },
    )

    assert result["draft"]["date"] == "2026-05-15"
    assert result["draft"]["startTime"] == "10:00"
    assert result["draft"]["endTime"] == "11:00"
    assert [warning["code"] for warning in result["warnings"]] == [
        "DEFAULT_DURATION",
        "DEFAULT_START_TIME",
        "INFERRED_DATE",
    ]


def test_normalize_response_preserves_explicit_start_time():
    result = _normalize_response(
        _payload(),
        {
            "draft": _draft(startTime="14:30", endTime="15:30"),
            "warnings": [],
        },
    )

    assert result["draft"]["startTime"] == "14:30"
    assert result["draft"]["endTime"] == "15:30"
    assert result["warnings"] == []


def test_normalize_response_repairs_sparse_low_confidence_draft():
    result = _normalize_response(
        _payload(text="梯子"),
        {
            "draft": {
                "title": "",
                "date": None,
                "startTime": None,
                "endTime": None,
                "timezone": "UTC",
                "extra": "ignored",
            },
            "warnings": [
                {
                    "field": "general",
                    "code": "NOT_IN_SCHEMA",
                    "message": "Model-specific warning.",
                }
            ],
        },
    )

    assert result["draft"] == {
        "title": "梯子",
        "date": "2026-05-12",
        "startTime": "10:00",
        "endTime": "11:00",
        "timezone": "America/Los_Angeles",
        "location": "",
        "notes": "",
        "guests": [],
        "missingStartTime": False,
    }
    assert [warning["code"] for warning in result["warnings"]] == [
        "INFERRED_DATE",
        "DEFAULT_DURATION",
        "DEFAULT_START_TIME",
        "LOW_CONFIDENCE",
    ]
    validate_extract_event_response(result)


def test_normalize_response_repairs_unwrapped_model_object():
    result = _normalize_response(
        _payload(text="阁楼"),
        {
            "title": "",
            "date": "",
            "startTime": "",
            "endTime": "",
            "reason": "Not enough event details.",
        },
    )

    assert result["draft"] == {
        "title": "阁楼",
        "date": "2026-05-12",
        "startTime": "10:00",
        "endTime": "11:00",
        "timezone": "America/Los_Angeles",
        "location": "",
        "notes": "",
        "guests": [],
        "missingStartTime": False,
    }
    assert [warning["code"] for warning in result["warnings"]] == [
        "INFERRED_DATE",
        "DEFAULT_DURATION",
        "DEFAULT_START_TIME",
        "LOW_CONFIDENCE",
    ]
    validate_extract_event_response(result)
