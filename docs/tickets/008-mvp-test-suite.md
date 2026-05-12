# MVP Test Suite

## Ticket

### Title

Add focused MVP tests for extraction, validation, URLs, and UI flow.

### Type

Feature

### Overview

The technical design calls for unit, extraction, and UI tests around the core user journey. The MVP has a small enough surface that focused tests can protect the important behavior without building a heavy test system.

This ticket adds confidence that the app can create a correct event from realistic pasted text and handle common edge cases.

### Goal

Cover the core MVP behavior with automated tests that can run locally and in CI.

### Description

Add tests for event draft schema validation, empty input handling, guest email validation, Google Calendar URL generation, timezone-aware date/time formatting, and the PRD sample extraction behavior. Add UI tests for paste, generate, edit, guest entry, validation errors, and opening the Google Calendar URL.

Where LLM output would make tests unstable, use mocks or fixtures for the extraction service and keep one or more integration-style tests focused on prompt/output validation rather than live model calls.

### Notes

- Source docs: `docs/tech/tech_design.md` section 11.
- Source docs: `docs/prd/prd.md` sections 3, 9, and 11.
- Tests should avoid sending real private event text to external services during normal runs.

## Plan



## Execution


