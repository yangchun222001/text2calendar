# Tool UI

## Ticket

### Title

Build the single-page text-to-calendar UI.

### Type

Feature

### Overview

The MVP should open directly to the tool: raw event text input, timezone or context controls, editable event preview, guest entry, and a Google Calendar action. The demo already establishes the broad layout and state expectations.

This ticket builds the main user experience without requiring direct Google Calendar behavior to be complete.

### Goal

Create a responsive single-page interface where users can paste event text, generate a draft, edit all draft fields, and manage guest emails.

### Description

Implement the frontend state machine with `idle`, `loading`, `generated`, and `error` states. The page should include a large raw text area, timezone selection or display, generate button, editable preview fields, notes editing, guest email input with chips or list behavior, warning display, and loading and error states.

The layout should follow the demo and technical design: compact header, two-column desktop layout, stacked mobile layout, input on the left, draft editor on the right. Empty input should show a clear validation message before the API is called.

### Notes

- Source docs: `docs/prd/prd.md` sections 6, 7.1, 7.3, 7.4, and 8.
- Source docs: `docs/tech/tech_design.md` section 4.
- Every extracted field must be editable before opening Google Calendar.

## Plan



## Execution


