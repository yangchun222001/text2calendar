"""Flask backend entrypoint for the Text to Calendar MVP."""

import os
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from flask import Flask, current_app, jsonify, request
from jsonschema import ValidationError

from extraction import ExtractionError, get_extract_event_fn
from validators import validate_extract_event_request, validate_extract_event_response

load_dotenv()

app = Flask(__name__)

SAFE_EXTRACTION_ERROR_MESSAGES = {
    "LLM_EXTRACTION_FAILED": "The language model request failed.",
    "RATE_LIMITED": "The language model rate limit was exceeded.",
    "INVALID_MODEL_OUTPUT": "Model output failed schema validation.",
}


def _validate_iana_timezone(tz: str) -> bool:
    try:
        ZoneInfo(tz)
    except Exception:
        return False
    return True


def _safe_extraction_error_message(code: str) -> str:
    return SAFE_EXTRACTION_ERROR_MESSAGES.get(
        code,
        "Extraction failed.",
    )


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/extract-event")
def extract_event():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()

    # Privacy boundary: do not log payload, raw event text, prompts, model
    # responses, guest emails, or exception messages from this route. If
    # operational logging is added, keep it to status/error-code/latency only.
    if not text:
        return (
            jsonify(
                {
                    "error": {
                        "code": "EMPTY_INPUT",
                        "message": "Event text is required.",
                    }
                }
            ),
            400,
        )

    try:
        validate_extract_event_request(payload)
    except ValidationError:
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_REQUEST",
                        "message": "Request body failed schema validation.",
                    }
                }
            ),
            400,
        )

    tz = payload.get("timezone") or ""
    if not _validate_iana_timezone(tz):
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_REQUEST",
                        "message": "timezone must be a valid IANA timezone name.",
                    }
                }
            ),
            400,
        )

    extract_fn = get_extract_event_fn(current_app.config)
    try:
        result = extract_fn(payload)
    except ExtractionError as e:
        status = 502
        if e.code == "RATE_LIMITED":
            status = 429
        return (
            jsonify(
                {
                    "error": {
                        "code": e.code,
                        "message": _safe_extraction_error_message(e.code),
                    }
                }
            ),
            status,
        )
    except Exception:
        return (
            jsonify(
                {
                    "error": {
                        "code": "UNKNOWN",
                        "message": "An unexpected error occurred during extraction.",
                    }
                }
            ),
            500,
        )

    try:
        validate_extract_event_response(result)
    except (ValidationError, ValueError):
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_MODEL_OUTPUT",
                        "message": "Model output failed schema validation.",
                    }
                }
            ),
            502,
        )

    return jsonify(result), 200


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.environ.get("PORT", "5000")),
        debug=True,
    )
