import { type Page, type Locator } from '@playwright/test';

export class ClientsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly filtersButton: Locator;
  readonly addClientButton: Locator;
  readonly clientCards: Locator;
  readonly inviteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="search" i]');
    this.filtersButton = page.getByRole('button', { name: /filter/i });
    this.addClientButton = page.getByRole('button', { name: /add client|new client/i });
    this.clientCards = page.locator('[class*="card" i]').filter({ hasText: /visit|spent|client/i });
    this.inviteButton = page.getByRole('button', { name: /invite/i });
  }

  async searchClient(name: string) {
    await this.searchInput.fill(name);
    await this.page.keyboard.press('Enter');
  }
}
