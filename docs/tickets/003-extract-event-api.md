# Extract Event API

## Ticket

### Title

Implement the event extraction API.

### Type

Feature

### Overview

The product depends on an LLM to convert pasted event text into a structured calendar draft. The browser must not call the LLM directly because the API key must remain server-side.

This ticket implements `POST /api/extract-event` and connects it to structured model output.

### Goal

Return a validated `EventDraft` and extraction warnings from raw user text, timezone, current date, and locale context.

### Description

Implement the backend route described in the technical design. The route should reject empty input before calling the LLM, validate timezone input, call the configured LLM with extraction rules from the PRD, validate structured model output, and return consistent error codes.

The prompt or model instructions should prefer explicit facts, create a concise title, preserve logistics in notes, infer nearest reasonable upcoming dates when month or year is missing, default missing durations to one hour, and mark missing start time as blocking.

### Notes

- Source docs: `docs/prd/prd.md` section 7.2 and `docs/tech/tech_design.md` sections 5 and 7.
- The endpoint must not log raw event text or guest emails.
- MVP should not require Google OAuth or direct calendar writes.

## Plan



## Execution

