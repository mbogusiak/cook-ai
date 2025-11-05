import { expect } from '@playwright/test';
import { BasePage } from './base';

export class LoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/auth/login');
    await this.expectVisible(this.getByTestId('login-form'));
  }

  async login(email: string, password: string): Promise<void> {
    await this.getByTestId('login-email').fill(email);
    await this.getByTestId('login-password').fill(password);
    await this.getByTestId('login-submit').click();
  }

  async expectError(message?: string): Promise<void> {
    const err = this.getByTestId('login-error');
    await this.expectVisible(err);
    if (message) await expect(err).toContainText(message);
  }
}

export class RegisterPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/auth/register');
    await this.expectVisible(this.getByTestId('register-form'));
  }

  async register(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.getByTestId('register-email').fill(email);
    await this.getByTestId('register-password').fill(password);
    await this.getByTestId('register-password-confirm').fill(confirmPassword ?? password);
    await this.getByTestId('register-submit').click();
  }

  async expectError(message?: string): Promise<void> {
    const err = this.getByTestId('register-error');
    await this.expectVisible(err);
    if (message) await expect(err).toContainText(message);
  }
}

export class ResetRequestPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/auth/reset');
    await this.expectVisible(this.getByTestId('reset-request-form'));
  }

  async request(email: string): Promise<void> {
    await this.getByTestId('reset-request-email').fill(email);
    await this.getByTestId('reset-request-submit').click();
  }

  async expectSuccess(): Promise<void> {
    await this.expectVisible(this.getByTestId('reset-request-success'));
  }

  async expectError(): Promise<void> {
    await this.expectVisible(this.getByTestId('reset-request-error'));
  }
}

export class ResetConfirmPage extends BasePage {
  async openWithToken(callbackUrl: string): Promise<void> {
    await this.goto(callbackUrl); // e.g. /auth/reset/callback?code=...
    await this.expectVisible(this.getByTestId('reset-confirm-form'));
  }

  async setNewPassword(password: string, confirm?: string): Promise<void> {
    await this.getByTestId('reset-new-password').fill(password);
    await this.getByTestId('reset-new-password-confirm').fill(confirm ?? password);
    await this.getByTestId('reset-confirm-submit').click();
  }
}



