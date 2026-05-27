import * as dotenv from 'dotenv';

dotenv.config();

export const TEST_CONFIG = {
  urls: {
    base: process.env.BASE_URL || 'https://copilot.asksam.com.au',
    login: process.env.LOGIN_URL || 'https://account.asksam.com.au/register',
    dashboard: process.env.DASHBOARD_URL || 'https://dashboard.asksam.com.au',
    expertDashboard:
      process.env.EXPERT_DASHBOARD_URL || 'https://dashboard.asksam.com.au/expert/dashboard',
    copilotHome: process.env.COPILOT_HOME_URL || 'https://copilot.asksam.com.au/clinical/home',
    dashboardPages:
      process.env.DASHBOARD_PAGES_URL ||
      'https://saira-uwc.github.io/asksam-datascience-automation/',
  },
  credentials: {
    email: process.env.TEST_EMAIL || '',
    password: process.env.TEST_PASSWORD || '',
    otp: '424242',
    letterTemplateEmail:
      process.env.LETTER_TEMPLATE_TEST_EMAIL || 'ccop22.test+clerk_test@tmail.com',
  },
  sheetsUrl: process.env.GOOGLE_SHEETS_URL || '',
};
