# Backend

Flask API for the Text to Calendar MVP. Hosts the extraction endpoint and keeps
`LLM_API_KEY` server-side.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then set LLM_API_KEY for live LLM calls
```

Optional environment variables for the default OpenAI-compatible client:

- `LLM_API_BASE` — default `https://api.openai.com/v1`
- `LLM_MODEL` — default `gpt-4o-mini`

Tests inject `app.config["EXTRACT_EVENT_FN"]` so they never call the network.

## Run

```bash
python app.py          # http://127.0.0.1:5000
```

## Endpoints

- `GET /api/health` returns `{ "status": "ok" }`.
- `POST /api/extract-event` accepts
  `{ "text": "...", "timezone": "...", "currentDate": "YYYY-MM-DD", "locale?": "..." }`.
  Empty `text` returns `400 EMPTY_INPUT`. Non-empty `text` with an invalid body
  (missing fields or bad formats) returns `400 INVALID_REQUEST`. Invalid IANA
  `timezone` returns `400 INVALID_REQUEST`. On success returns `200` with
  `{ "draft": EventDraft, "warnings": [...] }`. If `LLM_API_KEY` is unset,
  returns `502 LLM_EXTRACTION_FAILED`. Other failures may return
  `502 LLM_EXTRACTION_FAILED`, `502 INVALID_MODEL_OUTPUT`, `429 RATE_LIMITED`,
  or `500 UNKNOWN` (see shared error schema).

## Test

```bash
pytest
```
