import { expect } from "@playwright/test";
import { BasePage } from "./base";

export class LoginPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/auth/login");
    await this.expectVisible(this.getByTestId("login-form"));
  }

  async login(email: string, password: string): Promise<void> {
    await this.getByTestId("login-email").fill(email);
    await this.getByTestId("login-password").fill(password);

    await this.getByTestId("login-submit").click();

    // Wait for form submission to complete
    // Either: successful login (redirects) OR failed login (shows error, stays on page)
    try {
      // Try to wait for navigation first (successful login)
      await this.page.waitForNavigation({ timeout: 15000 });
    } catch {
      // If navigation doesn't happen, wait for network to idle and check for errors
      // This handles the case where login fails and we stay on the login page
      await this.page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    }
  }

  async expectError(message?: string): Promise<void> {
    // Check for form-level error OR field-level errors
    const formError = this.getByTestId("login-error");
    const fieldErrors = this.page.locator(".text-destructive").first();

    // Wait for either form error or field error to be visible
    try {
      await expect(formError.or(fieldErrors)).toBeVisible({ timeout: 5000 });
      if (message && (await formError.isVisible())) {
        await expect(formError).toContainText(message);
      }
    } catch (e) {
      // If no error is visible, check if there are any field-specific errors
      const hasFieldError = await fieldErrors.isVisible();
      if (!hasFieldError) {
        throw new Error("Expected to find an error message but none was visible");
      }
    }
  }
}

export class RegisterPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/auth/register");
    await this.expectVisible(this.getByTestId("register-form"));
  }

  async register(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.getByTestId("register-email").fill(email);
    await this.getByTestId("register-password").fill(password);
    await this.getByTestId("register-password-confirm").fill(confirmPassword ?? password);

    await this.getByTestId("register-submit").click();

    // Wait for form submission to complete
    // Either: successful registration (redirects) OR failed registration (shows error, stays on page)
    try {
      // Try to wait for navigation first (successful registration)
      await this.page.waitForNavigation({ timeout: 15000 });
    } catch {
      // If navigation doesn't happen, wait for network to idle
      // This handles the case where registration fails and we stay on the register page
      await this.page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    }
  }

  async expectError(message?: string): Promise<void> {
    // Check for form-level error OR field-level errors
    const formError = this.getByTestId("register-error");
    const fieldErrors = this.page.locator(".text-destructive").first();

    // Wait for either form error or field error to be visible
    try {
      await expect(formError.or(fieldErrors)).toBeVisible({ timeout: 5000 });
      if (message && (await formError.isVisible())) {
        await expect(formError).toContainText(message);
      }
    } catch (e) {
      // If no error is visible, check if there are any field-specific errors
      const hasFieldError = await fieldErrors.isVisible();
      if (!hasFieldError) {
        throw new Error("Expected to find an error message but none was visible");
      }
    }
  }
}

export class ResetRequestPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/auth/reset");
    await this.expectVisible(this.getByTestId("reset-request-form"));
  }

  async request(email: string): Promise<void> {
    await this.getByTestId("reset-request-email").fill(email);

    await this.getByTestId("reset-request-submit").click();

    // Wait for form submission to complete
    // Either: success message OR error message appears
    await this.page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  }

  async expectSuccess(): Promise<void> {
    await this.expectVisible(this.getByTestId("reset-request-success"));
  }

  async expectError(): Promise<void> {
    // Check for form-level error OR field-level errors
    const formError = this.getByTestId("reset-request-error");
    const fieldErrors = this.page.locator(".text-destructive").first();

    // Wait for either form error or field error to be visible
    try {
      await expect(formError.or(fieldErrors)).toBeVisible({ timeout: 5000 });
    } catch (e) {
      // If no error is visible, check if there are any field-specific errors
      const hasFieldError = await fieldErrors.isVisible();
      if (!hasFieldError) {
        throw new Error("Expected to find an error message but none was visible");
      }
    }
  }
}

export class ResetConfirmPage extends BasePage {
  async openWithToken(callbackUrl: string): Promise<void> {
    await this.goto(callbackUrl); // e.g. /auth/reset/callback?code=...
    await this.expectVisible(this.getByTestId("reset-confirm-form"));
  }

  async setNewPassword(password: string, confirm?: string): Promise<void> {
    await this.getByTestId("reset-new-password").fill(password);
    await this.getByTestId("reset-new-password-confirm").fill(confirm ?? password);

    await this.getByTestId("reset-confirm-submit").click();

    // Wait for form submission to complete
    await this.page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  }
}
