import { Locator, expect } from '@playwright/test';
import { BasePage } from './base';

export class DashboardPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/dashboard');
    await this.expectVisible(this.getByTestId('plans-list'));
  }

  get planCards(): Locator {
    return this.getByTestId('plan-card');
  }

  async openFirstPlan(): Promise<void> {
    await expect(this.planCards.first()).toBeVisible();
    await this.planCards.first().click();
  }
}



