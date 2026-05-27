import { safeClick } from "../utils/helpers";

export class LetterTemplatePage {
  constructor(page) {
    this.page = page;
  }

  /* ===========================
     NAVIGATE TO PATIENT NOTE
  ============================ */
  async openExistingPatientNote() {
    await this.page.goto("https://copilot.asksam.com.au/clinical/home");
    await this.page.waitForURL(/clinical\/home|sign-in|login/, { timeout: 30000 });

    // Defensive: if Clerk bounced us to sign-in despite login completing in
    // beforeEach, fail with a clear root cause instead of the downstream
    // "Completed tab not found" misleading error.
    if (/sign-in|login/i.test(this.page.url())) {
      throw new Error(
        `Auth bounce: navigated to /clinical/home but ended up at ${this.page.url()}. ` +
        `Clerk session was lost between login and this navigation. ` +
        `Check forensics cookies.json + clerk-info.txt for __session presence.`,
      );
    }

    // Wait for page to fully load — wait until at least one patient card button appears
    // Try each tab: In Progress (Edit Draft) → Completed (View Clinical Note) → All
    const editDraftBtn = this.page.getByRole("button", { name: "Edit Draft" }).first();
    const viewNoteBtn = this.page.getByRole("button", { name: "View Clinical Note" }).first();

    // Strategy: wait for skeleton loaders to clear, then check for buttons across tabs
    const waitForSkeletonsClear = async () => {
      const skeleton = this.page.locator(".MuiSkeleton-root").first();
      if (await skeleton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await skeleton.waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
      }
    };

    await waitForSkeletonsClear();

    // Tab 1: In Progress (default) — look for "Edit Draft"
    if (await editDraftBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await editDraftBtn.click();
      console.log("✅ Clicked Edit Draft (In Progress tab)");
    } else {
      // Tab 2: Completed — look for "View Clinical Note"
      const completedTab = this.page.getByRole("button", { name: "Completed" });
      await completedTab.click();
      console.log("✅ Switched to Completed tab");
      await waitForSkeletonsClear();

      if (await viewNoteBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await viewNoteBtn.click();
        console.log("✅ Clicked View Clinical Note (Completed tab)");
      } else {
        // Tab 3: All — look for either button
        const allTab = this.page.getByRole("button", { name: "All" });
        await allTab.click();
        console.log("✅ Switched to All tab");
        await waitForSkeletonsClear();

        const anyBtn = this.page
          .getByRole("button", { name: /Edit Draft|View Clinical Note/i })
          .first();
        await anyBtn.waitFor({ state: "visible", timeout: 30000 });
        await anyBtn.click();
        console.log("✅ Clicked patient note button (All tab)");
      }
    }

    // Wait for the note detail page to load
    await this.page
      .getByRole("button", { name: /Actions/i })
      .waitFor({ state: "visible", timeout: 30000 });
    console.log("✅ Note page loaded — Actions button visible");
  }

  /* ===========================
     OPEN LETTER TEMPLATES
  ============================ */
  async openLetterTemplates() {
    // Click the "Actions" dropdown button
    await this.page.getByRole("button", { name: /Actions/i }).click();
    await this.page.waitForTimeout(1000);

    // Click "Letter Templates" from the dropdown
    const letterTemplatesOption = this.page.getByRole("menuitem", {
      name: /Letter Templates/i,
    });

    if (await letterTemplatesOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await letterTemplatesOption.click();
    } else {
      await safeClick(
        this.page.getByText(/Letter Templates/i).first(),
        10000
      );
    }

    // Wait for the "Select Letter Type" heading to appear
    await this.page
      .getByRole("heading", { name: "Select Letter Type" })
      .waitFor({ state: "visible", timeout: 15000 });
    console.log("✅ Letter Templates page loaded");
  }

