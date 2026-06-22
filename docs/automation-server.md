# AskSam DS — automation server runbook

VM: `saira@136.119.127.72`  
Repo: [asksam-datascience-automation](https://github.com/saira-uwc/asksam-datascience-automation)

## Location

| Item | Value |
|------|--------|
| Clone path | `$HOME/asksam-datascience-automation` |
| Env file | `$HOME/asksam-datascience-automation/.env` |
| Node version | 20 (via nvm) |

## Failure email recipients

Set in `.env` as comma-separated addresses (`REPORT_RECIPIENTS`). Current list:

1. arti@shunyalabs.ai  
2. sumit@shunyalabs.ai  
3. yamini@shunyalabs.ai  
4. saira@unitedwecare.com  
5. sb@shunyalabs.ai  
6. ritu@shunyalabs.ai  
7. ayushbar@shunyalabs.ai  
8. ravulamk@shunyalabs.ai  

```bash
# On VM — update before next cron run
cd ~/asksam-datascience-automation
grep -q '^REPORT_RECIPIENTS=' .env \
  && sed -i 's|^REPORT_RECIPIENTS=.*|REPORT_RECIPIENTS=arti@shunyalabs.ai,sumit@shunyalabs.ai,yamini@shunyalabs.ai,saira@unitedwecare.com,sb@shunyalabs.ai,ritu@shunyalabs.ai,ayushbar@shunyalabs.ai,ravulamk@shunyalabs.ai|' .env \
  || echo 'REPORT_RECIPIENTS=arti@shunyalabs.ai,sumit@shunyalabs.ai,yamini@shunyalabs.ai,saira@unitedwecare.com,sb@shunyalabs.ai,ritu@shunyalabs.ai,ayushbar@shunyalabs.ai,ravulamk@shunyalabs.ai' >> .env
```

Requires `EMAIL_WEB_APP_URL` in the same `.env`. Email sends only when tests fail.


| Mode | Command | Schedule suggestion | Log file |
|------|---------|---------------------|----------|
| **RAG API only** (recommended to start) | `npm run automation:run-rag-api` | Every 4h at `:15` | `~/automation-cron-asksam-rag-api.log` |
| **Full suite** (UI + API) | `npm run automation:run` | Every 4h at `:45` or daily | `~/automation-cron-asksam-datascience-automation.log` |

---

## Cron — RAG API only (fast, no login)

```bash
crontab -e
```

Add:

```bash
15 */4 * * * /bin/bash -lc 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null && cd "$HOME/asksam-datascience-automation" && npm run automation:run-rag-api' >> "$HOME/automation-cron-asksam-rag-api.log" 2>&1
```

Tests: `GET /health`, `GET /redis/health`, `GET /vectorstore/health`, `POST /gen-chat`  
No Chromium, no `TEST_EMAIL` required.

---

## Cron — Full suite (optional, UI + API)

```bash
45 */4 * * * /bin/bash -lc 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null && cd "$HOME/asksam-datascience-automation" && npm run automation:run' >> "$HOME/automation-cron-asksam-datascience-automation.log" 2>&1
```

Requires `TEST_EMAIL` in `.env` and Playwright Chromium.

---

## Auto pull — no manual `git pull` needed

Every cron run uses `npm run automation:run-rag-api` (or `automation:run-ds-api`), which **automatically**:

1. `git fetch origin main`
2. `git reset --hard origin/main` — always runs latest code from GitHub
3. `npm ci` — reinstall deps to match that commit
4. Run **RAG (4) + Clinical Notes (5) API tests in one Playwright run** → one Sheet row set → one dashboard push

You only need `git pull` manually if you run tests **outside** the automation script (e.g. `npm run test:ds-api` alone).

Check the log for: `Running commit: abc1234 — ...` to confirm which version ran.

## Manual run

```bash
cd ~/asksam-datascience-automation

# Unified DS API (RAG + Clinical Notes, includes auto pull)
AUTOMATION_SKIP_GIT_PUSH=true npm run automation:run-rag-api   # trial
npm run automation:run-rag-api                                 # + push dashboard

# Same pipeline (alias)
npm run automation:run-ds-api

# Full UI + API (includes auto pull)
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
