export class ExpertDashboardPage {
  constructor(page) {
    this.page = page;
  }

  /* ===============================
     WAIT FOR DASHBOARD
  =============================== */
  async gotoDashboard() {
    await this.page.goto('https://dashboard.asksam.com.au/expert/dashboard');
    await this.page
      .getByRole('heading', { name: 'Upcoming Appointments' })
      .waitFor({ timeout: 30000 });
  }

  /* ===============================
     SIDEBAR NAVIGATION (FINAL)
  =============================== */
  async clickSidebarLink(name, urlPart) {
    const link = this.page.getByRole('link', { name, exact: true });
    await link.waitFor({ state: 'visible', timeout: 30000 });
    await link.click();
    if (urlPart) {
      await this.page.waitForURL(new RegExp(urlPart), { timeout: 30000 });
    }
  }

  async openAppointments() {
    await this.clickSidebarLink('Appointments', '/expert/appointments');
  }

  async openPatients() {
    await this.clickSidebarLink('Patients', '/expert/patients');
  }

  async openChat() {
    await this.clickSidebarLink('Chat', '/expert/chat');
  }

  async openNotifications() {
    await this.clickSidebarLink('Notifications', '/expert/notifications');
  }

  async openSessionManagement() {
    await this.clickSidebarLink(
      'Session Management',
      '/expert/sessionmanagement'
    );
  }
}