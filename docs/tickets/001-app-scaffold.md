# App Scaffold

## Ticket

### Title

Create the MVP web app scaffold.

### Type

Chore

### Overview

The project currently contains product, technical, and demo documentation, but no runnable application scaffold. The MVP needs a small full-stack web app with one page and one server-side extraction endpoint.

This ticket establishes the application foundation so later tickets can add extraction, editing, validation, and Google Calendar behavior without deciding the project shape repeatedly.

### Goal

Create a runnable Next.js or equivalent React full-stack app structure that can host the single-page tool and server-side API route.

### Description

Set up the app with TypeScript, React, a basic styling approach, linting or formatting defaults, and environment variable support for the LLM API key. The scaffold should keep the API key server-only and should not introduce accounts, databases, Google OAuth, or direct calendar writes.

The first screen should be reserved for the actual text-to-calendar tool rather than a marketing page. The scaffold can start with placeholder UI, but it should be ready for the demo-inspired layout in later tickets.

### Notes

- Source docs: `docs/prd/prd.md`, `docs/tech/tech_design.md`.
- Suggested stack from tech design: Next.js, React, TypeScript, runtime validation, server-side LLM SDK call.
- The demo in `docs/demo/calendar tool` is a visual and interaction reference.

## Plan

## Execution