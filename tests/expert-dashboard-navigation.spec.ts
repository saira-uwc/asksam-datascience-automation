import { test } from '../utils/forensics-fixture';
import { ExpertDashboardPage } from '../pages/expert-dashboard.page.js';

test('Expert Dashboard | Navigation flow validation', async ({ page }) => {
  const dashboard = new ExpertDashboardPage(page);

  /* ===== DASHBOARD (auth loaded via storageState) ===== */
  await dashboard.gotoDashboard();

  await dashboard.openAppointments();
  await dashboard.gotoDashboard();

  await dashboard.openPatients();
  await dashboard.gotoDashboard();

  await dashboard.openChat();
  await dashboard.gotoDashboard();

  await dashboard.openNotifications();
  await dashboard.gotoDashboard();

  await dashboard.openSessionManagement();
  await dashboard.gotoDashboard();
});
