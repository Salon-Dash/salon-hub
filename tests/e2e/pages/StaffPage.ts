import { type Page, type Locator } from '@playwright/test';

export class StaffPage {
  readonly page: Page;
  readonly addStaffButton: Locator;
  readonly staffList: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addStaffButton = page.getByRole('button', { name: /add staff|new staff|\+ staff/i });
    this.staffList = page.locator('[class*="staff" i], [class*="card" i]').filter({ hasText: /position|staff|team/i });
    this.searchInput = page.locator('input[placeholder*="search" i]');
  }

  async getStaffCards(): Promise<Locator[]> {
    const cards = this.page.locator('[class*="card" i], [class*="staff-item" i]');
    const count = await cards.count();
    return Array.from({ length: count }, (_, i) => cards.nth(i));
  }

  async openAddStaffForm() {
    await this.addStaffButton.click();
  }
}
