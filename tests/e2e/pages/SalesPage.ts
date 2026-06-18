import { type Page, type Locator } from '@playwright/test';

export class SalesPage {
  readonly page: Page;
  readonly toBeSettledTab: Locator;
  readonly quickSaleTab: Locator;
  readonly basket: Locator;
  readonly payButton: Locator;
  readonly totalAmount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toBeSettledTab = page.getByRole('button', { name: /to be settled/i });
    this.quickSaleTab = page.getByRole('button', { name: /quick sale/i });
    this.basket = page.locator('[class*="basket" i], [class*="cart" i], [class*="bill" i]').first();
    this.payButton = page.getByRole('button', { name: /pay now|pay|checkout/i }).first();
    this.totalAmount = page.locator('[class*="total" i]').filter({ hasText: /total|amount/i }).first();
  }

  async selectToBeSettled() {
    await this.toBeSettledTab.click();
  }

  async selectQuickSale() {
    await this.quickSaleTab.click();
  }
}
