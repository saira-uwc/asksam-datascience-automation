#!/usr/bin/env bash
#
# Unified DS API pipeline — RAG + Clinical Notes in one Playwright run.
# One cron → one JSON report → one Google Sheet update → one dashboard push.
#
# Optional env:
#   AUTOMATION_SKIP_GIT_PUSH=true  — run tests + dashboard + email only
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT — copy .env.example and fill in RAG_API_* + Sheets/email vars."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository — clone the repo first."
  exit 1
fi

if [[ ! -s fixtures/clinical-notes-apis.json ]] || ! grep -q '"smoke": true' fixtures/clinical-notes-apis.json 2>/dev/null; then
  echo "Missing fixtures/clinical-notes-apis.json with smoke endpoints."
  exit 1
fi

if [[ ! -s fixtures/assistant-apis.json ]] || ! grep -q '"smoke": true' fixtures/assistant-apis.json 2>/dev/null; then
  echo "Missing fixtures/assistant-apis.json with smoke endpoints."
  echo "Run once locally: npm run discover:assistant-apis"
  exit 1
fi

if [[ ! -s playwright/.auth/ds-api-headers.json ]]; then
  echo "Missing playwright/.auth/ds-api-headers.json (captured auth tokens for Clinical Notes)."
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
if [[ "$BRANCH" != "main" ]]; then
  echo "Checking out main (was on: $BRANCH)"
  git checkout main
fi

echo "==> Pull latest code from origin/main (auto-sync before every run)"
git fetch origin main
git reset --hard origin/main
echo "==> Running commit: $(git rev-parse --short HEAD) — $(git log -1 --format='%ci %s')"

export CI=true

echo "==> npm ci"
npm ci

echo "==> DS API smoke tests (RAG 4 + Clinical Notes 5 + Assistant 4 + ASR 1, no browser login)"
set +e
npm run test:ds-api
set -e

echo "==> Generate dashboard data"
node scripts/generate-dashboard.js

if [[ "${AUTOMATION_SKIP_GIT_PUSH:-}" == "true" ]]; then
  echo "==> Skipping git push (AUTOMATION_SKIP_GIT_PUSH=true)"
else
  echo "==> Commit and push dashboard data"
  git fetch origin main
  git reset --mixed origin/main
  git add docs/data/ docs/history/ docs/exports/ docs/artifacts/
  if git diff --cached --quiet; then
    echo "No dashboard changes to commit."
  else
    git commit -m "Update DS API dashboard — $(TZ='Asia/Kolkata' date '+%b %d, %Y %I:%M %p IST')"
    git push origin HEAD:main
    echo "Dashboard data pushed."
  fi
fi

echo "==> Failure email (no-ops when all passed / env missing)"
node scripts/send-email-report.js

echo "==> Done (DS API: RAG + Clinical Notes)"
