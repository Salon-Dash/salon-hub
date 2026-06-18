import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly logoutButton: Locator;
  readonly statsCards: Locator;
  readonly appointmentsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('nav, aside, [class*="sidebar" i]').first();
    this.logoutButton = page.getByRole('button', { name: /logout|sign out|log out/i });
    this.statsCards = page.locator('[class*="card" i]').filter({ hasText: /revenue|booking|client|rating/i });
    this.appointmentsSection = page.locator('[class*="appointment" i], section').filter({ hasText: /appointment|today/i });
  }

  async navigateTo(item: string) {
    await this.page.getByRole('link', { name: new RegExp(item, 'i') }).first().click();
  }
}
