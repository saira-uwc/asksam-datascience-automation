/**
 * Forensics fixture — captures everything the dev team needs to root-cause
 * cross-subdomain auth/session failures, automatically attached to every
 * failed test:
 *   - cookies.json          (all cookies at moment of failure, incl. __session, __client_uat)
 *   - localStorage.json     (full localStorage snapshot at moment of failure)
 *   - sessionStorage.json   (full sessionStorage snapshot)
 *   - console.log           (every browser console message during the test)
 *   - page-errors.log       (uncaught page errors during the test)
 *   - redirect-chain.txt    (every navigation: from → to, with timestamp)
 *   - clerk-info.txt        (Clerk session/user IDs extracted from cookies)
 *   - network-failures.txt  (failed responses during test, with status + URL)
 *
 * Network log lives inside trace.zip (extract via:
 *   npx playwright show-trace trace.zip
 * — the Network tab is HAR-equivalent).
 *
 * Tests must `import { test, expect } from '../../helpers/forensics-fixture';`
 * instead of `from '@playwright/test'`. No other code changes required.
 */

import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  // Auto-fixture: runs for every test, captures forensic data on failure.
  // We do NOT override the `context` fixture — doing so loses test-level
  // `test.use({ storageState: ... })` overrides (e.g. letter-template tests
  // that need a fresh anonymous context).
  page: async ({ page, context }, use, testInfo) => {
    const consoleMessages = [];
    const pageErrors = [];
    const navigations = [];
    const networkFailures = [];

    // Capture all console output
    page.on('console', (msg) => {
      try {
        consoleMessages.push({
          ts: new Date().toISOString(),
          type: msg.type(),
          text: msg.text(),
          location: msg.location(),
        });
      } catch { /* ignore */ }
    });

    // Capture page errors (uncaught JS exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push({
        ts: new Date().toISOString(),
        message: err.message,
        stack: err.stack,
      });
    });

    // Capture every navigation — this is the redirect chain the dev team asked for
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigations.push({
          ts: new Date().toISOString(),
          url: frame.url(),
        });
      }
    });

    // Capture failed network responses (4xx / 5xx)
    page.on('response', (resp) => {
      const status = resp.status();
      if (status >= 400) {
        networkFailures.push({
          ts: new Date().toISOString(),
          status,
          url: resp.url(),
          method: resp.request().method(),
        });
      }
    });

    // Run the test
    await use(page);

    // After test — dump forensics if the test failed (or timed out)
    if (testInfo.status !== testInfo.expectedStatus) {
      try {
        const cookies = await context.cookies();
        await testInfo.attach('cookies.json', {
          body: JSON.stringify(cookies, null, 2),
          contentType: 'application/json',
        });

        // Extract Clerk-specific cookie info for fast triage
        const clerkSession = cookies.find((c) => c.name === '__session');
        const clerkUat = cookies.find((c) => c.name === '__client_uat');
        const clerkInfo = [
          `Test: ${testInfo.title}`,
          `Test file: ${testInfo.file}`,
          `Failed at: ${new Date().toISOString()}`,
          `Page URL at failure: ${page.url()}`,
          '',
          '--- Clerk session cookies ---',
          `__session present: ${!!clerkSession}`,
          clerkSession
            ? `  domain=${clerkSession.domain} path=${clerkSession.path} sameSite=${clerkSession.sameSite} secure=${clerkSession.secure} httpOnly=${clerkSession.httpOnly} expires=${new Date(clerkSession.expires * 1000).toISOString()}`
            : '  (missing — likely the cause of redirect-to-login failures)',
          `__client_uat present: ${!!clerkUat}`,
          clerkUat
            ? `  domain=${clerkUat.domain} value=${clerkUat.value}`
            : '  (missing)',
          '',
          '--- All cookies on .asksam.com.au ---',
          ...cookies
            .filter((c) => c.domain.includes('asksam.com.au'))
            .map((c) => `${c.name}  domain=${c.domain}  sameSite=${c.sameSite}  expires=${c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session'}`),
        ].join('\n');
        await testInfo.attach('clerk-info.txt', {
          body: clerkInfo,
          contentType: 'text/plain',
        });
      } catch (e) {
        await testInfo.attach('cookies-error.txt', {
          body: `Failed to capture cookies: ${e.message}`,
          contentType: 'text/plain',
        });
      }

      try {
        const storage = await page.evaluate(() => {
          const dump = (s) => {
            const out = {};
            for (let i = 0; i < s.length; i++) {
              const k = s.key(i);
              out[k] = s.getItem(k);
            }
            return out;
          };
          return {
            localStorage: dump(window.localStorage),
            sessionStorage: dump(window.sessionStorage),
          };
        });
        await testInfo.attach('localStorage.json', {
          body: JSON.stringify(storage.localStorage, null, 2),
          contentType: 'application/json',
        });
        await testInfo.attach('sessionStorage.json', {
          body: JSON.stringify(storage.sessionStorage, null, 2),
          contentType: 'application/json',
        });
      } catch (e) {
        await testInfo.attach('storage-error.txt', {
          body: `Failed to capture localStorage/sessionStorage (page may already be closed): ${e.message}`,
          contentType: 'text/plain',
        });
      }

      await testInfo.attach('console.log', {
        body: consoleMessages
          .map((m) => `[${m.ts}] [${m.type}] ${m.text}${m.location?.url ? ` (${m.location.url}:${m.location.lineNumber})` : ''}`)
          .join('\n'),
        contentType: 'text/plain',
      });

      if (pageErrors.length > 0) {
        await testInfo.attach('page-errors.log', {
          body: pageErrors.map((e) => `[${e.ts}] ${e.message}\n${e.stack}`).join('\n\n'),
          contentType: 'text/plain',
        });
      }

      await testInfo.attach('redirect-chain.txt', {
        body: navigations.map((n, i) => `${i + 1}. [${n.ts}] ${n.url}`).join('\n'),
        contentType: 'text/plain',
      });

      if (networkFailures.length > 0) {
        await testInfo.attach('network-failures.txt', {
          body: networkFailures
            .map((f) => `[${f.ts}] ${f.status} ${f.method} ${f.url}`)
            .join('\n'),
          contentType: 'text/plain',
        });
      }
    }
  },
});
