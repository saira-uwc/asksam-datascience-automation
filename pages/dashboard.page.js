export class DashboardPage {
  constructor(page) {
    this.page = page;
  }

  /* ===========================
     CREATE NOTE
  ============================ */
  async clickCreateClinicalNote() {
    await this.page
      .getByRole('button', { name: 'Create Clinical Note' })
      .waitFor({ state: 'visible', timeout: 20000 });

    await this.page
      .getByRole('button', { name: 'Create Clinical Note' })
      .click();
  }

  /* ===========================
     PATIENT SELECTION 
  ============================ */
  async selectPatientWithFallback() {
    const patients = [
      'Yamini Singh 191',
      'Ganesh Test 123',
      'Yamini Singh 185'
    ];

    // modal container (important for scrolling)
    const modal = this.page.getByRole('dialog');
    await modal.waitFor({ state: 'visible', timeout: 20000 });

    // Search input — use role-based lookup to tolerate placeholder copy changes.
    // Placeholder has been "Search by name or email..." and later
    // "Search by name, or enter full email..." — the Search Patient dialog has
    // only one textbox so role is the stable locator.
    const searchBox = modal.getByRole('textbox').first();

    for (const name of patients) {
      console.log(`🔍 Searching patient: ${name}`);

      /* ---------- STEP 1: try direct click (already visible) ---------- */
      const directResult = modal
        .getByText(name, { exact: true })
        .first();

      if (await directResult.isVisible().catch(() => false)) {
        await directResult.click();
        console.log(`✅ Selected patient (direct): ${name}`);
        return;
      }

      /* ---------- STEP 2: search ---------- */
      await searchBox.click();
      await searchBox.fill('');
      await searchBox.fill(name);

      // wait for results to refresh
      await this.page.waitForTimeout(1500);

      /* ---------- STEP 3: scroll results ---------- */
      for (let i = 0; i < 4; i++) {
        const result = modal
          .getByText(name, { exact: true })
          .first();

        if (await result.isVisible().catch(() => false)) {
          await result.click();
          console.log(`✅ Selected patient (search): ${name}`);
          return;
        }

        // scroll inside modal, not page
        await modal.evaluate(el => (el.scrollTop += 300));
        await this.page.waitForTimeout(800);
      }
    }

    throw new Error('❌ No expected patient found after search & scroll');
  }

  /* ===========================
     UPLOAD
  ============================ */
  async openUploadModal() {
    const uploadBtn = this.page.getByRole('button', { name: 'Upload' });

    await uploadBtn.waitFor({ state: 'visible', timeout: 30000 });
    await uploadBtn.click();
  }

  async uploadFile(filePath) {
    const chooseFile = this.page.getByRole('button', { name: 'Choose File' });

    await chooseFile.waitFor({ state: 'attached', timeout: 15000 });
    await chooseFile.setInputFiles(filePath);
  }

  /* ===========================
     OPEN VOICE MODAL (from note page)
  ============================ */
  async openVoiceModal() {
    // Check if the Voice modal is already open (it auto-opens on new note creation)
    const modalTitle = this.page.getByText('Voice and Document Transcriptions').first();
    if (await modalTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Voice modal already open');
      return;
    }

    // Click the headset/mic icon on the right side of the note page
    const headsetIcon = this.page.locator('svg[data-testid="HeadsetMicOutlinedIcon"]').first();
    await headsetIcon.waitFor({ state: 'visible', timeout: 15000 });
    await headsetIcon.click({ force: true });
    console.log('✅ Clicked headset mic icon');

    await modalTitle.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✅ Voice and Document Transcriptions modal opened');
  }

  /* ===========================
     VOICE RECORD + TRANSCRIBE
  ============================ */
  async voiceRecordAndSend() {
    // 1. Click mic button to start recording
    const micIcon = this.page.locator('svg[data-testid="MicIcon"]').first();
    await micIcon.waitFor({ state: 'visible', timeout: 10000 });
    await micIcon.click({ force: true });
    console.log('✅ Clicked mic — recording started');

    // 2. Wait for Stop button to appear (confirms recording is active)
    const stopBtn = this.page.getByRole('button', { name: 'Stop' });
    await stopBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Stop button visible — recording in progress');

    // 3. Simulate speaking — wait a few seconds
    await this.page.waitForTimeout(5000);

    // 4. Click Stop to finish recording
    await stopBtn.click();
    console.log('✅ Clicked Stop — recording ended');

    // 5. Wait for transcription to appear in the text area
    await this.page.waitForTimeout(5000);

    // 6. Click Send Transcription
    const sendBtn = this.page.getByRole('button', { name: 'Send Transcription' });
    await sendBtn.waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForFunction(
      () => !document.querySelector('#notetaker_send_transcription')?.disabled,
      { timeout: 30000 }
    ).catch(() => {});
    await sendBtn.click();
    console.log('✅ Clicked Send Transcription');
  }

  /* ===========================
     TRANSCRIPTION (document upload flow)
  ============================ */
  async transcribeAndSend() {
    await this.page
      .getByRole('button', { name: 'Transcribe All' })
      .waitFor({ state: 'visible', timeout: 20000 });

    await this.page.getByRole('button', { name: 'Transcribe All' }).click();

    // Wait for transcription to complete — CI can be slow
    await this.page
      .getByRole('button', { name: 'Send Transcription' })
      .waitFor({ state: 'visible', timeout: 120000 });

    const sendBtn = this.page.getByRole('button', { name: 'Send Transcription' });
    await sendBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Wait for button to be enabled (not disabled)
    await this.page.waitForFunction(
      () => !document.querySelector('#notetaker_send_transcription')?.disabled,
      { timeout: 30000 }
    ).catch(() => {});
    await sendBtn.click();
  }

/* ===========================
   DISCLAIMERS
============================ */
async acceptDisclaimers() {
  const disclaimerBtn = this.page.getByRole('button', {
    name: /I Understand And Accept/i
  });

  // First disclaimer
  await disclaimerBtn.waitFor({ state: 'visible', timeout: 30000 });
  await disclaimerBtn.click();

  // Small wait for next modal transition
  await this.page.waitForTimeout(2000);

  // Second disclaimer
  await disclaimerBtn.waitFor({ state: 'visible', timeout: 30000 });
  await disclaimerBtn.click();

  // Ensure modal is gone before Save
  await disclaimerBtn.first().waitFor({ state: 'detached', timeout: 30000 });
}

  /* ===========================
     VERIFY CLINICAL TABS HAVE DATA
     Each tab waits up to 90s for data — fails if data doesn't arrive
  ============================ */
  async verifyClinicalTabsHaveData() {
    const tabs = ['Clinical Advice', 'Clinical Examination', 'Follow-Up Note', 'Case History'];
    const perTabWait = 90000; // 90 seconds per tab
    const failedTabs = [];

    for (const tabName of tabs) {
      const tab = this.page.getByRole('tab', { name: tabName });
      if (!(await tab.isVisible().catch(() => false))) {
        console.log(`⚠ ${tabName} tab not found — skipping`);
        continue;
      }

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

    if (failedTabs.length > 0) {
      throw new Error(
        `Clinical note tabs have no data after 90s wait: ${failedTabs.join(', ')} — transcription incomplete`
      );
    }

    // Go back to Clinical Advice tab
    const firstTab = this.page.getByRole('tab', { name: 'Clinical Advice' });
    if (await firstTab.isVisible().catch(() => false)) {
      await firstTab.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /* ===========================
     SAVE & SUBMIT
  ============================ */
  async saveAndSubmit() {
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForTimeout(3000);

    await this.page.getByRole('button', { name: 'Submit' }).click();
    await this.page.waitForTimeout(3000);

    await this.page.getByRole('button', { name: 'Submit' }).click();
    await this.page.waitForTimeout(3000);

  }

  /* ===========================
     LOGOUT
  ============================ */
  async logout() {
    await this.page.getByRole('button', { name: 'Open user menu' }).click();
    await this.page.getByRole('menuitem', { name: 'Sign out' }).click();
  }
}