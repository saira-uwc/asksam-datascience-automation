# VM automation migration — AskSam DS

This guide moves Playwright automation from GitHub Actions (optional) to a **dedicated Linux VM** with **cron**, while keeping Google Sheets and failure email via Apps Script web apps.

---

## What runs where

| Step | GitHub Actions (optional) | VM + cron (recommended) |
|------|---------------------------|-------------------------|
| Run Playwright tests | Actions runner | VM: `npm run automation:run` |
| Google Sheet update | Reporter → Apps Script URL | Same (`.env` on VM) |
| Dashboard JSON/CSV | `generate-dashboard.js` | Same |
| Commit/push `docs/**` | Actions bot | VM deploy key |
| GitHub Pages deploy | On push to `main` | Same |
| Failure email | `send-email-report.js` | Same |
| Schedule | workflow_dispatch only | **cron** |

**Keep on Google:** web app URLs for Sheets + email.  
**Remove:** time-based Apps Script triggers that duplicate the VM schedule.

---

## Part A — One-time VM setup

### 1) SSH

```bash
ssh saira@136.119.127.72
cd ~
```

### 2) Node 20 via nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && nvm alias default 20
node -v   # expect v20.x.x
```

### 3) Clone

```bash
git clone https://github.com/saira-uwc/asksam-datascience-automation.git asksam-datascience-automation
cd ~/asksam-datascience-automation
```

> Update org/repo if your remote differs.

### 4) Environment

```bash
cp .env.example .env
```

Set in `.env`:

- `BASE_URL`, `LOGIN_URL`, `DASHBOARD_URL`, `EXPERT_DASHBOARD_URL`, `COPILOT_HOME_URL`
- `TEST_EMAIL` (Clerk test-mode clinician; OTP `424242`)
- `GOOGLE_APPS_SCRIPT_URL`, `EMAIL_WEB_APP_URL`, `REPORT_RECIPIENTS` (optional)
- `DASHBOARD_PAGES_URL`, `GOOGLE_SHEETS_URL` (optional)

### 5) Git identity for automated commits

```bash
git config --global user.name "AskSam Automation Bot"
git config --global user.email "automation-bot@your-domain.com"
```

### 6) Deploy key (generate on VM only)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_asksam-datascience-automation -N "" -C "vm-asksam-datascience"
```

Add `~/.ssh/id_ed25519_asksam-datascience-automation.pub` to GitHub → repo → **Settings → Deploy keys → Allow write**.

### 7) SSH config

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com-asksam-datascience-automation
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_asksam-datascience-automation
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/id_ed25519_asksam-datascience-automation
```

### 8) Remote + auth test

```bash
git remote set-url origin git@github.com-asksam-datascience-automation:saira-uwc/asksam-datascience-automation.git
ssh -T git@github.com-asksam-datascience-automation
```

### 9) Dependencies

```bash
npm ci
npx playwright install chromium
```

If browser fails with missing libraries, ask an admin to run once:

```bash
PLAYWRIGHT_WITH_DEPS=true npx playwright install --with-deps chromium
```

### 10) Trial run

```bash
AUTOMATION_SKIP_GIT_PUSH=true npm run automation:run
npm run automation:run
```

### 11) Cron

**Option A — RAG API only (recommended first)** — no browser, no `TEST_EMAIL`:

```bash
crontab -e
```

```bash
15 */4 * * * /bin/bash -lc 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null && cd "$HOME/asksam-datascience-automation" && npm run automation:run-rag-api' >> "$HOME/automation-cron-asksam-rag-api.log" 2>&1
```

**Option B — Full UI + API** — requires `TEST_EMAIL` + Chromium:

```bash
45 */4 * * * /bin/bash -lc 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null && cd "$HOME/asksam-datascience-automation" && npm run automation:run' >> "$HOME/automation-cron-asksam-datascience-automation.log" 2>&1
```

You can run **both** (staggered minutes) or **only Option A** to start.

---

## Ongoing operations

- Each `automation:run` resets to `origin/main` before tests
- Deploy code from dev machine via `git push`; VM picks up on next cron
- Logs: `tail -f ~/automation-cron-asksam-datascience-automation.log`
- VM must stay running for cron to fire

## Troubleshooting

| Issue | Action |
|-------|--------|
| Stale tests / dirty tree | `git fetch origin main && git reset --hard origin/main` |
| git push fails | Deploy key, SSH Host alias, git identity |
| Playwright browser errors | `npx playwright install chromium`; admin may need `--with-deps` |
| Pages deploy vs test failures | Test failures still update `docs/**` if generate-dashboard runs; Pages deploys on push regardless |
| Auth failures | Verify `TEST_EMAIL`; Clerk OTP test mode uses `424242` |

## Multi-project on one VM

- Separate clone directory per repo
- Separate deploy key + SSH Host alias per repo
- Stagger cron minutes; separate log file per project

## GitHub checklist

- [ ] Enable **GitHub Pages** → Source = **GitHub Actions**
- [ ] Add repo secrets (if using optional Actions workflow)
- [ ] Add VM deploy key with write access
- [ ] Confirm `pages.yml` deploys on `docs/**` push

## Google checklist (optional)

- [ ] Deploy Sheets web app (`scripts/google-apps-script-sheet.js` reference)
- [ ] Deploy email web app (`scripts/google-apps-script-email.js` reference)
- [ ] Remove duplicate time triggers that also run tests
