import { type Page, type Locator } from '@playwright/test';

export class CalendarPage {
  readonly page: Page;
  readonly prevDayButton: Locator;
  readonly nextDayButton: Locator;
  readonly dateDisplay: Locator;
  readonly addAppointmentButton: Locator;
  readonly staffSelector: Locator;
  readonly appointmentBlocks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.prevDayButton = page.getByRole('button', { name: /previous|prev|</i }).first();
    this.nextDayButton = page.getByRole('button', { name: /next|>/i }).first();
    this.dateDisplay = page.locator('[class*="date" i], [class*="header" i]').filter({ hasText: /\d{4}|\w+ \d/ }).first();
    this.addAppointmentButton = page.getByRole('button', { name: /add|new appointment|\+/i }).first();
    this.staffSelector = page.locator('[class*="select" i], [role="combobox"]').filter({ hasText: /all staff|staff/i }).first();
    this.appointmentBlocks = page.locator('[class*="appointment" i], [class*="event" i]');
  }

  async navigateNext() {
    await this.nextDayButton.click();
  }

  async navigatePrev() {
    await this.prevDayButton.click();
  }

  async clickAppointment(index = 0) {
    await this.appointmentBlocks.nth(index).click();
  }
}
