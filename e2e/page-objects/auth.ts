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

    // Wait for navigation and network to be idle after form submission
    // The login flow involves:
    // 1. Form submission to /api/auth/login
    // 2. On success, client redirects to /auth/login to trigger SSR guard
    // 3. SSR guard detects session and redirects to /dashboard or /onboarding
    //
    // We need to wait for all of this to complete before returning

    const errorLocator = this.page
      .locator('[data-testid="login-error"], .text-destructive')
      .first();

    // Wait longer for network to settle after form submission
    await this.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // Now check what happened: either error or successful redirect
    // Allow a moment for any redirects to complete
    await this.page.waitForTimeout(1000);

    // Try to detect if we're at the final destination or still on login
    let currentUrl = this.page.url();
    let hasError = await errorLocator.isVisible().catch(() => false);

    // If on login page and no error visible, we might be between redirects
    // Give it more time to complete the redirect chain
    if (currentUrl.includes("/auth/login") && !hasError) {
      try {
        // Wait for the final redirect to dashboard or onboarding
        // Timeout of 20s to account for slow SSR guard
        await this.page.waitForURL(/\/(dashboard|onboarding)/, {
          timeout: 20000,
        });
      } catch (e) {
        // If redirect times out, check if there's an error we missed
        hasError = await errorLocator.isVisible().catch(() => false);
        if (!hasError) {
          // No error and no redirect - this is unexpected
          // But don't throw here, let the test handle it
        }
      }
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
