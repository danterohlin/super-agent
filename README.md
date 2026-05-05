# Super Agent

Telegram executive assistant: **grammy** + **Claude** (tool use) + **GitHub** + **Sentry** + **SQLite** memory. Long polling; intended to run on your Mac with `npm run dev` or `npm start` after `npm run build`.

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. `npm install`
3. `npm run dev` (or `npm run build && npm start`)

**Telegram:** create a bot with [@BotFather](https://t.me/BotFather), use the token in `.env`.

**Allowed user:** only the configured numeric Telegram user ID can chat; others get `Unauthorized.`

**GitHub:** classic PAT or fine-grained token with repo read scope for the repos you need.

**Sentry:** org auth token (or other bearer the API accepts) and org slug; optional `SENTRY_PROJECT_SLUG` to scope issue lists.

## Background jobs

A timer runs every 5 minutes (configurable) and logs a placeholder. Wire Slack / email / Trello triage there later.
