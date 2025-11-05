import { expect } from '@playwright/test';
import { BasePage } from './base';

export class OnboardingPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/onboarding');
    await this.expectVisible(this.getByTestId('plan-form'));
  }

  async fillCalories(value: number): Promise<void> {
    await this.getByTestId('plan-calories-input').fill(String(value));
  }

  async fillPlanLength(days: number): Promise<void> {
    await this.getByTestId('plan-length-select').fill(String(days));
  }

  async nextStep(): Promise<void> {
    await this.getByTestId('plan-next-step').click();
  }

  async chooseStart(option: 'today' | 'tomorrow' | 'next_monday'): Promise<void> {
    const map = {
      today: 'start-date-today',
      tomorrow: 'start-date-tomorrow',
      next_monday: 'start-date-next-monday',
    } as const;
    await this.getByTestId(map[option]).check();
  }

  async generate(): Promise<void> {
    await this.getByTestId('generate-plan').click();
  }
}



