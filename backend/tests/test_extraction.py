from extraction import _normalize_response


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
