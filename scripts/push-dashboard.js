#!/usr/bin/env node
/** Optional local helper — commit and push dashboard data after a manual run. */
const { execSync } = require('child_process');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
}

run('git add docs/data/ docs/history/ docs/exports/ docs/artifacts/');
if (!run('git diff --cached --stat')) {
  console.log('No dashboard changes to commit.');
  process.exit(0);
}
const timestamp = new Date().toLocaleString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
});
run(`git commit -m "Update dashboard data — ${timestamp}"`);
execSync('git push', { cwd: ROOT, stdio: 'inherit' });
