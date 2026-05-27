import { test } from '../utils/forensics-fixture';
import { AIAssistantPanelPage } from "../pages/ai-assistant-panel.page";

// Use wider viewport so floating buttons are fully visible
test.use({ viewport: { width: 1440, height: 900 } });

test("AI panel — Graph tab: knowledge graph, zoom controls, node properties, legends", async ({ page }) => {
  test.setTimeout(300000); // 5 min — extra CTAs added
  const aiPanel = new AIAssistantPanelPage(page);

  await aiPanel.openExistingPatientNote();
  await aiPanel.openFloatingPanel();
  await aiPanel.testGraphTab();
  await aiPanel.closePanel();
});

test("AI panel — Assistant tab: associations, medication & comorbidity sub-tabs", async ({ page }) => {
  test.setTimeout(300000);
  const aiPanel = new AIAssistantPanelPage(page);

  await aiPanel.openExistingPatientNote();
  await aiPanel.openFloatingPanel();
  await aiPanel.testAssistantTab();
  await aiPanel.closePanel();
});

test("AI panel — asksam tab: chat input, send message, disclaimer", async ({ page }) => {
  test.setTimeout(300000);
  const aiPanel = new AIAssistantPanelPage(page);

  await aiPanel.openExistingPatientNote();
  await aiPanel.openFloatingPanel();
  await aiPanel.testAsksamTab();
  await aiPanel.closePanel();
});
