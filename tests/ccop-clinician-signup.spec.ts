import { test } from '../utils/forensics-fixture';
import { CCOPClinicianSignupPage } from '../pages/ccop-clinician-signup.page';

test('CCOP | Clinician signup full flow (recorded)', async ({ page }) => {
  test.setTimeout(300000); // 5 min — Clerk auth + Stripe popup + tours
  const signup = new CCOPClinicianSignupPage(page);

  const id = Date.now().toString().slice(-6);
  const user = {
    firstName: 'test',
    lastName: `autouser${id}`,
    email: `testautouser${id}+clerk_test@tmail.com`,
  };

  await signup.signup(user);

  const popup = await signup.activateFreePlan();

  // Tours + logout only run if Stripe popup opened (AU IP required)
  if (popup) {
    await signup.completeTours(popup);
    await signup.logout(popup);
  } else {
    console.log('✅ Signup + auth + Plans page verified (Stripe skipped — non-AU IP)');
  }
});