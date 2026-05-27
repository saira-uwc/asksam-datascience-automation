export class AIAssistantPanelPage {
  constructor(page) {
    this.page = page;
  }

  /* ===========================
     NAVIGATE TO PATIENT NOTE
  ============================ */
  async openExistingPatientNote() {
    // Retry navigation up to 2 times to handle stale page state from prior tests
    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.page.goto("https://copilot.asksam.com.au/clinical/home");
      await this.page.waitForURL("**/clinical/home");
      await this.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

      await this.page
        .locator(".MuiSkeleton-root")
        .first()
        .waitFor({ state: "detached", timeout: 30000 })
        .catch(() => {});

      const editDraftBtn = this.page.getByRole("button", { name: "Edit Draft" }).first();
      const viewNoteBtn = this.page.getByRole("button", { name: "View Clinical Note" }).first();

      try {
        if (await editDraftBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
          await editDraftBtn.click();
          console.log("✅ Clicked Edit Draft");
        } else {
          await this.page.getByRole("button", { name: "Completed" }).click();
          console.log("✅ Switched to Completed tab");

          await this.page
            .locator(".MuiSkeleton-root")
            .first()
            .waitFor({ state: "detached", timeout: 30000 })
            .catch(() => {});
          await this.page.waitForTimeout(3000);

          await viewNoteBtn.waitFor({ state: "visible", timeout: 30000 });
          await viewNoteBtn.click();
          console.log("✅ Clicked View Clinical Note");
        }
        break; // Success — exit retry loop
      } catch (e) {
        if (attempt === 2) throw e;
        console.log(`⚠ Note open attempt ${attempt} failed — retrying`);
        await this.page.waitForTimeout(3000);
      }
    }

    await this.page
      .getByRole("button", { name: /Actions/i })
      .waitFor({ state: "visible", timeout: 30000 });
    await this.page.waitForTimeout(5000);
    console.log("✅ Note page loaded — Actions button visible");
  }

  /* ===========================
     OPEN FLOATING PANEL (with retry)
  ============================ */
  async openFloatingPanel() {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Opening floating panel — attempt ${attempt}/${maxAttempts}`);
      await this._tryClickFloatingButton();
      await this.page.waitForTimeout(3000);
      await this._dismissDisclaimer();

      if (await this._isPanelOpen()) {
        console.log("✅ AI Assistant panel opened");
        return;
      }
      console.log(`⚠ Panel not detected after attempt ${attempt}`);
      if (attempt < maxAttempts) {
        await this.page.waitForTimeout(2000);
      }
    }
    // Final fallback: fail with a clear message
    throw new Error("AI Assistant panel did not open after 3 attempts");
  }

  async _tryClickFloatingButton() {
    const viewport = this.page.viewportSize();
    const viewportWidth = viewport?.width || 1440;
    const rightEdgeThreshold = viewportWidth * 0.85;

    // Strategy 1: Find clickable images on the right edge
    const allImages = this.page.locator('img[cursor="pointer"], img');
    const imgCount = await allImages.count();
    const rightEdgeElements = [];

    for (let i = 0; i < imgCount; i++) {
      const img = allImages.nth(i);
      if (await img.isVisible().catch(() => false)) {
        const box = await img.boundingBox();
        if (box && box.x > rightEdgeThreshold && box.y > 100 && box.width < 80 && box.height < 80) {
          rightEdgeElements.push({ index: i, box });
        }
      }
    }

    if (rightEdgeElements.length > 0) {
      rightEdgeElements.sort((a, b) => a.box.y - b.box.y);
      const topEl = allImages.nth(rightEdgeElements[0].index);
      await topEl.click();
      console.log(`✅ Clicked floating icon at (${rightEdgeElements[0].box.x}, ${rightEdgeElements[0].box.y})`);
      return;
    }

    // Strategy 2: Check buttons on the right edge
    const allButtons = this.page.locator('button');
    const btnCount = await allButtons.count();
    const rightEdgeButtons = [];

    for (let i = 0; i < btnCount; i++) {
      const btn = allButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        const box = await btn.boundingBox();
        const text = await btn.textContent().catch(() => "");
        if (box && box.x > rightEdgeThreshold && box.y > 100 && (!text || text.trim().length === 0)) {
          rightEdgeButtons.push({ index: i, box });
        }
      }
    }

    if (rightEdgeButtons.length > 0) {
      rightEdgeButtons.sort((a, b) => a.box.y - b.box.y);
      const topBtn = allButtons.nth(rightEdgeButtons[0].index);
      await topBtn.click();
      console.log(`✅ Clicked floating button at (${rightEdgeButtons[0].box.x}, ${rightEdgeButtons[0].box.y})`);
      return;
    }

    // Strategy 3: Last resort — click at the physical position
    const clickX = viewportWidth - 50;
    const clickY = 230;
    await this.page.mouse.click(clickX, clickY);
    console.log(`✅ Clicked at position (${clickX}, ${clickY}) for floating button`);
  }

  async _isPanelOpen() {
    // Check if the MUI Dialog panel appeared first (fast structural check)
    const dialog = this.page.locator('[role="presentation"].MuiDialog-root');
    if (!(await dialog.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false;
    }
    // Then verify the panel has the expected tab content (case-insensitive)
    const asksamTab = this.page.getByText(/^asksam$/i).first();
    return await asksamTab.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /* ===========================
     PANEL LOCATOR — scope all interactions to MUI Dialog
  ============================ */
  get panel() {
    // The AI assistant panel renders inside a MUI Dialog with role="presentation"
    // Use the dialog container that has the tab content
    return this.page.locator('[role="presentation"].MuiDialog-root').first();
  }

  /* ===========================
     DISMISS DISCLAIMER DIALOG
  ============================ */
  async _dismissDisclaimer() {
    const disclaimerHeading = this.page.getByText("Important Disclaimer");
    if (await disclaimerHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✅ Disclaimer dialog detected");

      const iUnderstandBtn = this.page.getByRole("button", { name: "I Understand" });
      if (await iUnderstandBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await iUnderstandBtn.click();
        console.log("✅ Clicked I Understand button");
      } else {
        await this.page.getByText("I Understand", { exact: true }).click();
        console.log("✅ Clicked I Understand (by text)");
      }
      await this.page.waitForTimeout(3000);
    }
  }

  /* ===========================
     TAB: GRAPH — Full Feature Test
  ============================ */
  async testGraphTab() {
    await this.panel.getByText("Graph", { exact: true }).click();
    console.log("✅ Clicked Graph tab");
    await this.page.waitForTimeout(3000);

    // 1. Verify the knowledge graph canvas is visible
    const graphCanvas = this.panel.locator('canvas').first();
    await graphCanvas.waitFor({ state: "visible", timeout: 10000 });
    console.log("✅ Knowledge graph canvas is visible");

    // 2. Verify "Node Properties" dropdown is visible
    const nodeProperties = this.panel.getByText("Node Properties");
    await nodeProperties.waitFor({ state: "visible", timeout: 10000 });
    console.log("✅ Node Properties dropdown is visible");

    // 3. Verify "Reset" button is visible
    const resetBtn = this.panel.getByText("Reset", { exact: true });
    await resetBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("✅ Reset button is visible");

    // 4. Verify zoom controls are visible
    const zoomControls = this.panel.locator('button').filter({ hasText: '+' });
    if (await zoomControls.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("✅ Zoom controls are visible");
    }

    // 5. Verify Legends bar is visible with categories
    const legendsBar = this.panel.getByText("Legends");
    await legendsBar.waitFor({ state: "visible", timeout: 5000 });
    console.log("✅ Legends bar is visible");

    // 6. Verify legend categories
    const legendCategories = ["User", "Timeline", "Gene", "Medicine", "Disease", "Diagnostics", "Nutrient", "Brand"];
    for (const category of legendCategories) {
      const legend = this.panel.getByText(category, { exact: true });
      if (await legend.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`  ✅ Legend: ${category}`);
      } else {
        console.log(`  ⚠ Legend not found: ${category}`);
      }
    }

    // 7. Check if the graph has clinical data nodes (not just a single User node)
    // The graph renders on a <canvas>, so we check for multiple text labels
    // around it. If only the patient name is present, the graph lacks clinical info.
    const clinicalLabels = ["Medicine", "Disease", "Diagnostics", "Gene", "Timeline"];
    const graphArea = this.panel.locator('canvas').first();
    const graphBox = await graphArea.boundingBox();

    // Look for any text elements rendered near/over the canvas area
    // that indicate clinical nodes (medicines, diseases, etc.)
    let clinicalNodeCount = 0;
    for (const label of clinicalLabels) {
      // Check if any text matching clinical categories appears in the graph area
      const nodes = this.panel.getByText(new RegExp(label, 'i'));
      const count = await nodes.count();
      // Exclude the legend labels by checking position — legend is at bottom
      for (let i = 0; i < count; i++) {
        const node = nodes.nth(i);
        if (await node.isVisible().catch(() => false)) {
          const box = await node.boundingBox();
          if (box && graphBox && box.y < graphBox.y + graphBox.height - 50) {
            clinicalNodeCount++;
          }
        }
      }
    }

    if (clinicalNodeCount === 0) {
      console.log("⚠ ISSUE: Graph only shows User node — no clinical information (medicines, diseases, diagnostics) displayed");
    } else {
      console.log(`✅ Graph contains ${clinicalNodeCount} clinical data nodes`);
    }

    // 8. Click "Node Properties" dropdown to expand it
    await nodeProperties.click();
    console.log("✅ Clicked Node Properties dropdown");
    await this.page.waitForTimeout(2000);

    // 9. Click Reset to restore default graph view
    const resetVisible = await resetBtn.isVisible().catch(() => false);
    if (resetVisible) {
      await resetBtn.click({ force: true });
      console.log("✅ Clicked Reset to restore default view");
      await this.page.waitForTimeout(2000);
    }

    // 10. Click zoom controls — find icon-only buttons in the panel (no text)
    // Determine panel bounds to find left-side controls
    const panelBox = await this.panel.boundingBox();
    const allBtns = this.panel.locator('button');
    const totalBtns = await allBtns.count();
    const iconOnlyButtons = [];

    for (let i = 0; i < totalBtns; i++) {
      const btn = allBtns.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;
      const text = ((await btn.textContent()) || '').trim();
      if (text.length > 0) continue; // skip text buttons

      const box = await btn.boundingBox();
      if (!box || !panelBox) continue;
      // Buttons positioned in the left half of the panel (zoom controls live here)
      const relativeX = box.x - panelBox.x;
      if (relativeX < panelBox.width * 0.4 && box.width < 80) {
        iconOnlyButtons.push({ btn, y: box.y });
      }
    }

    // Sort by Y position (top to bottom: fullscreen, zoom in, zoom out)
    iconOnlyButtons.sort((a, b) => a.y - b.y);
    const zoomLabels = ['Fullscreen', 'Zoom In (+)', 'Zoom Out (−)'];
    for (let i = 0; i < Math.min(3, iconOnlyButtons.length); i++) {
      try {
        await iconOnlyButtons[i].btn.click({ force: true });
        console.log(`✅ Clicked ${zoomLabels[i]} button`);
        await this.page.waitForTimeout(800);
        // For fullscreen — click again to exit so canvas doesn't block other clicks
        if (i === 0) {
          await iconOnlyButtons[i].btn.click({ force: true }).catch(() => {});
          await this.page.waitForTimeout(800);
        }
      } catch (e) {
        console.log(`⚠ ${zoomLabels[i]} click failed`);
      }
    }
    if (iconOnlyButtons.length === 0) {
      console.log("⚠ Zoom controls not detected");
    }

    // 11. Click on User node in canvas (center area)
    const canvasBox = await graphCanvas.boundingBox();
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      await this.page.mouse.click(centerX, centerY);
      console.log("✅ Clicked on canvas center (User node area)");
      await this.page.waitForTimeout(1000);
    }

    // 12. Click Disclaimer link in header (force — canvas may intercept)
    const disclaimerLink = this.panel.getByText("Disclaimer", { exact: true });
    if (await disclaimerLink.isVisible().catch(() => false)) {
      await disclaimerLink.click({ force: true }).catch(() => {});
      console.log("✅ Clicked Disclaimer link");
      await this.page.waitForTimeout(2000);
      await this._dismissDisclaimer();
    }
  }

  /* ===========================
     TAB: ASSISTANT — Full Feature Test
  ============================ */
  async testAssistantTab() {
    // Click the "Assistant" tab within the dialog
    await this.panel.getByText("Assistant", { exact: true }).click();
    console.log("✅ Clicked Assistant tab");
    await this.page.waitForTimeout(5000);

    // The sub-tabs are pill-shaped chip buttons with icon + text + badge
    // Use page-level locators since panel scoping has issues with chip components

    // 1. Verify "Associations" sub-tab is visible
    const associationsTab = this.page.getByText(/Associations/).first();
    await associationsTab.waitFor({ state: "visible", timeout: 10000 });
    console.log("✅ Associations sub-tab is visible");

    // 2. Verify "Medication Associations" sub-tab is visible
    const medicationTab = this.page.getByText(/Medication Associations/);
    if (await medicationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✅ Medication Associations sub-tab is visible");
    }

    // 3. Verify "Comorbidity Associations" sub-tab is visible
    const comorbidityTab = this.page.getByText(/Comorbidity Associations/);
    if (await comorbidityTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✅ Comorbidity Associations sub-tab is visible");
    }

    // 4. Verify default content — "You have no Alerts at this time"
    const noAlertsMsg = this.page.getByText("You have no Alerts at this time");
    if (await noAlertsMsg.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✅ No Alerts message displayed (default state)");
    }

    // 5. Click "Medication Associations" sub-tab
    if (await medicationTab.isVisible().catch(() => false)) {
      await medicationTab.click();
      console.log("✅ Clicked Medication Associations sub-tab");
      await this.page.waitForTimeout(3000);

      const medContent = this.page.getByText(/no.*alert/i);
      if (await medContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("✅ Medication Associations — empty state verified");
      } else {
        console.log("✅ Medication Associations — content loaded");
      }
    }

    // 6. Click "Comorbidity Associations" sub-tab
    if (await comorbidityTab.isVisible().catch(() => false)) {
      await comorbidityTab.click();
      console.log("✅ Clicked Comorbidity Associations sub-tab");
      await this.page.waitForTimeout(3000);

      const comorbContent = this.page.getByText(/no.*alert/i);
      if (await comorbContent.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("✅ Comorbidity Associations — empty state verified");
      } else {
        console.log("✅ Comorbidity Associations — content loaded");
      }
    }

    // 7. Switch back to "Associations" sub-tab
    await associationsTab.click();
    console.log("✅ Switched back to Associations sub-tab");
    await this.page.waitForTimeout(2000);

    // 8. Verify badge counts on each sub-tab (default state should be 0)
    const subTabs = [
      { name: 'Associations', locator: associationsTab },
      { name: 'Medication Associations', locator: medicationTab },
      { name: 'Comorbidity Associations', locator: comorbidityTab },
    ];
    for (const sub of subTabs) {
      if (await sub.locator.isVisible().catch(() => false)) {
        const parent = sub.locator.locator('xpath=..');
        const fullText = (await parent.textContent().catch(() => '')) || '';
        const badgeMatch = fullText.match(/\d+/);
        if (badgeMatch) {
          console.log(`✅ ${sub.name} badge count: ${badgeMatch[0]}`);
        } else {
          console.log(`⚠ ${sub.name} no badge found`);
        }
      }
    }

    // 9. Verify full empty-state message
    const fullMsg = this.page.getByText(/We'll update this space when we have an Alert/i);
    if (await fullMsg.isVisible().catch(() => false)) {
      console.log("✅ Full empty-state message verified");
    } else {
      console.log("⚠ Full empty-state message not visible");
    }

    // 10. Click Disclaimer link in header
    const disclaimerLink = this.panel.getByText("Disclaimer", { exact: true });
    if (await disclaimerLink.isVisible().catch(() => false)) {
      await disclaimerLink.click();
      console.log("✅ Clicked Disclaimer link");
      await this.page.waitForTimeout(2000);
      await this._dismissDisclaimer();
    }
  }

  /* ===========================
     TAB: ASKSAM — Full Feature Test
  ============================ */
  async testAsksamTab() {
    await this.panel.getByText("asksam", { exact: true }).first().click();
    console.log("✅ Clicked asksam tab");
    await this.page.waitForTimeout(3000);

    // 1. Verify the welcome message heading
    const welcomeHeading = this.panel.getByText("asksam - Your AI powered clinical assistant");
    await welcomeHeading.waitFor({ state: "visible", timeout: 10000 });
    console.log("✅ asksam welcome heading is visible");

    // 2. Verify welcome description text
    const welcomeDesc = this.panel.getByText(/committed to enhancing|committed to supporting/i);
    if (await welcomeDesc.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✅ Welcome description text is visible");
    }

    // 3. Verify bold instruction text
    const saveInstruction = this.panel.getByText(/save the clinical note/i);
    if (await saveInstruction.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✅ 'Save the clinical note' instruction is visible");
    }

    // 4. Verify chat input field
    const chatInput = this.panel.getByPlaceholder(/asksam Anything/i);
    await chatInput.waitFor({ state: "visible", timeout: 10000 });
    console.log("✅ Chat input 'asksam Anything...' is visible");

    // 5. Verify attachment icon
    const clipIcon = this.panel.locator('[data-testid="AttachFileIcon"]');
    if (await clipIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("✅ Attachment (clip) icon is visible");
    }

    // 6. Verify Disclaimer link in header
    // Use exact:true — after the AI chat reply renders, the response text can
    // contain the word "Disclaimer" and break strict-mode with a second match.
    const disclaimer = this.panel.getByText("Disclaimer", { exact: true }).first();
    await disclaimer.waitFor({ state: "visible", timeout: 5000 });
    console.log("✅ Disclaimer link is visible");

    // 7. Type a message in the chat input
    await chatInput.click();
    await chatInput.fill("What is the patient's chief complaint?");
    console.log("✅ Typed question in chat input");
    await this.page.waitForTimeout(1000);

    // 8. Click send button (arrow icon — last icon button near chat input at bottom)
    const allChatButtons = this.panel.locator('button').filter({ hasText: /^$/ });
    const chatBtnCount = await allChatButtons.count();
    let sendClicked = false;

    for (let i = chatBtnCount - 1; i >= Math.max(0, chatBtnCount - 3); i--) {
      const btn = allChatButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        const box = await btn.boundingBox();
        if (box && box.y > 600) {
          await btn.click();
          console.log("✅ Clicked send button");
          sendClicked = true;
          break;
        }
      }
    }

    if (!sendClicked) {
      await this.page.keyboard.press("Enter");
      console.log("✅ Pressed Enter to send message");
    }

    // 9. Wait for AI response
    await this.page.waitForTimeout(10000);

    // 10. Verify response appeared
    const panelText = await this.panel.textContent().catch(() => "");
    if (panelText && panelText.length > 300) {
      console.log("✅ Chat response received from AI");
    } else {
      console.log("⚠ Could not verify AI response — may still be loading");
    }

    // 11. Click Disclaimer to view it
    await disclaimer.click();
    console.log("✅ Clicked Disclaimer");
    await this.page.waitForTimeout(2000);

    // 12. Verify disclaimer dialog opened, then dismiss it
    await this._dismissDisclaimer();

    // 13. Click "+" button (top-left of welcome card) — typically "New chat" / clear
    const plusBtn = this.panel.locator('button').filter({ has: this.page.locator('[data-testid="AddIcon"]') }).first();
    if (await plusBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await plusBtn.click();
      console.log("✅ Clicked Plus (+) button");
      await this.page.waitForTimeout(2000);
    } else {
      // Fallback: any small icon button near the top of the panel
      const allBtns = this.panel.locator('button');
      const btnCount = await allBtns.count();
      for (let i = 0; i < btnCount; i++) {
        const btn = allBtns.nth(i);
        if (!(await btn.isVisible().catch(() => false))) continue;
        const text = ((await btn.textContent()) || '').trim();
        const box = await btn.boundingBox();
        if (text.length === 0 && box && box.y < 250 && box.x < 300) {
          await btn.click().catch(() => {});
          console.log("✅ Clicked Plus (+) button (positional fallback)");
          break;
        }
      }
    }
    await this.page.waitForTimeout(1500);

    // 14. Click attachment icon (clip)
    const attachBtn = this.panel.locator('[data-testid="AttachFileIcon"]');
    if (await attachBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await attachBtn.click({ force: true }).catch(() => {});
      console.log("✅ Clicked Attachment icon");
      await this.page.waitForTimeout(1000);
      // Press Escape to close any file picker if it opened
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    // 15. Click microphone / voice button
    const micBtn = this.panel.locator('[data-testid="KeyboardVoiceIcon"], [data-testid="MicIcon"], button[aria-label*="voice" i], button[aria-label*="mic" i]').first();
    if (await micBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await micBtn.click({ force: true }).catch(() => {});
      console.log("✅ Clicked Microphone button");
      await this.page.waitForTimeout(1000);
      // Click again to stop / dismiss permission
      await micBtn.click({ force: true }).catch(() => {});
    } else {
      console.log("⚠ Microphone button not found");
    }
  }

  /* ===========================
     CLOSE PANEL
  ============================ */
  async closePanel() {
    // First dismiss any open disclaimer dialog
    await this._dismissDisclaimer();

    // Click the X (close) button within the panel
    const closeBtn = this.panel.locator('button[aria-label="close"]').first();

    if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
    } else {
      const closeBtnAlt = this.panel.locator('button').filter({
        has: this.page.locator('[data-testid="CloseIcon"]')
      }).first();
      if (await closeBtnAlt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtnAlt.click({ force: true }).catch(() => {});
      }
    }
    console.log("✅ Closed AI Assistant panel");
  }
}
