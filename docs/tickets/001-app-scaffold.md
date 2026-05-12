# Frontend And Flask Backend Scaffold

## Ticket

### Title

Create the MVP frontend and Flask backend scaffold.

### Type

Chore

### Overview

The project currently contains product, technical, and demo documentation, but no runnable application scaffold. The MVP needs a small React + JavaScript + Vite frontend with one page and a Flask backend with one server-side extraction endpoint.

This ticket establishes the application foundation so later tickets can add extraction, editing, validation, and Google Calendar behavior without deciding the project shape repeatedly.

### Goal

Create a runnable split app structure: a React + JavaScript + Vite frontend that hosts the single-page tool, plus a Flask backend that hosts health checks, environment loading, and the extraction API route.

### Description

Set up the frontend with React, JavaScript, Vite, `"type": "module"`, a basic styling approach, and linting or formatting defaults. Set up the backend with Flask, a health check or minimal app entrypoint, a backend dependency file, local environment loading, and environment variable support for the LLM API key. The scaffold should keep the API key backend-only and should not introduce accounts, databases, Google OAuth, or direct calendar writes.

The first screen should be reserved for the actual text-to-calendar tool rather than a marketing page. The scaffold can start with placeholder UI, but it should be ready for the demo-inspired layout in later tickets.

### Notes

- Source docs: `docs/prd/prd.md`, `docs/tech/tech_design.md`.
- Suggested stack from tech design: React, JavaScript, Vite, `"type": "module"`, Flask backend, runtime validation, server-side Python LLM SDK call.
- The demo in `docs/demo/calendar tool` is a visual and interaction reference.
- Backend scaffold should live in `backend/`; frontend scaffold should live in `frontend/`.

## Plan

### Execution Plan


### Steps



## Execution
