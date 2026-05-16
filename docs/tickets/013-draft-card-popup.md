# Draft Card Popup

## Ticket

### Title

Show generated calendar drafts in a popup card.

### Type

Feature

### Overview

The current mobile layout renders a persistent `Calendar Draft` section below
the event text input. Before a draft exists, that section shows a large empty
placeholder, which takes valuable screen space and makes the primary flow feel
heavier than necessary.

### Goal

After the user clicks `Generate event` and extraction succeeds, show the
editable preview/draft as a focused popup card. Remove the initial empty draft
placeholder from the page.

### Description

Expected behavior:

- The first screen should focus on event text input and primary actions.
- No large `No draft yet` calendar draft placeholder should render before
  generation.
- While extraction is loading, keep a clear loading state near the input.
- If extraction fails, show the error near the input so the user can retry.
- When extraction succeeds, open the calendar draft/editor in a card-style
  popup.
- The draft popup should keep the existing editable fields, guest entry,
  warnings, validation errors, and Google Calendar action.
- The user should be able to close the draft popup without clearing the draft.
- Regenerating should reopen the popup with the latest generated draft.

### Notes

- This is a presentation change only; backend extraction behavior and calendar
  URL generation should remain unchanged.

## Plan

### Execution Plan

Move the preview rendering out of the persistent right-side column and into a
modal-style card that opens after successful extraction. Keep loading and error
states on the main page below the input actions.

### Questions

- None. The requested behavior is direct enough to implement with a focused
  frontend presentation change.

### Steps

1. Add UI state to control whether the draft card is open.
2. Open the card after successful extraction and close it from a card close
   button.
3. Remove the idle `Calendar Draft` placeholder from the main page.
4. Move loading and extraction errors near the input area.
5. Update styles for the single input surface and popup card.
6. Add or update frontend tests for the new draft card behavior.
7. Run frontend tests.

### Files To Touch

- `frontend/src/App.jsx`
- `frontend/src/App.test.jsx`
- `frontend/src/styles.css`

## Execution

### Execution Summary

- Added a draft card open/close state in the React app.
- Removed the persistent two-column preview area and the initial `No draft yet`
  placeholder.
- Kept loading and extraction error states on the main input panel.
- Opened the editable calendar draft in a centered popup card after successful
  extraction.
- Added a `View draft` action so a closed generated draft can be reopened
  without regenerating.
- Moved extractor warnings and draft guidance to the bottom of the draft card.
- Removed the start-time helper copy and the notes read-only preview so the card
  stays focused on editable fields.
- Preserved existing draft editing, guest handling, validation, warnings, and
  Google Calendar URL behavior.
- Added frontend test coverage for the popup draft card and removed idle
  placeholder behavior.

### Commits

- _Pending._

### Notes

- `cd frontend && npm test -- --run` - 41 passed.
- `cd frontend && npm run build` - success.
- `docs/tickets/` is ignored by `.gitignore`, so this local ticket file will
  not appear in normal `git status` unless ignore rules are changed.
