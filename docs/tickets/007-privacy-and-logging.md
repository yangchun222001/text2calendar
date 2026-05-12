# Privacy And Logging

## Ticket

### Title

Apply MVP privacy and safe logging rules.

### Type

Tech Debt

### Overview

User input may contain names, emails, locations, and private event details. The MVP should avoid storing raw pasted text and should keep logs limited to operational metadata.

This ticket hardens the implementation against accidental sensitive logging.

### Goal

Ensure the app does not store raw event text, expose API keys, or log sensitive event or guest data by default.

### Description

Review server and client behavior for sensitive data handling. The backend should not log raw pasted text or guest emails. Logs, if any, should be limited to request outcome, latency, error code, and coarse model usage. Environment variables should keep LLM credentials server-side only.

Add documentation or comments where useful so future implementation work does not accidentally introduce raw input storage or broad Google permissions.

### Notes

- Source docs: `docs/prd/prd.md` section 10.
- Source docs: `docs/tech/tech_design.md` sections 3 and 10.
- MVP should not request Google Calendar permissions.

## Plan



## Execution


