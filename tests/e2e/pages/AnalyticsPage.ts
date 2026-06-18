import { type Page, type Locator } from '@playwright/test';

export class AnalyticsPage {
  readonly page: Page;
  readonly overviewTab: Locator;
  readonly revenueTab: Locator;
  readonly bookingsTab: Locator;
  readonly clientsTab: Locator;
  readonly servicesTab: Locator;
  readonly staffTab: Locator;
  readonly periodSelector: Locator;
  readonly statCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overviewTab = page.getByRole('tab', { name: /overview/i });
    this.revenueTab = page.getByRole('tab', { name: /revenue/i });
    this.bookingsTab = page.getByRole('tab', { name: /booking/i });
    this.clientsTab = page.getByRole('tab', { name: /client/i });
    this.servicesTab = page.getByRole('tab', { name: /service/i });
    this.staffTab = page.getByRole('tab', { name: /staff/i });
    this.periodSelector = page.locator('[role="combobox"]').filter({ hasText: /day|week|month|30/i }).first();
    this.statCards = page.locator('[class*="card" i]').filter({ hasText: /revenue|booking|client|ticket|appointment/i });
  }

  async selectPeriod(period: string) {
    await this.periodSelector.click();
    await this.page.getByRole('option', { name: new RegExp(period, 'i') }).click();
  }
}
