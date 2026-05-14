# Text2Calendar PRD

## 1. Overview

This product is a simple web page that converts unstructured event text into a clean Google Calendar event. A user pastes text into an input box, the app uses an LLM to extract the event details, shows a human-readable preview, and lets the user open a pre-filled Google Calendar event creation page.

The core value is reducing the small but annoying work of reading event-related text, finding the real time/location/instructions, and manually creating calendar events with useful notes.

## 2. Target User

Primary user:

- Anyone who receives event details in unstructured text, such as emails, messages, flyers, newsletters, or web pages.
- They want to quickly create accurate calendar events without manually copying every field.
- They may need to invite other people by email.

## 3. Example Input And Output

### Example Input

```text
5/6 : Wednesday May 6th will be our "Restaurant Night" Fundraiser at the Foster City Food Trucks at Leo J. Ryan Park. If you choose to participate, bring your child to the event at 5:15 to check in with Mrs. Lazar (finding parking is difficult, so plan ahead). Performances will be between 5:30 and 6:00pm. Please send your child in the their Beach Park T-Shirt.
```

### Expected Extracted Calendar Event

```text
Date: May 6
Time: 5:15 - 6:00 PM
Title: Nora Performance @ Food Truck Night
Location: Foster City Food Trucks at Leo J. Ryan Park

Notes:
- 5:15 check-in with Mrs. Lazar
- 5:30-6:00 performance
- Wear Beach Park T-Shirt
- Parking is difficult, plan ahead
```

## 4. Goals

- Let a user paste natural-language event text and get a structured calendar event.
- Generate a useful event title, time, date, location, and notes.
- Let the user edit the extracted event before adding it to a calendar.
- Support adding the event to Google Calendar.
- Support pre-filling guest emails in Google Calendar when possible.

## 5. Non-Goals For MVP

- Full email inbox integration.
- Automatic recurring event detection.
- Multi-event extraction from one long newsletter.
- Native mobile apps.
- Payment, sharing, or team workspace features.

## 6. User Flow

1. User opens the web page.
2. User pastes event text into a large input box.
3. User optionally enters context, such as timezone, preferred title style, or other details that help interpret the text.
4. User clicks `Generate Event`.
5. App sends the text to an LLM.
6. App shows a preview form with editable fields:
   - Title
   - Date
   - Start time
   - End time
   - Location
   - Notes
   - Guests
7. User edits anything that looks wrong.
8. User clicks `Add to Google Calendar`.
9. App opens a Google Calendar event creation page with the event details pre-filled.
10. User reviews the event in Google Calendar and clicks save.
11. If guests are included, Google Calendar handles guest invitations after the user saves the event.

## 7. Functional Requirements

### 7.1 Text Input

- The page must include a large text area for the raw event text.
- The input should accept plain text copied from email, chat, PDF, web pages, portals, or newsletters.
- The user should be able to submit with a button.
- Empty input should show a clear validation message.

### 7.2 LLM Event Extraction

The app should use an LLM to turn the raw event text into a structured event draft.

The event draft should include:

- Title
- Date
- Start time
- End time
- Timezone
- Location
- Notes
- Whether the start time was defaulted

Extraction behavior:

- Preserve practical details that matter for attending the event.
- Create a concise, useful title from the event text.
- Put instructions, timing details, reminders, and caveats into notes.
- Prefer information explicitly stated in the event text.
- If the event text omits the year or month, default to the nearest reasonable upcoming date using the current date as context.
- If the event text does not include an end time, duration, or other clear signal for event length, default the event duration to 1 hour.
- If the event text does not include a clear start time, default the start time to 10:00 AM and make that default visible/editable in the preview.
- Other fields can use LLM-generated values or product defaults, and the user can edit them in the preview.
- Use the user's local timezone by default.

### 7.3 Preview And Editing

- The app must show the extracted event before creating anything.
- Every extracted field must be editable.
- Notes should be easy to scan, preferably bullet-style or short lines.
- A defaulted start time should be clearly indicated so the user can review or edit it before opening Google Calendar.
- The user must be able to regenerate after editing the source input.

### 7.4 Guests

- The preview must include a guest email input.
- The user can add one or more guest email addresses.
- Invalid email addresses should be rejected before opening Google Calendar.
- Guest emails should be included in the Google Calendar pre-filled event link when possible.
- Google Calendar should handle invitations after the user reviews and saves the event.

### 7.5 Google Calendar

MVP should support Google Calendar through a pre-filled Google Calendar event link.

- The app does not require Google OAuth for MVP.
- The app generates a Google Calendar URL with pre-filled title, date, time, location, notes, and guest emails when supported.
- User signs in to Google only if Google Calendar requires it after the link opens.
- User reviews and saves the event inside Google Calendar.
- The app should clearly communicate that the event is not added until the user saves it in Google Calendar.

## 8. UX Requirements

- First screen should be the actual tool, not a marketing landing page.
- The page should feel simple and fast.
- The primary layout should have:
  - Raw text input
  - Generate button
  - Event preview/editor
  - `Add to Google Calendar` button
- The app should make the user feel in control. It should never silently create an event before preview.
- Error messages should explain what the user can do next.

## 9. Edge Cases

- Input may omit year, timezone, end time, duration, or location.
- Input may include multiple times, such as arrival time, check-in time, and performance time.
- Input may include relative dates like "tomorrow" or "next Wednesday".
- Input may contain multiple possible locations or extra logistics.
- Input may include details that belong in notes rather than the calendar title.
- If year or month is missing, the app should default to the nearest reasonable upcoming date and let the user edit it in the preview.
- If event length is missing, the app should use a 1-hour default and let the user edit it in the preview.
- If start time is missing, the app should default to 10:00 AM and let the user edit it in the preview.
- If event extraction fails, the app should show a clear error and let the user try again.

## 10. Privacy And Safety

- User input may contain names, organizations, emails, and locations.
- The app should avoid storing raw input unless needed for debugging and explicitly disclosed.
- If logs are used, redact emails and obvious person names where practical.
- MVP should not request Google Calendar permissions.
- If direct calendar creation is added later, OAuth tokens must be stored securely and the app should request the minimum calendar permission needed.

## 11. Success Metrics

- User can create a correct calendar event from the example input in under 30 seconds.
- Google Calendar opens with the correct pre-filled event details.

## 12. MVP Scope

MVP includes:

- Single-page web app.
- Paste text input.
- LLM extraction to a structured event draft.
- Editable preview.
- Guest email field.
- Google Calendar pre-filled event link.

MVP can defer:

- Apple Calendar support.
- `.ics` export.
- Direct Google Calendar creation through OAuth and the Calendar API.
- Multi-event newsletter parsing.
- User accounts.
- Saved event history.
- Email inbox import.

## 13. Open Questions

- Should guests be typed manually every time, or should the app remember common guests?
- Do Google Calendar pre-filled links support guest emails reliably enough for MVP, or should guests be copied into notes as a fallback?
