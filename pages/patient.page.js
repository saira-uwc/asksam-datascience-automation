import path from 'path';

export class PatientPage {
  constructor(page) {
    this.page = page;
  }

  async createNewPatient() {
    // ✅ Short, readable unique id (last 6 digits of timestamp)
    const id = Date.now().toString().slice(-6);

    this.firstName = 'Test';
    this.lastName = `user-${id}`;
    this.email = `testuser-${id}@tmail.com`;

    // The button name varies by state:
    //   - Empty state (no in-progress notes): "Create Your First Clinical Note"
    //   - Normal state:                       "Create Clinical Note"
    // The /clinical/home page can take 30-60s to render content under load.
    // Wait up to 90s for the button to appear (covers slow API responses).
    const createBtn = this.page.getByRole('button', {
      name: /Create (Your First )?Clinical Note/i,
    }).first();
    await createBtn.waitFor({ state: 'visible', timeout: 90000 });
    await createBtn.click();

    // The Create button opens a "Search Patient" modal. The "Create New Patient
    // Profile" button stays DISABLED until you search for the new patient's email
    // and the system confirms no duplicate. Type the email (pressSequentially
    // triggers React onChange properly — fill() can skip the debounced search),
    // wait for the explicit "No patients found" message, then click.
    const searchModal = this.page.getByRole('dialog');
    await searchModal.waitFor({ state: 'visible', timeout: 30000 });
    const searchBox = searchModal.getByRole('textbox').first();
    await searchBox.click();
    await searchBox.pressSequentially(this.email, { delay: 50 });
    // Wait for the "No patients found" / "no match" copy to appear — that's the
    // signal the search API has responded and the Create button has enabled.
    await this.page.getByText(/No patients found|No match for that email/i)
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .catch(() => {});
    const createNewBtn = this.page.getByRole('button', { name: 'Create New Patient Profile' });
    await createNewBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Belt-and-braces — also wait for the disabled attr to clear
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector('#create_patient_btn');
        return btn && !btn.disabled;
      },
      { timeout: 10000 }
    ).catch(() => {});
    await createNewBtn.click();

    await this.page.getByRole('textbox', { name: 'First Name' }).fill(this.firstName);
    await this.page.getByRole('textbox', { name: 'Last Name' }).fill(this.lastName);
    await this.page.getByRole('textbox', { name: 'Email Address...' }).fill(this.email);

    await this.page.locator('#client-sex').click();
    await this.page.getByRole('option', { name: 'Female' }).click();

    await this.page.getByRole('button', {
      name: /Confirm and create clinical/i,
    }).click();

    console.log('✅ Created patient:', {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
    });
  }

  async uploadAndTranscribe() {
    const filePath = path.resolve('uploads/Yamini_Pal_Health_Summary.pdf');

    await this.page.getByRole('button', { name: 'Upload' }).waitFor({ state: 'visible', timeout: 60000 });
    await this.page.getByRole('button', { name: 'Upload' }).click();
    await this.page.getByRole('button', { name: 'Choose File' }).setInputFiles(filePath);

    await this.page.getByRole('button', { name: 'Transcribe All' }).click();

    // Wait for Send Transcription to appear and be enabled
    const sendBtn = this.page.getByRole('button', { name: 'Send Transcription' });
    await sendBtn.waitFor({ state: 'visible', timeout: 120000 });
    await this.page.waitForFunction(
      () => !document.querySelector('#notetaker_send_transcription')?.disabled,
      { timeout: 30000 }
    ).catch(() => {});
    await sendBtn.click();

    console.log('⏳ Waiting for transcription / disclaimer / submit…');

    // ✅ DO NOT wait for "Processing transcription" to disappear
    await Promise.race([
      this.page
        .getByRole('button', { name: /I Understand and Accept/i })
        .waitFor({ timeout: 120000 }),

      this.page
        .getByRole('button', { name: 'Submit' })
        .waitFor({ timeout: 120000 }),
    ]).catch(() => {});

    // The flow shows TWO disclaimers in sequence (matches dashboard.page.js
    // acceptDisclaimers). Previously we only dismissed the first, the second
    // stayed open, and the page never navigated to the note detail view —
    // submit then failed because there was no Submit button on /clinical/home.
    const disclaimerBtn = this.page.getByRole('button', {
      name: /I Understand and Accept/i,
    });

    for (let i = 1; i <= 2; i++) {
      if (await disclaimerBtn.first().isVisible({ timeout: 10000 }).catch(() => false)) {
        await disclaimerBtn.first().click();
        console.log(`✅ Disclaimer ${i} accepted`);
        await this.page.waitForTimeout(2000); // wait for next modal / navigation
      } else if (i === 1) {
        console.log('ℹ️ Disclaimer not shown, continuing');
        break;
      } else {
        // Second disclaimer didn't appear — that's OK, some flows only have one
        break;
      }
    }
  }

  async verifyClinicalTabsHaveData() {
    const tabs = ['Clinical Advice', 'Clinical Examination', 'Follow-Up Note', 'Case History'];
    const perTabWait = 90000; // 90 seconds per tab
    const failedTabs = [];
    let foundAnyTab = false;

    // First — wait briefly for tabs to render (the note detail page can take
    // a few seconds to mount after the disclaimer dismisses).
    await this.page.getByRole('tab', { name: tabs[0] })
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});

    for (const tabName of tabs) {
      const tab = this.page.getByRole('tab', { name: tabName });
      if (!(await tab.isVisible().catch(() => false))) {
        console.log(`⚠ ${tabName} tab not found — skipping`);
        continue;
      }
      foundAnyTab = true;

      await tab.click();
      await this.page.waitForTimeout(1500);

      // Wait up to 90s for this tab to have meaningful content
      const startTime = Date.now();
      let fieldCount = 0;
      while (Date.now() - startTime < perTabWait) {
        const editables = await this.page.locator('[contenteditable="true"]').allTextContents();
        const meaningful = editables.filter(t => {
          const trimmed = t.trim();
          return trimmed.length > 5 && !trimmed.includes('No information');
        });
        if (meaningful.length > 0) {
          fieldCount = meaningful.length;
          break;
        }
        await this.page.waitForTimeout(3000);
      }

      if (fieldCount > 0) {
        console.log(`✅ ${tabName}: ${fieldCount} fields with data`);
      } else {
        console.log(`❌ ${tabName}: NO DATA after 90s`);
        failedTabs.push(tabName);
      }
    }

    if (!foundAnyTab) {
      const url = this.page.url();
      // The app sometimes navigates to ?clinicalId=null with a "no permission"
      // empty-state — meaning the backend transcription/note-creation call
      // failed silently. Surface this as an APP-SIDE failure with clear context.
      const hasPermissionError = await this.page
        .getByText(/don.t have permission to view these details/i)
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const isNullClinicalId = url.includes('clinicalId=null');

      if (hasPermissionError || isNullClinicalId) {
        throw new Error(
          `APP-SIDE FAILURE: note creation backend call did not produce a valid clinicalId.\n` +
          `URL at failure: ${url}\n` +
          `App showed: "you don't have permission to view these details" (${hasPermissionError}).\n` +
          `This means the upload/transcribe API succeeded but the resulting note ` +
          `record was not created in the backend, or was created without owner ` +
          `permissions. Forward the cookies.json + redirect-chain.txt + console.log ` +
          `forensics artifacts to the dev team — the test code is correct, the API ` +
          `response is the issue.`
        );
      }

      throw new Error(
        `No clinical tabs found on the page (URL: ${url}). ` +
        `The note creation flow likely landed on the wrong page — check the disclaimer accept step.`
      );
    }

    if (failedTabs.length > 0) {
      throw new Error(
        `Clinical note tabs have no data after 90s wait: ${failedTabs.join(', ')} — transcription incomplete`
      );
    }

    const firstTab = this.page.getByRole('tab', { name: 'Clinical Advice' });
    if (await firstTab.isVisible().catch(() => false)) {
      await firstTab.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async submitClinicalNote() {
    // The Submit button often appears disabled while the note is still
    // saving/transcribing in the background. Wait for it to become visible
    // AND enabled before clicking — prevents 30s timeouts on the bare .click().
    const submitBtn = this.page.getByRole('button', { name: 'Submit' });
    await submitBtn.first().waitFor({ state: 'visible', timeout: 60000 });
    // Wait until at least one Submit button is enabled
    await this.page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'Submit' && !b.disabled
      ),
      { timeout: 60000 }
    ).catch(() => {});
    await submitBtn.first().click();

    // Second Submit is the confirm-dialog button; wait for it explicitly
    // (a fresh element renders inside the dialog, so re-resolve)
    await this.page.waitForTimeout(500);
    const confirmBtn = this.page.getByRole('button', { name: 'Submit' });
    await confirmBtn.last().waitFor({ state: 'visible', timeout: 30000 });
    await confirmBtn.last().click();

    await this.page
      .getByText(/Your note has been submitted/i)
      .waitFor({ timeout: 60000 });

    console.log('✅ Clinical note submitted');
  }
}