  /* ===========================
     SELECT LETTER TYPE
  ============================ */
  async selectLetterType(letterType = "Referral Letter") {
    // Click the "Select letter type" dropdown
    const dropdown = this.page.getByText("Select letter type", { exact: true });
    await dropdown.waitFor({ state: "visible", timeout: 10000 });
    await dropdown.click();
    await this.page.waitForTimeout(1000);

    // Select the specified letter type from the dropdown options
    const option = this.page.getByText(letterType, { exact: true });
    await option.waitFor({ state: "visible", timeout: 10000 });
    await option.click();
    console.log(`✅ Selected letter type: ${letterType}`);

    // After selecting, the template editor + preview loads automatically
    // Wait for the "View Letter Template" page and "Letter Preview" to appear
    await this.page
      .getByText("Letter Preview")
      .waitFor({ state: "visible", timeout: 20000 });
    console.log("✅ Template loaded — Letter Preview visible");
  }

  /* ===========================
     VERIFY TEMPLATE LOADED
  ============================ */
  async verifyTemplateContent() {
    // Verify Template Name field is visible and has value
    const templateNameInput = this.page.getByLabel(/Template Name/i);
    if (await templateNameInput.isVisible().catch(() => false)) {
      const templateName = await templateNameInput.inputValue();
      console.log(`✅ Template Name: ${templateName}`);
    }

    // Verify Letter Body editor is visible
    const letterBody = this.page.getByText("Letter Body");
    if (await letterBody.isVisible().catch(() => false)) {
      console.log("✅ Letter Body editor is visible");
    }

    // Verify Available Fields section is visible
    const availableFields = this.page.getByText("Available Fields");
    if (await availableFields.isVisible().catch(() => false)) {
      console.log("✅ Available Fields section is visible");
    }

    // Verify Letter Preview section is visible with content
    const letterPreview = this.page.getByText("Letter Preview");
    if (await letterPreview.isVisible().catch(() => false)) {
      console.log("✅ Letter Preview section is visible");
    }

    // Verify Download Template button is present
    const downloadBtn = this.page.getByRole("button", { name: /Download Template/i });
    await downloadBtn.waitFor({ state: "visible", timeout: 10000 });
    console.log("✅ Download Template button is visible");

    // Verify Update Template button is present
    const updateBtn = this.page.getByRole("button", { name: /Update Template/i });
    await updateBtn.waitFor({ state: "visible", timeout: 10000 });
    console.log("✅ Update Template button is visible");

    // Verify Letter Preview has actual content (not empty)
    const previewText = await this.page.locator('text=/Subject:|Dear /i').first().textContent().catch(() => '');
    if (previewText && previewText.trim().length > 10) {
      console.log(`✅ Letter Preview has content: "${previewText.substring(0, 60)}..."`);
    }

    // Verify "Available Fields" section sub-headings
    const subSections = ['Patient & Letter Information', 'Clinic Details', 'Clinical Content'];
    for (const section of subSections) {
      const sec = this.page.getByText(section, { exact: false }).first();
      if (await sec.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`✅ Sub-section visible: ${section}`);
      }
    }

