# Ticket Schema

This document defines the structure for project tickets.

Unlike a traditional one-time planning ticket, each ticket should travel through the full work lifecycle:

1. Ticket definition
2. Planning
3. Execution

Each stage attaches its own content when that stage happens. A ticket can start small and become more complete over time.

## 1. Ticket Section

The ticket section describes what the work is and why it exists.

```md
# <Ticket Title>

## Ticket

### Title

<Short human-readable title.>

### Type

<Feature | Bug | Tech Debt | Chore | Docs | Design | Research>

### Overview

<One or two paragraphs describing the context and the problem.>

### Goal

<The outcome this ticket should achieve.>

### Description

<Detailed scope, behavior, constraints, or user-facing expectations.>

### Notes

<Extra context, links, assumptions, or non-goals.>
```

Field guidance:

- `title`: concise name for scanning and references.
- `type`: broad category of work.
- `overview`: why this ticket exists.
- `goal`: what should be true when the ticket is done.
- `description`: what is included in the work.
- `notes`: supporting context that does not belong in the core scope.

## 2. Plan Section

The plan section is attached after the ticket has enough context to design the work.

```md
## Plan

### Execution Plan

<Short plan for how the work should be approached.>

### Questions

- <Open question or decision needed before/during implementation.>

### Steps

1. <Step one.>
2. <Step two.>
3. <Step three.>

### Files To Touch

- `<path/to/file>`
```

Field guidance:

- `execution plan`: implementation strategy or sequencing.
- `questions`: unresolved items, product decisions, or technical unknowns.
- `steps`: concrete tasks that can be checked off or updated.
- `files to touch`: expected files or directories involved in the work.

## 3. Execution Section

The execution section is attached after or during implementation.

```md
## Execution

### Execution Summary

<What changed and what was completed.>

### Commits

- `<commit-sha>` <commit summary>

### Notes

<Implementation notes, follow-ups, test results, or deviations from the plan.>
```

Field guidance:

- `execution summary`: final record of what actually happened.
- `commits`: related commits, PRs, or change references.
- `notes`: test results, tradeoffs, follow-up work, or anything future readers should know.

## Full Template

```md
# <Ticket Title>

## Ticket

### Title

<Short human-readable title.>

### Type

<Feature | Bug | Tech Debt | Chore | Docs | Design | Research>

### Overview

<One or two paragraphs describing the context and the problem.>

### Goal

<The outcome this ticket should achieve.>

### Description

<Detailed scope, behavior, constraints, or user-facing expectations.>

### Notes

<Extra context, links, assumptions, or non-goals.>

## Plan

### Execution Plan

<Short plan for how the work should be approached.>

### Questions

- <Open question or decision needed before/during implementation.>

### Steps

1. <Step one.>
2. <Step two.>
3. <Step three.>

### Files To Touch

- `<path/to/file>`

## Execution

### Execution Summary

<What changed and what was completed.>

### Commits

- `<commit-sha>` <commit summary>

### Notes

<Implementation notes, follow-ups, test results, or deviations from the plan.>
```
