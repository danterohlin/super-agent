# V1 plan — Telegram executive assistant

## Tasks

- [x] Branch + architecture notes (`memory.md`, this file)
- [x] Node/TS project: grammy, Anthropic SDK, Octokit, SQLite, zod
- [x] Config + `.env.example`
- [x] SQLite schema: messages + memory KV + migrations/bootstrap
- [x] Anthropic agent loop with GitHub + Sentry tools
- [x] Telegram bot: allowlist, wire agent, typing indicators, split long replies
- [x] Background interval (5 min) stub for future monitors
- [x] README: setup, env, run on Mac
- [x] `npm run build` + smoke test
- [ ] Commit, push, open PR

## Future (not V1)

- Slack / Trello / email polling + triage
- Cursor SDK for code fixes
- Multi-org Sentry
