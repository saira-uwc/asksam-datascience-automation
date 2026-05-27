import { test } from '../utils/forensics-fixture';
import { LetterTemplatePage } from '../pages/letter-template.page';
import { LoginPage } from '../pages/LoginPage';
import { TEST_CONFIG } from '../utils/testData';

// Use a separate login for letter-template tests
test.use({ storageState: { cookies: [], origins: [] } });

const LETTER_TEMPLATE_EMAIL = TEST_CONFIG.credentials.letterTemplateEmail;

test.beforeEach(async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginAsClinician(LETTER_TEMPLATE_EMAIL);
});

test("Open letter template from Actions dropdown, select type and verify preview", async ({
  page,
}) => {
  test.setTimeout(300000); // 5 min — extra CTAs added
  const letterTemplate = new LetterTemplatePage(page);

  /* ===== STEP 1: Navigate to an existing patient note ===== */
  await letterTemplate.openExistingPatientNote();

  /* ===== STEP 2: Open Actions → Letter Templates ===== */
  await letterTemplate.openLetterTemplates();

  /* ===== STEP 3: Select a letter type from dropdown ===== */
  await letterTemplate.selectLetterType("Referral Letter");

  /* ===== STEP 4: Verify template content and preview ===== */
  await letterTemplate.verifyTemplateContent();

  /* ===== STEP 5: Search available fields ===== */
  await letterTemplate.searchAvailableFields("Patient");

  /* ===== STEP 6: Edit Template Name + Letter Body ===== */
  await letterTemplate.editTemplateContent();

  /* ===== STEP 7: Click Update Template ===== */
  await letterTemplate.clickUpdateTemplate();

  /* ===== STEP 8: Download the template ===== */
  await letterTemplate.downloadTemplate();
});

test("Create a new letter template from Actions dropdown", async ({ page }) => {
  test.setTimeout(300000); // 5 min — extra CTAs added
  const letterTemplate = new LetterTemplatePage(page);
  const templateName = `Test Template ${Date.now().toString().slice(-6)}`;

  /* ===== STEP 1: Navigate to an existing patient note ===== */
  await letterTemplate.openExistingPatientNote();

  /* ===== STEP 2: Open Actions → Letter Templates ===== */
  await letterTemplate.openLetterTemplates();

  /* ===== STEP 3: Click + Create Template ===== */
  await letterTemplate.clickCreateTemplate();

  /* ===== STEP 4: Verify Cancel button exists ===== */
  await letterTemplate.verifyCancelButtonExists();

  /* ===== STEP 5: Verify "X fields available" indicator ===== */
  await letterTemplate.verifyFieldsCount();

  /* ===== STEP 6: Search fields box ===== */
  await letterTemplate.searchAndVerifyField("Patient Name");

  /* ===== STEP 7: Fill new template form ===== */
  await letterTemplate.fillNewTemplateForm(templateName);

  /* ===== STEP 8: Add Patient Information fields ===== */
  await letterTemplate.addPatientInfoFields();

  /* ===== STEP 9: Add Clinic Details fields ===== */
  await letterTemplate.addClinicDetailsFields();

  /* ===== STEP 10: Select Clinical Notes fields (CC, HPI) ===== */
  await letterTemplate.selectClinicalNoteFields();

  /* ===== STEP 11: Verify empty Template Name validation ===== */
  await letterTemplate.verifyEmptyNameValidation();

  /* ===== STEP 12: Save the new template ===== */
  await letterTemplate.saveNewTemplate();

  /* ===== STEP 13: Verify template was created ===== */
  await letterTemplate.verifyTemplateCreated(templateName);
});
