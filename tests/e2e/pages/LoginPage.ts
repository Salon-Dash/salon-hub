import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly signUpLink: Locator;
  readonly passwordToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.passwordToggle = page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first();
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getToastMessage(): Promise<string> {
    const toast = this.page.locator('[data-sonner-toast]').first();
    await toast.waitFor({ timeout: 8000 });
    return toast.innerText();
  }
}
