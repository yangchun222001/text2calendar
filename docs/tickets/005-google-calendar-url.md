# Google Calendar URL

## Ticket

### Title

Generate and open pre-filled Google Calendar links.

### Type

Feature

### Overview

The MVP adds events through Google Calendar's web create-event URL rather than OAuth or direct Calendar API writes. The app must build a correct URL from the edited draft and block the action when required calendar fields are missing.

This ticket implements the final user-facing action after a draft has been reviewed.

### Goal

Allow users to open Google Calendar with title, date, time, timezone, location, notes, and guest emails pre-filled when possible.

### Description

Create a Google Calendar URL builder that maps the edited draft into the expected query parameters. It should format date/time ranges correctly, include timezone, encode title, location, and notes, and include guests when Google Calendar supports it.

The frontend should block opening Google Calendar when start time or date is missing, when guest emails are invalid, or when end time is not after start time. The UI should clearly communicate that the event is not created until the user saves it in Google Calendar.

### Notes

- Source docs: `docs/prd/prd.md` sections 7.4 and 7.5.
- Source docs: `docs/tech/tech_design.md` section 8.
- If guest prefill is unreliable, include guest emails in notes as a fallback.

## Plan


## Execution

