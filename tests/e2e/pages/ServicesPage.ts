import { type Page, type Locator } from '@playwright/test';

export class ServicesPage {
  readonly page: Page;
  readonly addServiceButton: Locator;
  readonly addCategoryButton: Locator;
  readonly searchInput: Locator;
  readonly serviceGroups: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addServiceButton = page.getByRole('button', { name: /add service/i }).first();
    this.addCategoryButton = page.getByRole('button', { name: /add category/i });
    this.searchInput = page.locator('input[placeholder*="search" i]');
    this.serviceGroups = page.locator('[class*="card" i], [class*="group" i], [class*="category" i]');
  }

  async getServiceCount(): Promise<number> {
    const items = this.page.locator('[class*="card" i]').filter({ hasText: /min|zł|\$|price/i });
    return items.count();
  }
}
