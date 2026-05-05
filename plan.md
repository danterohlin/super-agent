# V1 plan — Telegram executive assistant

## Tasks

- [x] Branch + architecture notes (`memory.md`, this file)
- [ ] Node/TS project: grammy, Anthropic SDK, Octokit, SQLite, zod
- [ ] Config + `.env.example`
- [ ] SQLite schema: messages + memory KV + migrations/bootstrap
- [ ] Anthropic agent loop with GitHub + Sentry tools
- [ ] Telegram bot: allowlist, wire agent, typing indicators, split long replies
- [ ] Background interval (5 min) stub for future monitors
- [ ] README: setup, env, run on Mac
- [ ] `npm run build` + smoke test
- [ ] Commit, push, open PR

## Future (not V1)

- Slack / Trello / email polling + triage
- Cursor SDK for code fixes
- Multi-org Sentry
