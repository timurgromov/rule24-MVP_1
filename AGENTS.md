# Rule24 Project Rules

This file defines local execution rules for coding work in this repository.

## Workflow
- Commit and push after each completed change block.
- Keep commits small and scoped to one task.
- Do not amend commits unless explicitly requested.

## Scope Control
- Do not change demo UX flows unless explicitly requested.
- Do not change business logic without syncing `TASKS.md` and `PROJECT_SPEC.md`.
- Do not refactor unrelated files.

## Architecture Safety
- Use additive migrations for schema changes.
- Do not remove or rename existing DB fields unless explicitly approved.
- Keep `session.status` lifecycle separate from outcome confirmation and transaction status.
- Keep late-cancellation charge source equal to `session.price`.
- Sessions are cancelled, not physically deleted, in normal flow.

## Phase Discipline
- Follow phase order strictly from `TASKS.md`.
- Do not start the next phase until current phase scope is complete.
