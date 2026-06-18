import { type Page, type Locator } from '@playwright/test';

export class RegistrationPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordConfirmInput: Locator;
  readonly termsCheckbox: Locator;
  readonly continueButton: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.locator('input[placeholder*="first" i], input[id*="first" i]').first();
    this.lastNameInput = page.locator('input[placeholder*="last" i], input[id*="last" i]').first();
    this.emailInput = page.locator('input[type="email"]').first();
    this.passwordInput = page.locator('input[id="password"], input[placeholder*="password" i]').first();
    this.passwordConfirmInput = page.locator('input[id="passwordConfirmation"], input[placeholder*="confirm" i]').first();
    this.termsCheckbox = page.locator('[role="checkbox"]').first();
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.signInLink = page.getByRole('link', { name: /sign in/i });
  }

  async goto() {
    await this.page.goto('/register');
  }

  async fillStep1(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms?: boolean;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.passwordConfirmInput.fill(data.confirmPassword);
    if (data.acceptTerms) {
      await this.termsCheckbox.click();
    }
  }

  async getToastMessage(): Promise<string> {
    const toast = this.page.locator('[data-sonner-toast]').first();
    await toast.waitFor({ timeout: 8000 });
    return toast.innerText();
  }

  async currentStep(): Promise<number> {
    const stepText = await this.page.locator('text=/step \\d/i, [class*="step"]').first().innerText().catch(() => '1');
    const match = stepText.match(/\d/);
    return match ? parseInt(match[0]) : 1;
  }
}
