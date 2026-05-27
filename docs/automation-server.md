# AskSam DS — automation server runbook

Short reference for the Linux VM that runs scheduled Playwright tests.

## Location

| Item | Value |
|------|--------|
| Clone path | `$HOME/asksam-datascience-automation` |
| Cron log | `$HOME/automation-cron-asksam-datascience-automation.log` |
| Env file | `$HOME/asksam-datascience-automation/.env` |
| Node version | 20 (via nvm) |

## Cron (every 2 hours — adjust as needed)

```bash
0 */2 * * * /bin/bash -lc 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null && cd "$HOME/asksam-datascience-automation" && npm run automation:run' >> "$HOME/automation-cron-asksam-datascience-automation.log" 2>&1
```

## Manual run

```bash
cd ~/asksam-datascience-automation
AUTOMATION_SKIP_GIT_PUSH=true npm run automation:run   # trial — no git push
npm run automation:run                                # full pipeline
```

## Pipeline steps (`scripts/run-automation-machine.sh`)

1. Require `.env`
2. `git fetch` + `reset --hard origin/main`
3. `npm ci` + Playwright Chromium
4. `npx playwright test` (failures do not abort)
5. `node scripts/generate-dashboard.js`
6. Commit/push `docs/data`, `docs/history`, `docs/exports`, `docs/artifacts` to `main`
7. `node scripts/send-email-report.js` (failure-only)

## Logs

```bash
tail -f ~/automation-cron-asksam-datascience-automation.log
```

## GitHub Pages

Dashboard: `https://saira-uwc.github.io/asksam-datascience-automation/` (update `DASHBOARD_PAGES_URL` in `.env` if repo name differs).

Pages deploys automatically when dashboard data is pushed to `main` (`.github/workflows/pages.yml`).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Stale code on VM | `git fetch origin main && git reset --hard origin/main` |
| `git push` fails | Check deploy key, SSH Host alias, git user.name/email |
| Playwright browser missing | `npx playwright install chromium` |
| Missing OS libs | Admin runs `PLAYWRIGHT_WITH_DEPS=true npx playwright install --with-deps chromium` once |
| Pages not updating | Confirm GitHub Pages source = **GitHub Actions**; check workflow on `main` |
| Email not sent | Expected when pass rate is 100%; verify `EMAIL_WEB_APP_URL` + `REPORT_RECIPIENTS` |

## Disable duplicate schedulers

When VM cron is primary:

- Do **not** enable a schedule on `.github/workflows/run-tests.yml`
- Remove any Google Apps Script **time triggers** that also start the same test pipeline
- Keep Apps Script web apps for **Sheets POST** and **email POST** only
