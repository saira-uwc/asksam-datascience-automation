#!/usr/bin/env node

/**
 * send-email-report.js — failure-only email via Google Apps Script web app.
 * Reads docs/data/latest.json; skips when pass rate is 100%.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LATEST_PATH = path.join(ROOT, 'docs', 'data', 'latest.json');
const HISTORY_PATH = path.join(ROOT, 'docs', 'history', 'runs.json');
const EMAIL_URL = process.env.EMAIL_WEB_APP_URL || '';
const RECIPIENTS = process.env.REPORT_RECIPIENTS || '';
const DASHBOARD_URL =
  process.env.DASHBOARD_PAGES_URL || 'https://saira-uwc.github.io/asksam-datascience-automation/';
const SHEETS_URL = process.env.GOOGLE_SHEETS_URL || '';
const PROJECT_NAME = 'AskSam DS';

function main() {
  if (!EMAIL_URL) {
    console.log('\n⚠️  EMAIL_WEB_APP_URL not set — skipping email report\n');
    return;
  }
  if (!RECIPIENTS) {
    console.log('\n⚠️  REPORT_RECIPIENTS not set — skipping email report\n');
    return;
  }
  if (!fs.existsSync(LATEST_PATH)) {
    console.error('No dashboard data found:', LATEST_PATH);
    return;
  }

  const data = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'));
  const failCount = data.summary.failed + (data.summary.timedOut || 0);

  if (failCount === 0) {
    console.log(`\n✅ Last run passed (${data.passRate}%) — no email sent.\n`);
    return;
  }

  let todayRuns = 1;
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
      todayRuns = history.filter(
        (r) => new Date(r.startedAt).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' }) === today,
      ).length;
    } catch {
      /* ignore */
    }
  }
  data.todayRuns = todayRuns;

  sendEmail(RECIPIENTS, buildSubject(data), buildEmailHTML(data));
}

function buildSubject(data) {
  const dateStr = new Date(data.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  return `${PROJECT_NAME} Automation Report – ${dateStr} – ${data.passRate}% Pass Rate`;
}

function buildEmailHTML(data) {
  const s = data.summary;
  const d = new Date(data.startedAt);
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timeStr = d
    .toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })
    .toLowerCase();
  const failCount = s.failed + (s.timedOut || 0);
  const passRateIcon = data.passRate === 100 ? '✅' : data.passRate >= 80 ? '🟡' : '🔴';

  const moduleRows = Object.entries(data.modules)
    .map(([, m]) => {
      const rate = m.total > 0 ? Math.round((m.passed / m.total) * 100) : 0;
      const icon = rate === 100 ? '✅' : rate >= 80 ? '🟡' : '🔴';
      return `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:14px">${icon} ${m.label}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;color:#22c55e;font-weight:600">${m.passed}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;color:#ef4444;font-weight:600">${m.failed + (m.timedOut || 0)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:600">${rate}%</td>
      </tr>`;
    })
    .join('');

  let failedSection = '';
  if (failCount > 0 && data.tests) {
    const failedTests = data.tests.filter((t) => t.status !== 'passed');
    const failedRows = failedTests
      .map(
        (t) => `<tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:13px">${t.title}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#ef4444">${t.moduleLabel}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666">${(t.error || '').substring(0, 120)}</td>
      </tr>`,
      )
      .join('');
    failedSection = `<div style="margin:24px 40px 0"><p style="font-weight:600">🔴 Failed Tests</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb"><tbody>${failedRows}</tbody></table></div>`;
  }

  let buttons = `<a href="${DASHBOARD_URL}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px">📊 View Dashboard</a>`;
  if (SHEETS_URL) {
    buttons += `<a href="${SHEETS_URL}" style="display:inline-block;padding:12px 28px;background:#d97706;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">📋 View Sheet</a>`;
  }

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
    <table width="620" align="center" style="background:#fff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#1e40af;padding:32px 40px;color:#fff">
        <h1 style="margin:0">${PROJECT_NAME} QC Report</h1>
        <p style="margin:8px 0 0;opacity:.9">${dateStr}, ${timeStr} · Today's runs: ${data.todayRuns || 1}</p>
      </td></tr>
      <tr><td style="padding:28px 40px">
        <p>Total: ${s.total} · Passed: ${s.passed} · Failed: ${failCount} · ${passRateIcon} ${data.passRate}%</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">${moduleRows}</table>
        ${failedSection}
        <p style="margin-top:24px;text-align:center">${buttons}</p>
      </td></tr>
    </table></body></html>`;
}

async function sendEmail(to, subject, body) {
  try {
    console.log(`\n📧 Sending failure report to: ${to}`);
    const response = await fetch(EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ to, subject, body }),
      redirect: 'follow',
    });
    if (response.ok) {
      const result = await response.json();
      console.log(result.ok ? '✅ Email sent' : `❌ Email failed: ${result.error}`);
    } else {
      console.error(`❌ Email failed: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
}

main();
