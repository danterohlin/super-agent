# Architectural decisions

## Runtime

- **Node.js + TypeScript**, **grammy** for Telegram, **long polling** (runs on the user's Mac).
- Single process: Telegram updates + optional background interval in the same process.

## Security

- **Allowlist**: only Telegram user ID `6525313647` is accepted; others get a short reject message or silence.
- **Secrets**: `.env` only in V1 (not committed). `.env.example` documents keys.

## AI

- **Anthropic Messages API** with **tool use**; the model lists GitHub/Sentry tools and the host executes them in a loop until a final assistant message.
- Default model configurable via `ANTHROPIC_MODEL`; sensible default if unset.

## Persistence

- **SQLite** (`better-sqlite3`) for message history and durable key/value memory the model can update.
- DB path from `DATABASE_PATH` (default `./data/bot.sqlite`).

## Integrations

- **GitHub**: `@octokit/rest` with classic PAT or fine-grained token; scope = everything the token can access (list repos, search code, read files, issues, PRs).
- **Sentry**: REST API v0 with **one org** in V1 (`SENTRY_ORG_SLUG`); optional `SENTRY_PROJECT_SLUG` to narrow scope when listing issues.

## Background jobs (V1 stub)

- **5-minute `setInterval`** with a no-op handler and a log line; ready to plug Slack/Trello/email later without changing the process model.

## Out of scope (V1)

- Slack, Trello, email, Cursor SDK, webhooks, multi-user.
