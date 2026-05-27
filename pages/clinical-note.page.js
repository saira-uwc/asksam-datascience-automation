import { safeClick, optionalClick } from "../utils/helpers";
import path from "path";

export class ClinicalNotePage {
  constructor(page) {
    this.page = page;
  }

  async createClinicalNote(fileName) {
    await safeClick(this.page.getByRole("button", { name: "Create Clinical Note" }));

    // ✅ Patient fallback logic
    const patients = [
      "Yamini Singh 191",
      "Ganesh Test 123",
      "Yamini Singh 185"
    ];

    let selected = false;
    for (const patient of patients) {
      const found = await optionalClick(
        this.page.getByText(patient),
        3000
      );
      if (found) {
        selected = true;
        break;
      }
    }

    if (!selected) {
      throw new Error("❌ No expected patient found");
    }

    // Upload document
    await safeClick(this.page.getByRole("button", { name: "Upload" }));
    await this.page
      .getByRole("button", { name: "Choose File" })
      .setInputFiles(path.resolve(fileName));

    await safeClick(this.page.getByRole("button", { name: "Transcribe All" }));
    await safeClick(this.page.getByRole("button", { name: "Send Transcription" }));

    // Disclaimer may appear twice
    await optionalClick(this.page.getByRole("button", { name: /I Understand and Accept/i }), 5000);
    await optionalClick(this.page.getByRole("button", { name: /I Understand and Accept/i }), 5000);

    await optionalClick(this.page.getByRole("button", { name: "Save" }), 5000);
    await optionalClick(this.page.getByRole("button", { name: "Submit" }), 5000);
    await optionalClick(this.page.getByRole("button", { name: "Submit" }), 5000);
  }

  async logout() {
    await safeClick(this.page.getByRole("button", { name: "Open user menu" }));
    await safeClick(this.page.getByRole("menuitem", { name: "Sign out" }));
  }
}