#!/usr/bin/env node

/**
 * generate-dashboard.js
 * Parses Playwright JSON report and generates dashboard data files.
 *
 * Reads:  reports/playwright-report.json
 * Writes: docs/data/latest.json
 *         docs/history/runs.json  (appends, keeps last 30 days of runs)
 *         docs/exports/current-run.csv
 *         docs/exports/all-runs-summary.csv
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'reports', 'playwright-report.json');
const LATEST_PATH = path.join(ROOT, 'docs', 'data', 'latest.json');
const HISTORY_PATH = path.join(ROOT, 'docs', 'history', 'runs.json');
const CSV_CURRENT = path.join(ROOT, 'docs', 'exports', 'current-run.csv');
const CSV_ALL = path.join(ROOT, 'docs', 'exports', 'all-runs-summary.csv');
const ARTIFACTS_DIR = path.join(ROOT, 'docs', 'artifacts');
const RETENTION_DAYS = 30;
// Hard upper bound — guards against a misbehaving run loop ballooning the
// file. At the steady ~6 runs/day cadence, 30 days ≈ 180 entries; 1000
// leaves comfortable headroom.
const MAX_HISTORY = 1000;

// ── Module name mapping (AskSam DS) ──
const MODULE_MAP = {
  'expert-dashboard-navigation': 'Expert Dashboard — Navigation',
  'appointment-booking': 'Expert Dashboard — Appointment Booking',
  'expert-appointment-create-with-new-patient': 'Expert Dashboard — Create Patient & Book',
  'appointment-create-and-reschedule': 'Expert Dashboard — Reschedule',
  'appointment-session-management': 'Expert Dashboard — Session Management',
  'appointment-z-cancel': 'Expert Dashboard — Cancel Appointment',
  'patient-create-and-view': 'Expert Dashboard — Patients',
  'expert-helpcenter-ticket': 'Expert Dashboard — Help Center',
  'clinical-note': 'CCOP — Clinical Note',
  'create-patient-clinical-note': 'CCOP — New Patient & Note',
  'voice-transcription': 'CCOP — Voice Transcription',
  'ai-assistant-panel': 'CCOP — AI Assistant Panel',
  'letter-template': 'CCOP — Letter Templates',
  'ccop-helpcenter-ticket': 'CCOP — Help Center',
  'ccop-clinician-signup': 'CCOP — Clinician Signup',
  'rag-api-smoke': 'RAG API — Smoke Tests',
  'clinical-notes-api-smoke': 'Clinical Notes API — Smoke Tests',
  'assistant-api-smoke': 'Stella Assistant Panel API — Smoke Tests',
  'z-logout': 'Logout',
};

function getSpecBasename(filePath) {
  return path.basename(filePath).replace(/\.spec\.(ts|js)$/, '');
}

function getModuleFromFile(filePath) {
  const base = getSpecBasename(filePath);
  return MODULE_MAP[base] || base;
}

function getModuleKey(filePath) {
  return getSpecBasename(filePath);
}

function resolveAttachmentPath(attachmentPath) {
  if (!attachmentPath) return null;
  if (path.isAbsolute(attachmentPath) && fs.existsSync(attachmentPath)) {
    return attachmentPath;
  }
  const fromRoot = path.join(ROOT, attachmentPath);
  if (fs.existsSync(fromRoot)) return fromRoot;
  return fs.existsSync(attachmentPath) ? attachmentPath : null;
}

function readApiProofAttachment(result) {
  const apiAtt = (result.attachments || []).find((a) => a.name === 'api-response');
  if (!apiAtt) return { proof: '', body: '' };

  let raw = '';
  if (apiAtt.body) {
    try {
      raw = Buffer.from(apiAtt.body, 'base64').toString('utf8');
    } catch {
      raw = '';
    }
  } else {
    const filePath = resolveAttachmentPath(apiAtt.path);
    if (filePath) {
      try {
        raw = fs.readFileSync(filePath, 'utf8');
      } catch {
        raw = '';
      }
    }
  }

  const proof = raw.length > 3000 ? `${raw.substring(0, 3000)}...` : raw;
  return { proof, body: raw };
}

// ── Recursively extract tests from Playwright suite tree ──
function extractTests(suite, tests = []) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      for (const test of spec.tests || []) {
        for (const result of test.results || []) {
          // Skip auth setup
          if (spec.file && spec.file.includes('auth.setup')) continue;

          const status = result.status === 'passed' ? 'passed'
            : result.status === 'timedOut' ? 'timedOut'
            : result.status === 'skipped' ? 'skipped'
            : 'failed';

          const errorMsg = result.errors && result.errors.length > 0
            ? result.errors.map(e => e.message || '').join('\n').substring(0, 500)
            : '';

          const attachments = (result.attachments || []).map(a => ({
            name: a.name,
            sourcePath: a.path || '',
            path: a.path ? path.basename(a.path) : '',
            contentType: a.contentType || '',
          }));

          const { proof: apiProof, body: apiProofBody } = readApiProofAttachment(result);

          tests.push({
            title: spec.title,
            status,
            durationMs: result.duration || 0,
            file: spec.file || '',
            module: getModuleKey(spec.file || ''),
            moduleLabel: getModuleFromFile(spec.file || ''),
            attachments,
            apiProof,
            apiProofBody,
            error: errorMsg,
            retry: result.retry || 0,
          });
        }
      }
    }
  }

  if (suite.suites) {
    for (const child of suite.suites) {
      extractTests(child, tests);
    }
  }

  return tests;
}

// ── Main ──
function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Report not found:', REPORT_PATH);
    console.error('Run tests first: npx playwright test');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const allTests = extractTests(report);

  // Keep only the final result for each test (highest retry number)
  const testMap = new Map();
  for (const t of allTests) {
    const key = `${t.file}::${t.title}`;
    const existing = testMap.get(key);
    if (!existing || t.retry > existing.retry) {
      testMap.set(key, t);
    }
  }
  const tests = Array.from(testMap.values());

  // Compute summary
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const skipped = tests.filter(t => t.status === 'skipped').length;
  const timedOut = tests.filter(t => t.status === 'timedOut').length;
  const total = tests.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Compute per-module stats
  const modules = {};
  for (const t of tests) {
    if (!modules[t.module]) {
      modules[t.module] = { label: t.moduleLabel, total: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0 };
    }
    modules[t.module].total++;
    if (t.status === 'passed') modules[t.module].passed++;
    else if (t.status === 'failed') modules[t.module].failed++;
    else if (t.status === 'skipped') modules[t.module].skipped++;
    else if (t.status === 'timedOut') modules[t.module].timedOut++;
  }

  const runId = crypto.randomUUID();
  const startedAt = report.stats?.startTime || new Date().toISOString();
  const durationMs = report.stats?.duration || tests.reduce((sum, t) => sum + t.durationMs, 0);

  // Copy artifacts (screenshots, videos, traces) for failed tests
  // Clean previous artifacts first
  if (fs.existsSync(ARTIFACTS_DIR)) {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true });
  }
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  let artifactCount = 0;
  for (const t of tests) {
    const slug = t.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50).toLowerCase();
    for (const a of t.attachments) {
      const isApiProof = a.name === 'api-response';
      if (!isApiProof && t.status === 'passed') continue;

      const ext = path.extname(a.path) || (isApiProof ? '.json' : '');
      const destName = `${slug}-${a.name}${ext}`;
      const destPath = path.join(ARTIFACTS_DIR, destName);

      try {
        if (isApiProof && t.apiProofBody) {
          fs.writeFileSync(destPath, t.apiProofBody);
        } else {
          const sourcePath = resolveAttachmentPath(a.sourcePath);
          if (!sourcePath) continue;
          fs.copyFileSync(sourcePath, destPath);
        }
        a.webPath = `./artifacts/${destName}`;
        artifactCount++;
      } catch { /* skip if copy fails */ }
    }
  }
  if (artifactCount > 0) {
    console.log(`Copied ${artifactCount} artifacts to docs/artifacts/`);
  }

  const latest = {
    id: runId,
    startedAt,
    durationMs,
    summary: { total, passed, failed, skipped, timedOut },
    passRate,
    modules,
    tests: tests.map(({ retry, apiProofBody, ...rest }) => ({
      ...rest,
      attachments: rest.attachments.map(({ sourcePath, ...a }) => a), // remove sourcePath from output
    })),
  };

  // Write latest.json
  fs.mkdirSync(path.dirname(LATEST_PATH), { recursive: true });
  fs.writeFileSync(LATEST_PATH, JSON.stringify(latest, null, 2));
  console.log('Written:', LATEST_PATH);

  // Update history (append, cap at MAX_HISTORY)
  let history = [];
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); } catch { history = []; }
  }

  const runSummary = {
    id: runId,
    startedAt,
    durationMs,
    summary: { total, passed, failed, skipped, timedOut },
    passRate,
    modules,
  };

  history.unshift(runSummary);

  // Drop runs older than RETENTION_DAYS (based on startedAt). Entries
  // without a parseable startedAt are kept to avoid silent data loss.
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  history = history.filter(r => {
    const t = Date.parse(r.startedAt);
    return Number.isNaN(t) || t >= cutoff;
  });
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);

  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  console.log('Written:', HISTORY_PATH);

  // Write current-run.csv
  const csvHeader = 'Test ID,Test Name,Module,Status,Duration (ms),API Response Proof,Error\n';
  const csvRows = tests.map(t => {
    const titleMatch = t.title.match(/^(TC_\w+_\d+)\s*-\s*(.+)$/);
    const id = titleMatch ? titleMatch[1] : '';
    const name = titleMatch ? titleMatch[2].trim() : t.title;
    const proof = (t.apiProof || '').replace(/"/g, '""').replace(/\n/g, ' ');
    const error = t.error.replace(/"/g, '""').replace(/\n/g, ' ');
    return `"${id}","${name}","${t.moduleLabel}","${t.status}",${t.durationMs},"${proof}","${error}"`;
  }).join('\n');

  fs.mkdirSync(path.dirname(CSV_CURRENT), { recursive: true });
  fs.writeFileSync(CSV_CURRENT, csvHeader + csvRows);
  console.log('Written:', CSV_CURRENT);

  // Write all-runs-summary.csv
  const summaryHeader = 'Run ID,Date,Total,Passed,Failed,Skipped,Timed Out,Pass Rate (%),Duration (ms)\n';
  const summaryRows = history.map(r => {
    const date = new Date(r.startedAt).toLocaleString('en-US');
    return `"${r.id}","${date}",${r.summary.total},${r.summary.passed},${r.summary.failed},${r.summary.skipped},${r.summary.timedOut},${r.passRate},${r.durationMs}`;
  }).join('\n');

  fs.writeFileSync(CSV_ALL, summaryHeader + summaryRows);
  console.log('Written:', CSV_ALL);

  console.log(`\nDashboard data generated: ${total} tests (${passed} passed, ${failed} failed, ${passRate}% pass rate)`);
}

main();
