"""Provider-neutral event extraction: prompt building and LLM JSON output.

Tests should inject ``app.config["EXTRACT_EVENT_FN"]`` to avoid network calls.
When ``LLM_API_KEY`` is set, the default path uses the OpenAI-compatible
``POST {LLM_API_BASE}/chat/completions`` API via stdlib only (no extra deps).
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Callable

ExtractEventFn = Callable[[dict[str, Any]], dict[str, Any]]


class ExtractionError(Exception):
    """Raised when extraction cannot produce a valid response."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


SYSTEM_INSTRUCTIONS = """You extract calendar event details from unstructured text into JSON only.

Rules:
- Prefer facts explicitly stated in the event text.
- Produce a concise, useful title.
- Put instructions, reminders, caveats, logistics, and secondary times in notes (plain text; can use short lines or bullets).
- If month or year is missing, choose the nearest reasonable upcoming date relative to currentDate (in the user's timezone context).
- If end time or duration is missing with no clear signal, set endTime one hour after startTime and add a warning with code DEFAULT_DURATION when startTime is present; if startTime is null, endTime may be null.
- If start time is missing or unclear, set startTime to "10:00", set endTime to "11:00" unless a clearer duration/end time is provided, set missingStartTime to false, and add a warning with code DEFAULT_START_TIME.
- If multiple times appear, pick the best single start/end for attending; put other times in notes; optionally add MULTIPLE_POSSIBLE_TIMES.
- Use IANA timezone from the user context for the draft timezone field (must match the provided timezone string exactly).
- guests must be an array of strings (emails if present in text, else empty array).
- Respond with a single JSON object only, no markdown, with exactly two top-level keys: "draft" and "warnings". No other top-level keys.

EventDraft shape for "draft":
- title: string
- date: string YYYY-MM-DD
- startTime: string HH:mm (24h) or null
- endTime: string HH:mm (24h) or null
- timezone: string (IANA, same as user timezone)
- location: string
- notes: string
- guests: string[]
- missingStartTime: boolean (true iff startTime is null)

Each warning object:
- field: one of general, title, date, startTime, endTime, timezone, location, notes, guests, missingStartTime
- code: one of INFERRED_DATE, DEFAULT_START_TIME, DEFAULT_DURATION, MISSING_START_TIME, LOW_CONFIDENCE, MULTIPLE_POSSIBLE_TIMES
- message: non-empty string
"""

DEFAULT_START_TIME = "10:00"
DEFAULT_END_TIME = "11:00"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
WARNING_FIELDS = {
    "general",
    "title",
    "date",
    "startTime",
    "endTime",
    "timezone",
    "location",
    "notes",
    "guests",
    "missingStartTime",
}
WARNING_CODES = {
    "INFERRED_DATE",
    "DEFAULT_START_TIME",
    "DEFAULT_DURATION",
    "MISSING_START_TIME",
    "LOW_CONFIDENCE",
    "MULTIPLE_POSSIBLE_TIMES",
}


def _build_user_message(payload: dict[str, Any]) -> str:
    locale = payload.get("locale") or "en-US"
    return json.dumps(
        {
            "eventText": payload["text"],
            "timezone": payload["timezone"],
            "currentDate": payload["currentDate"],
            "locale": locale,
        },
        ensure_ascii=False,
    )


def _has_warning(warnings: list[Any], code: str) -> bool:
    return any(
        isinstance(warning, dict) and warning.get("code") == code
        for warning in warnings
    )


def _append_warning(
    warnings: list[dict[str, str]], field: str, code: str, message: str
) -> None:
    if not _has_warning(warnings, code):
        warnings.append({"field": field, "code": code, "message": message})


def _string_or_default(value: Any, default: str = "") -> str:
    return value if isinstance(value, str) else default


def _fallback_title(text: str) -> str:
    compact = " ".join(text.split())
    return compact[:80] or "Untitled event"


def _normalize_warnings(raw_warnings: list[Any]) -> list[dict[str, str]]:
    warnings: list[dict[str, str]] = []
    for warning in raw_warnings:
        if not isinstance(warning, dict):
            continue
        field = warning.get("field")
        code = warning.get("code")
        message = warning.get("message")
        if (
            field in WARNING_FIELDS
            and code in WARNING_CODES
            and isinstance(message, str)
            and message.strip()
        ):
            warnings.append(
                {"field": field, "code": code, "message": message.strip()}
            )
    return warnings


