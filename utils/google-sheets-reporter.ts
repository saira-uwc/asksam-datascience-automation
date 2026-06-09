import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { truncateForSheet } from './ragApi';

dotenv.config();

interface TestRow {
  testcaseId: string;
  testName: string;
  description: string;
  updateDateTime: string;
  status: string;
  reason: string;
  comment: string;
}

class GoogleSheetsReporter implements Reporter {
  private results: TestRow[] = [];
  private appsScriptUrl: string;

  constructor() {
    this.appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || '';
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (test.title === 'authenticate') return;

    const titleMatch = test.title.match(/^(TC_\w+_\d+)\s*-\s*(.+)$/);
    const testcaseId = titleMatch ? titleMatch[1] : test.title;
    const testName = titleMatch ? titleMatch[2].trim() : test.title;
    const suiteName = test.parent?.title || '';
    const description = `[${suiteName}] ${testName}`;

    const updateDateTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    const status =
      result.status === 'passed' ? 'PASS' : result.status === 'skipped' ? 'SKIP' : 'FAIL';

    let reason = '';
    if (status === 'FAIL' && result.errors?.length > 0) {
      reason = this.simplifyError(result.errors[0]?.message || 'Unknown error');
    }

    let comment = '';
    const apiProof = this.getApiProofComment(result);
    if (status === 'PASS') {
      comment = apiProof || 'Test passed successfully';
    } else if (status === 'FAIL') {
      if (apiProof) {
        comment = apiProof;
      } else {
        const screenshot = result.attachments?.find((a) => a.name === 'screenshot');
        comment = screenshot?.path
          ? `Screenshot: ${path.basename(screenshot.path)}`
          : 'No screenshot captured';
      }
    } else if (status === 'SKIP') {
      comment = 'Test was skipped';
    }

    this.results.push({
      testcaseId,
      testName,
      description,
      updateDateTime,
      status,
      reason,
      comment,
    });
  }

  async onEnd(_result: FullResult) {
    if (!this.appsScriptUrl) {
      console.log('\n⚠️  GOOGLE_APPS_SCRIPT_URL not set — skipping Google Sheets update\n');
      this.printConsoleTable();
      return;
    }

    try {
      await this.pushToGoogleSheets();
      console.log(`\n✅ Google Sheets updated — ${this.results.length} test results pushed`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('\n❌ Failed to update Google Sheets:', message);
      this.printConsoleTable();
    }
  }

  private async pushToGoogleSheets() {
    const payload = JSON.stringify({ results: this.results });
    const postResponse = await fetch(this.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
      redirect: 'follow',
    });

    if (postResponse.ok) {
      const body = (await postResponse.json()) as { status: string; message?: string };
      if (body.status !== 'success') {
        throw new Error(body.message || 'Apps Script returned an error');
      }
      return;
    }

    if (postResponse.status >= 300 && postResponse.status < 400) {
      const redirectUrl = postResponse.headers.get('location');
      if (redirectUrl) {
        const getResponse = await fetch(redirectUrl);
        if (!getResponse.ok) {
          throw new Error(`HTTP ${getResponse.status}: ${getResponse.statusText}`);
        }
        const body = (await getResponse.json()) as { status: string; message?: string };
        if (body.status !== 'success') {
          throw new Error(body.message || 'Apps Script returned an error');
        }
        return;
      }
    }

    throw new Error(`HTTP ${postResponse.status}: ${postResponse.statusText}`);
  }

  private getApiProofComment(result: TestResult): string | null {
    const attachment = result.attachments?.find((a) => a.name === 'api-response');
    if (!attachment) return null;

    let raw = '';
    if (attachment.body) {
      raw = attachment.body.toString();
    } else if (attachment.path) {
      const filePath = path.isAbsolute(attachment.path)
        ? attachment.path
        : path.join(process.cwd(), attachment.path);
      if (fs.existsSync(filePath)) {
        raw = fs.readFileSync(filePath, 'utf8');
      }
    }

    return raw ? truncateForSheet(raw) : null;
  }

  private simplifyError(rawError: string): string {
    if (rawError.includes('toBeVisible') && rawError.includes('not found')) {
      const locatorMatch = rawError.match(/Locator: (.+)/);
      return `Expected element was not visible: ${locatorMatch ? locatorMatch[1].trim() : 'an element'}`;
    }
    if (rawError.includes('toHaveURL')) return 'Page did not navigate to the expected URL';
    if (rawError.includes('Timeout')) return 'Page or element took too long to load (timeout)';
    if (rawError.includes('net::ERR') || rawError.includes('Navigation')) {
      return 'Network error — page failed to load';
    }
    const firstLine = rawError
      .split('\n')[0]
      .replace(/\[2m|\[22m|\[31m|\[39m/g, '')
      .trim();
    return firstLine.length > 150 ? firstLine.substring(0, 150) + '...' : firstLine;
  }

  private printConsoleTable() {
    console.log('\n📋 Test Results Summary:');
    console.log('─'.repeat(90));
    for (const r of this.results) {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${r.testcaseId.padEnd(14)} ${icon} ${r.status.padEnd(6)} ${r.testName.substring(0, 58)}`);
    }
    console.log('─'.repeat(90));
  }
}

export default GoogleSheetsReporter;