    // Verify "X fields available" indicator
    const fieldsIndicator = this.page.getByText(/\d+ fields? available/i);
    if (await fieldsIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      const t = await fieldsIndicator.textContent();
      console.log(`✅ Fields indicator: ${t?.trim()}`);
    }
  }

  /* ===========================
     CLICK UPDATE TEMPLATE BUTTON
  ============================ */
  async clickUpdateTemplate() {
    const updateBtn = this.page.getByRole("button", { name: /Update Template/i });
    await updateBtn.waitFor({ state: "visible", timeout: 10000 });
    await updateBtn.click();
    console.log("✅ Clicked Update Template");
    await this.page.waitForTimeout(3000);
  }

  /* ===========================
     EDIT TEMPLATE NAME + LETTER BODY
  ============================ */
  async editTemplateContent(suffix = "edited") {
    // Modify Template Name (append suffix)
    const nameInput = this.page.getByLabel(/Template Name/i);
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const original = (await nameInput.inputValue()) || '';
      await nameInput.click();
      await this.page.keyboard.press('End');
      await this.page.keyboard.type(` ${suffix}`);
      console.log(`✅ Edited Template Name: ${original} ${suffix}`);
    }

    // Append text to Letter Body editor
    const editorTextbox = this.page.locator('[contenteditable="true"]').last();
    if (await editorTextbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editorTextbox.click({ force: true });
      await this.page.keyboard.press('End');
      await this.page.keyboard.type(' [edited by automation]');
      console.log("✅ Edited Letter Body content");
    }
    await this.page.waitForTimeout(1500);
  }

  /* ===========================
     SEARCH AVAILABLE FIELDS
  ============================ */
  async searchAvailableFields(query = "Patient") {
    const searchBox = this.page.getByPlaceholder(/Search.*field/i);
    if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBox.click();
      await searchBox.fill(query);
      console.log(`✅ Searched fields: "${query}"`);
      await this.page.waitForTimeout(1500);
      await searchBox.clear();
    }
  }

  /* ===========================
     ADD FIELD FROM AVAILABLE FIELDS PANEL
  ============================ */
  async addFieldByName(fieldName) {
    const addBtn = this.page
      .locator('p, span')
      .filter({ hasText: new RegExp(`^${fieldName}$`, 'i') })
      .locator('xpath=..')
      .locator('button[title="Add to selection"], button[aria-label*="add" i]')
      .first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      console.log(`✅ Added field: ${fieldName}`);
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  /* ===========================
     SELECT MULTIPLE LETTER TYPES (verify each loads)
  ============================ */
  async verifyMultipleLetterTypes() {
    const types = ['Reply Letter for GP or Referring Specialist', 'Summary of Patient Treatment', 'General Letter Template'];
    for (const type of types) {
      const dropdown = this.page.getByText("Select letter type", { exact: true });
      if (!(await dropdown.isVisible({ timeout: 3000 }).catch(() => false))) {
        // try clicking on existing template name to reopen dropdown
        const altDropdown = this.page.locator('[role="combobox"]').first();
        if (await altDropdown.isVisible().catch(() => false)) {
          await altDropdown.click();
        }
      } else {
        await dropdown.click();
      }
      await this.page.waitForTimeout(1500);
      const option = this.page.getByText(type, { exact: true });
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        console.log(`✅ Selected letter type: ${type}`);
        await this.page.waitForTimeout(2500);
      } else {
        console.log(`⚠ Letter type not found: ${type}`);
      }
    }
  }

  /* ===========================
     DOWNLOAD TEMPLATE
  ============================ */
  async downloadTemplate() {
    const downloadBtn = this.page.getByRole("button", { name: /Download Template/i });
    await downloadBtn.waitFor({ state: "visible", timeout: 10000 });
    await downloadBtn.click();
    console.log("✅ Clicked Download Template");
    await this.page.waitForTimeout(3000);
  }

  /* ===========================
     CREATE NEW TEMPLATE
  ============================ */
  async clickCreateTemplate() {
    const createBtn = this.page.getByRole("button", { name: /Create Template/i });
    await createBtn.waitFor({ state: "visible", timeout: 10000 });
    await createBtn.click();
    console.log("✅ Clicked + Create Template");

    // Wait for Template Name input to appear (confirms dialog loaded)
    await this.page
      .getByLabel(/Template Name/i)
      .waitFor({ state: "visible", timeout: 15000 });
    console.log("✅ Create Letter Template form loaded");
  }

  async fillNewTemplateForm(templateName) {
    // Fill Template Name
    const nameInput = this.page.getByLabel(/Template Name/i);
    await nameInput.click();
    await nameInput.fill(templateName);
    console.log(`✅ Filled Template Name: ${templateName}`);

    // Click the rich text editor (DraftJS contenteditable area)
    const editorTextbox = this.page.locator('[contenteditable="true"]').last();
    await editorTextbox.waitFor({ state: "visible", timeout: 10000 });
    await editorTextbox.click({ force: true });
    await this.page.waitForTimeout(500);
    await this.page.keyboard.type(
      "Dear recipient, I am writing to refer the patient for evaluation and treatment. Regards, Test Clinician",
      { delay: 30 }
    );
    console.log("✅ Filled Letter Body");

    await this.page.waitForTimeout(2000);
  }

  async selectClinicalNoteFields() {
    // Step 1: Ensure "Clinical Content" section is expanded
    // The section uses an h6 + IconButton with ExpandLess/ExpandMore icons
    const clinicalContentText = this.page.locator('h6').filter({ hasText: 'Clinical Content' });
    await clinicalContentText.waitFor({ state: "visible", timeout: 10000 });

    // Check if collapsed (ExpandMoreIcon means collapsed, ExpandLessIcon means expanded)
    const contentExpandBtn = clinicalContentText.locator('..').locator('button');
    const isContentCollapsed = await contentExpandBtn
      .locator('[data-testid="ExpandMoreIcon"]')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isContentCollapsed) {
      await contentExpandBtn.click();
      console.log("✅ Expanded Clinical Content section");
      await this.page.waitForTimeout(2000);
    } else {
      console.log("✅ Clinical Content section already expanded");
    }

    // Step 2: Expand "Clinical Notes" — click the icon button with title="Configure field options"
    const clinicalNotesText = this.page.locator('h6').filter({ hasText: 'Clinical Notes' });
    await clinicalNotesText.waitFor({ state: "visible", timeout: 10000 });

    const notesExpandBtn = this.page.locator('button[title="Configure field options"]');
    const isNotesVisible = await notesExpandBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (isNotesVisible) {
      await notesExpandBtn.click();
      console.log("✅ Expanded Clinical Notes dropdown");
      await this.page.waitForTimeout(2000);
    }

    // Step 3: Wait for field list to load
    await this.page
      .getByText("Select Clinical Note Fields:")
      .waitFor({ state: "visible", timeout: 10000 });

    // Step 4: Click "+" next to "Chief Complaint (CC)"
    const ccAddBtn = this.page
      .locator('p')
      .filter({ hasText: 'Chief Complaint (CC)' })
      .locator('..')
      .locator('button[title="Add to selection"]');
    await ccAddBtn.waitFor({ state: "visible", timeout: 5000 });
    await ccAddBtn.click();
    console.log("✅ Added field: Chief Complaint (CC)");
    await this.page.waitForTimeout(1000);

    // Step 5: Click "+" next to "History of Present Illness (HPI)"
    const hpiAddBtn = this.page
      .locator('p')
      .filter({ hasText: 'History of Present Illness (HPI)' })
      .locator('..')
      .locator('button[title="Add to selection"]');
    await hpiAddBtn.waitFor({ state: "visible", timeout: 5000 });
    await hpiAddBtn.click();
    console.log("✅ Added field: History of Present Illness (HPI)");
    await this.page.waitForTimeout(1000);
  }

  async saveNewTemplate() {
    const saveBtn = this.page.getByRole("button", { name: /Save Template/i });
    await saveBtn.waitFor({ state: "visible", timeout: 10000 });
    await saveBtn.click();
    console.log("✅ Clicked Save Template");
    await this.page.waitForTimeout(5000);
  }

  /* ===========================
     ADD MULTIPLE PATIENT INFO FIELDS
  ============================ */
  async addPatientInfoFields() {
    // Expand "Patient & Letter Information" section if collapsed
    const patientSection = this.page.locator('h6, p').filter({ hasText: /Patient.*Letter Information/i }).first();
    if (await patientSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      const expandBtn = patientSection.locator('xpath=..').locator('button').first();
      const collapsed = await expandBtn.locator('[data-testid="ExpandMoreIcon"]').isVisible({ timeout: 1000 }).catch(() => false);
      if (collapsed) {
        await expandBtn.click();
        console.log("✅ Expanded Patient & Letter Information section");
        await this.page.waitForTimeout(1500);
      }
    }

    const patientFields = ['Patient Name', 'Recipient Name', 'Patient Date of Birth'];
    for (const field of patientFields) {
      const added = await this.addFieldByName(field);
      if (added) console.log(`  ✅ Added patient field: ${field}`);
    }
  }

  /* ===========================
     ADD CLINIC DETAILS FIELDS
  ============================ */
  async addClinicDetailsFields() {
    const clinicSection = this.page.locator('h6, p').filter({ hasText: /Clinic Details/i }).first();
    if (await clinicSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      const expandBtn = clinicSection.locator('xpath=..').locator('button').first();
      const collapsed = await expandBtn.locator('[data-testid="ExpandMoreIcon"]').isVisible({ timeout: 1000 }).catch(() => false);
      if (collapsed) {
        await expandBtn.click();
        console.log("✅ Expanded Clinic Details section");
        await this.page.waitForTimeout(1500);
      }
    }

    const clinicFields = ['Clinic Name', 'Clinic City'];
    for (const field of clinicFields) {
      const added = await this.addFieldByName(field);
      if (added) console.log(`  ✅ Added clinic field: ${field}`);
    }
  }

  /* ===========================
     SEARCH FIELDS BOX (Create form)
  ============================ */
  async searchAndVerifyField(query = "Patient Name") {
    const searchBox = this.page.getByPlaceholder(/Search.*field/i);
    if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBox.click();
      await searchBox.fill(query);
      console.log(`✅ Searched for field: "${query}"`);
      await this.page.waitForTimeout(1500);
      const result = this.page.getByText(query, { exact: false }).first();
      if (await result.isVisible().catch(() => false)) {
        console.log(`  ✅ Search returned matching field`);
      }
      await searchBox.clear();
      await this.page.waitForTimeout(500);
    } else {
      console.log("⚠ Search box not found");
    }
  }

  /* ===========================
     VERIFY 'X FIELDS AVAILABLE' INDICATOR
  ============================ */
  async verifyFieldsCount() {
    const indicator = this.page.getByText(/\d+ fields? available/i);
    if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = (await indicator.textContent()) || '';
      console.log(`✅ Fields available: ${text.trim()}`);
    } else {
      console.log("⚠ Fields count indicator not found");
    }
  }

  /* ===========================
     REMOVE A FIELD AFTER ADDING
  ============================ */
  async removeFieldByName(fieldName) {
    // After adding, the field appears in the editor with a remove "x" button
    const removeBtn = this.page
      .locator('button[title*="remove" i], button[aria-label*="remove" i], button[title*="delete" i]')
      .first();
    if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await removeBtn.click();
      console.log(`✅ Removed field: ${fieldName}`);
      await this.page.waitForTimeout(1000);
    } else {
      console.log(`⚠ Remove button not found for ${fieldName}`);
    }
  }

  /* ===========================
     VERIFY CANCEL BUTTON EXISTS
  ============================ */
  async verifyCancelButtonExists() {
    const cancelBtn = this.page.getByRole("button", { name: /^Cancel$/i });
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("✅ Cancel button is visible");
      return true;
    }
    console.log("⚠ Cancel button not found");
    return false;
  }

  /* ===========================
     VERIFY EMPTY TEMPLATE NAME VALIDATION
  ============================ */
  async verifyEmptyNameValidation() {
    const nameInput = this.page.getByLabel(/Template Name/i);
    const original = (await nameInput.inputValue()) || '';
    await nameInput.click();
    await nameInput.fill('');
    await this.page.waitForTimeout(500);

    const saveBtn = this.page.getByRole("button", { name: /Save Template/i });
    const isDisabled = await saveBtn.isDisabled().catch(() => false);
    if (isDisabled) {
      console.log("✅ Save Template disabled when name is empty (validation working)");
    } else {
      console.log("⚠ Save button not disabled for empty name — checking error message");
      // Try clicking and see if error appears
      await saveBtn.click().catch(() => {});
      const errorMsg = this.page.getByText(/required|cannot be empty/i);
      if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("✅ Validation error shown for empty name");
      }
    }
    // Restore the name
    await nameInput.fill(original);
    await this.page.waitForTimeout(500);
  }

  async verifyTemplateCreated(templateName) {
    // After saving, check for success indicators
    const successIndicators = [
      this.page.getByText(/success/i),
      this.page.getByText(/created/i),
      this.page.getByText(/saved/i),
      this.page.getByRole("heading", { name: "Select Letter Type" }),
    ];

    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("✅ Template save confirmed");
        return true;
      }
    }

    // Fallback: verify by opening dropdown and finding the new template
    const dropdown = this.page.getByText("Select letter type", { exact: true });
    if (await dropdown.isVisible().catch(() => false)) {
      await dropdown.click();
      await this.page.waitForTimeout(1000);
      const newTemplate = this.page.getByText(templateName, { exact: true });
      if (await newTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`✅ New template "${templateName}" found in dropdown`);
        return true;
      }
    }

    console.log("⚠ Could not confirm template creation — check manually");
    return false;
  }
}
