# AskSam DS — automation server runbook

VM: `saira@136.119.127.72`  
Repo: [asksam-datascience-automation](https://github.com/saira-uwc/asksam-datascience-automation)

## Location

| Item | Value |
|------|--------|
| Clone path | `$HOME/asksam-datascience-automation` |
| Env file | `$HOME/asksam-datascience-automation/.env` |
| Node version | 20 (via nvm) |

## Two cron modes

| Mode | Command | Schedule suggestion | Log file |
|------|---------|---------------------|----------|
| **RAG API only** (recommended to start) | `npm run automation:run-rag-api` | Every 2h at `:15` | `~/automation-cron-asksam-rag-api.log` |
| **Full suite** (UI + API) | `npm run automation:run` | Every 2h at `:45` or daily | `~/automation-cron-asksam-datascience-automation.log` |

---

## Cron — RAG API only (fast, no login)

```bash
crontab -e
```

Add:

```bash
15 */2 * * * /bin/bash -lc 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null && cd "$HOME/asksam-datascience-automation" && npm run automation:run-rag-api' >> "$HOME/automation-cron-asksam-rag-api.log" 2>&1
```

Tests: `GET /health`, `GET /redis/health`, `GET /vectorstore/health`, `POST /gen-chat`  
No Chromium, no `TEST_EMAIL` required.

---

## Cron — Full suite (optional, UI + API)

```bash
45 */2 * * * /bin/bash -lc 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null && cd "$HOME/asksam-datascience-automation" && npm run automation:run' >> "$HOME/automation-cron-asksam-datascience-automation.log" 2>&1
```

Requires `TEST_EMAIL` in `.env` and Playwright Chromium.

---

## Manual run

```bash
cd ~/asksam-datascience-automation

# RAG API only
AUTOMATION_SKIP_GIT_PUSH=true npm run automation:run-rag-api   # trial
npm run automation:run-rag-api                                 # + push dashboard

# Full UI + API
AUTOMATION_SKIP_GIT_PUSH=true npm run automation:run
npm run automation:run
```

## Logs

```bash
tail -f ~/automation-cron-asksam-rag-api.log
tail -f ~/automation-cron-asksam-datascience-automation.log
```

## GitHub Pages

Dashboard: [https://saira-uwc.github.io/asksam-datascience-automation/](https://saira-uwc.github.io/asksam-datascience-automation/)

Ensure Pages source = **`/docs`** folder on `main`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Stale code on VM | `git fetch origin main && git reset --hard origin/main` |
| `git push` fails | Deploy key + SSH host `github.com-asksam-datascience-automation` |
| RAG tests fail | Check `RAG_API_BASE_URL` in `.env` |
| UI tests fail | Set `TEST_EMAIL`; run `npx playwright install chromium` |
| Dashboard empty | Confirm cron log shows `Dashboard data pushed` |
