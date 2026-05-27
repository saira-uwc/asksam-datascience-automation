// helpers/wait.js
export async function safeClick(locator, timeout = 15000) {
  await locator.waitFor({ state: "visible", timeout });
  await locator.click();
}

export async function optionalClick(locator, timeout = 5000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
    await locator.click();
    return true;
  } catch {
    return false;
  }
}

export function uploadFilePath(filename) {
  // resolves file path relative to repo root
  return `${process.cwd()}/uploads/${filename}`;
}

/* ===============================
   NEW: wait for patient load
   =============================== */
export async function waitForPatientDetails(page, timeout = 30000) {
  // 1️⃣ wait for skeleton loaders to disappear (UI ready)
  await page
    .locator(".MuiSkeleton-root")
    .first()
    .waitFor({ state: "detached", timeout })
    .catch(() => {});

  // 2️⃣ final confirmation: Upload button visible
  await page
    .getByRole("button", { name: "Upload" })
    .waitFor({ state: "visible", timeout });
}