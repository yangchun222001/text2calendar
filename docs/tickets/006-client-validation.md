# Client Validation

## Ticket

### Title

Add client-side validation for drafts and guests.

### Type

Feature

### Overview

The app should catch common problems before sending requests or opening Google Calendar. Validation is especially important because the LLM may infer data and because Google Calendar links are less forgiving than a local form.

This ticket focuses on user-correctable validation and clear messages.

### Goal

Prevent empty extraction requests and invalid calendar opens while explaining what the user can do next.

### Description

Add client-side validation for required raw input, required date, required start time before calendar opening, end time after start time, valid timezone, and valid guest email addresses. Invalid guests should be rejected before being added to the draft or before opening Google Calendar.

Missing start time should be clearly indicated because it is required for a useful timed Google Calendar event. Validation messages should be specific and should not erase the user's draft.

### Notes

- Source docs: `docs/prd/prd.md` sections 7.1, 7.3, 7.4, and 9.
- Source docs: `docs/tech/tech_design.md` section 9.
- Server-side validation is handled by the extraction API ticket; this ticket is for browser behavior.

## Plan



## Execution