def _normalize_response(payload: dict[str, Any], raw: dict[str, Any]) -> dict[str, Any]:
    """Ensure draft.timezone matches request; return {draft, warnings}."""
    if not isinstance(raw, dict):
        raise ExtractionError(
            "INVALID_MODEL_OUTPUT", "Model returned a non-object JSON value."
        )
    draft = raw.get("draft")
    warnings = raw.get("warnings")
    if not isinstance(draft, dict):
        draft = raw
    if not isinstance(warnings, list):
        warnings = []
    draft = dict(draft)
    warnings = [
        warning
        for warning in _normalize_warnings(warnings)
        if warning.get("code") != "MISSING_START_TIME"
    ]

    text = _string_or_default(payload.get("text")).strip()
    draft["title"] = _string_or_default(draft.get("title")).strip() or _fallback_title(
        text
    )
    draft["location"] = _string_or_default(draft.get("location"))
    draft["notes"] = _string_or_default(draft.get("notes"))
    guests = draft.get("guests")
    draft["guests"] = (
        [guest for guest in guests if isinstance(guest, str)]
        if isinstance(guests, list)
        else []
    )

    if not isinstance(draft.get("date"), str) or not DATE_RE.match(draft["date"]):
        draft["date"] = payload["currentDate"]
        _append_warning(
            warnings,
            "date",
            "INFERRED_DATE",
            "No clear date found; defaulted to today's date.",
        )

    start_time = draft.get("startTime")
    if start_time is not None and (
        not isinstance(start_time, str) or not TIME_RE.match(start_time)
    ):
        start_time = None
        draft["startTime"] = None

    end_time = draft.get("endTime")
    if end_time is not None and (
        not isinstance(end_time, str) or not TIME_RE.match(end_time)
    ):
        end_time = None
        draft["endTime"] = None

    if draft.get("startTime") is None:
        draft["startTime"] = DEFAULT_START_TIME
        draft["missingStartTime"] = False
        if draft.get("endTime") is None:
            draft["endTime"] = DEFAULT_END_TIME
            _append_warning(
                warnings,
                "endTime",
                "DEFAULT_DURATION",
                "No duration found; defaulted to one hour.",
            )
        _append_warning(
            warnings,
            "startTime",
            "DEFAULT_START_TIME",
            "No clear start time found; defaulted to 10:00 AM.",
        )
    else:
        draft["missingStartTime"] = False

    if len(text) < 8:
        _append_warning(
            warnings,
            "general",
            "LOW_CONFIDENCE",
            "The source text was very short; review the generated draft carefully.",
        )

    draft["timezone"] = payload["timezone"]
    normalized_draft = {
        "title": draft["title"],
        "date": draft["date"],
        "startTime": draft["startTime"],
        "endTime": draft["endTime"],
        "timezone": draft["timezone"],
        "location": draft["location"],
        "notes": draft["notes"],
        "guests": draft["guests"],
        "missingStartTime": draft["missingStartTime"],
    }
    return {"draft": normalized_draft, "warnings": warnings}


def _openai_chat_completion_json(
    api_key: str,
    base_url: str,
    model: str,
    system_text: str,
    user_text: str,
) -> dict[str, Any]:
    url = base_url.rstrip("/") + "/chat/completions"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_text},
            {"role": "user", "content": user_text},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise ExtractionError(
                "RATE_LIMITED", "The language model rate limit was exceeded."
            ) from e
        raise ExtractionError(
            "LLM_EXTRACTION_FAILED", "The language model request failed."
        ) from e
    except urllib.error.URLError as e:
        raise ExtractionError(
            "LLM_EXTRACTION_FAILED", "Could not reach the language model API."
        ) from e
    except json.JSONDecodeError as e:
        raise ExtractionError(
            "LLM_EXTRACTION_FAILED", "Invalid response from language model API."
        ) from e

    try:
        content = raw["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise ExtractionError(
            "LLM_EXTRACTION_FAILED", "Unexpected language model response shape."
        ) from e
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as e:
        raise ExtractionError(
            "INVALID_MODEL_OUTPUT", "Model did not return valid JSON."
        ) from e
    if not isinstance(parsed, dict):
        raise ExtractionError(
            "INVALID_MODEL_OUTPUT", "Model JSON root must be an object."
        )
    return parsed


def extract_event_from_text(payload: dict[str, Any]) -> dict[str, Any]:
    """Call the default LLM adapter and return ``{ "draft": ..., "warnings": [...] }``.

    ``payload`` must already satisfy ``ExtractEventRequest`` schema. Does not
    validate the response; the Flask route runs JSON Schema validation.
    """
    api_key = (os.environ.get("LLM_API_KEY") or "").strip()
    if not api_key:
        raise ExtractionError(
            "LLM_EXTRACTION_FAILED",
            "LLM is not configured (set LLM_API_KEY).",
        )
    base = (os.environ.get("LLM_API_BASE") or "https://api.openai.com/v1").strip()
    model = (os.environ.get("LLM_MODEL") or "gpt-4o-mini").strip()
    user_msg = _build_user_message(payload)
    parsed = _openai_chat_completion_json(
        api_key, base, model, SYSTEM_INSTRUCTIONS, user_msg
    )
    return _normalize_response(payload, parsed)


def get_extract_event_fn(config: dict[str, Any]) -> ExtractEventFn:
    """Resolve the extractor callable from Flask app config."""
    fn = config.get("EXTRACT_EVENT_FN")
    if fn is not None and callable(fn):
        return fn  # type: ignore[return-value]
    return extract_event_from_text
