# Event Draft Schema

## Ticket

### Title

Define shared event draft schemas and validation.

### Type

Feature

### Overview

The frontend and backend need one canonical event draft shape so extracted data, editable UI state, warnings, validation, and Google Calendar URL generation all speak the same language.

This ticket turns the schema from the technical design into a canonical JSON contract plus runtime validators.

### Goal

Create shared request, response, draft, warning, and error schemas for the extraction workflow.

### Description

Define `EventDraft`, `ExtractionWarning`, `ExtractEventRequest`, `ExtractEventResponse`, and `ExtractEventError` as JSON schemas or equivalent shared contract files. Add runtime validation for API input and model output, including date format, local time format, guest array shape, `missingStartTime`, and warning codes.

The schema should support these draft fields: title, date, start time, end time, timezone, location, notes, guests, and missing-start-time status. It should also support extraction warnings for inferred dates, default duration, missing start time, low confidence, and multiple possible times.

### Notes

- Source docs: `docs/tech/tech_design.md` sections 5 and 6.
- Runtime validation should be usable from both API tests and UI helper tests.
- Do not store raw pasted text as part of the event draft.

## Plan



## Execution

