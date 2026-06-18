import { type Page, type Locator } from '@playwright/test';

export class BusinessHoursPage {
  readonly page: Page;
  readonly saveButton: Locator;
  readonly dayToggles: Locator;
  readonly startTimeInputs: Locator;
  readonly endTimeInputs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.dayToggles = page.locator('[role="switch"], input[type="checkbox"]');
    this.startTimeInputs = page.locator('input[type="time"]').filter({ has: page.locator(':scope').nth(0) });
    this.endTimeInputs = page.locator('input[type="time"]');
  }

  async toggleDay(dayLabel: string) {
    const row = this.page.locator('*', { hasText: new RegExp(`^${dayLabel}$`, 'i') })
      .locator('xpath=ancestor::*[contains(@class,"flex") or contains(@class,"row")]')
      .first();
    const toggle = row.locator('[role="switch"], input[type="checkbox"]').first();
    await toggle.click();
  }

  async setTime(dayLabel: string, field: 'start' | 'end', value: string) {
    const row = this.page.locator('tr, [class*="row" i]').filter({ hasText: new RegExp(dayLabel, 'i') }).first();
    const inputs = row.locator('input[type="time"]');
    if (field === 'start') {
      await inputs.first().fill(value);
    } else {
      await inputs.last().fill(value);
    }
  }

  async save() {
    await this.saveButton.click();
  }
}
