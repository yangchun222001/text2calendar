"""JSON Schema validation for extraction API contracts (shared with frontend)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

BASE_URI = "https://calendar-tool.local/schemas/extraction"


def _load_bundle() -> dict[str, Any]:
    path = (
        Path(__file__).resolve().parent.parent
        / "shared"
        / "schemas"
        / "extraction.schemas.json"
    )
    with path.open(encoding="utf-8") as f:
        return json.load(f)


_BUNDLE = _load_bundle()
_REGISTRY = Registry().with_resource(BASE_URI, Resource.from_contents(_BUNDLE))


def _validator_for(def_name: str) -> Draft202012Validator:
    schema: dict[str, Any] = {"$ref": f"{BASE_URI}#/$defs/{def_name}"}
    return Draft202012Validator(schema, registry=_REGISTRY)


_EVENT_DRAFT = _validator_for("EventDraft")
_EXTRACTION_WARNING = _validator_for("ExtractionWarning")
_EXTRACT_EVENT_REQUEST = _validator_for("ExtractEventRequest")
_EXTRACT_EVENT_RESPONSE = _validator_for("ExtractEventResponse")
_EXTRACT_EVENT_ERROR = _validator_for("ExtractEventError")


def assert_event_draft_semantics(draft: dict[str, Any]) -> None:
    """Enforce missingStartTime <=> startTime is null (tech design)."""
    missing = draft.get("missingStartTime")
    start = draft.get("startTime")
    if missing is not (start is None):
        raise ValueError(
            "EventDraft: missingStartTime must be true iff startTime is null; "
            f"got missingStartTime={missing!r}, startTime={start!r}"
        )


def validate_event_draft(instance: Any) -> None:
    _EVENT_DRAFT.validate(instance)
    if isinstance(instance, dict):
        assert_event_draft_semantics(instance)


def validate_extraction_warning(instance: Any) -> None:
    _EXTRACTION_WARNING.validate(instance)


def validate_extract_event_request(instance: Any) -> None:
    _EXTRACT_EVENT_REQUEST.validate(instance)


def validate_extract_event_response(instance: Any) -> None:
    _EXTRACT_EVENT_RESPONSE.validate(instance)
    if isinstance(instance, dict):
        draft = instance.get("draft")
        if isinstance(draft, dict):
            assert_event_draft_semantics(draft)


def validate_extract_event_error(instance: Any) -> None:
    _EXTRACT_EVENT_ERROR.validate(instance)
