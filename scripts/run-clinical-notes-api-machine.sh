#!/usr/bin/env bash
#
# Clinical Notes API pipeline — uses fixtures/clinical-notes-apis.json captured once
# from prod Copilot (npm run discover:clinical-notes-apis). Replays endpoints each run.
#
# Optional env:
#   AUTOMATION_SKIP_GIT_PUSH=true  — run tests + dashboard + email only
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT — copy .env.example and fill in TEST_EMAIL + integrations."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository — clone the repo first."
  exit 1
fi

if [[ ! -s fixtures/clinical-notes-apis.json ]] || ! grep -q '"smoke": true' fixtures/clinical-notes-apis.json 2>/dev/null; then
  echo "Missing discovered Clinical Notes manifest."
  echo "Run once on a machine with TEST_EMAIL + uploads/Yamini_Pal_Health_Summary.pdf:"
  echo "  npm run discover:clinical-notes-apis"
  echo "Then commit fixtures/clinical-notes-apis.json and push."
  exit 1
fi

if [[ ! -s playwright/.auth/ds-api-headers.json ]]; then
  echo "Missing playwright/.auth/ds-api-headers.json (captured auth tokens)."
  echo "Copy from discovery machine:"
  echo "  scp playwright/.auth/ds-api-headers.json saira@VM:~/asksam-datascience-automation/playwright/.auth/"
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

echo "==> Clinical Notes API smoke (manifest replay, no browser login)"
set +e
npm run test:clinical-notes-api
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
    git commit -m "Update Clinical Notes API dashboard — $(TZ='Asia/Kolkata' date '+%b %d, %Y %I:%M %p IST')"
    git push origin HEAD:main
    echo "Dashboard data pushed."
  fi
fi

echo "==> Failure email (no-ops when all passed / env missing)"
node scripts/send-email-report.js

echo "==> Done (Clinical Notes API)"
