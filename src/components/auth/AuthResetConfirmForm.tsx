import React from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetConfirmSchema, type ResetConfirmFormValues } from "@/lib/schemas/auth";

interface Props {
  onSubmit?: (values: Omit<ResetConfirmFormValues, "confirmPassword">) => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string | null;
  isExpired?: boolean;
  onResend?: () => Promise<void> | void;
}

export function AuthResetConfirmForm({
  onSubmit,
  isSubmitting = false,
  error,
  isExpired,
  onResend,
}: Props): React.ReactElement {
  const [values, setValues] = React.useState<ResetConfirmFormValues>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof ResetConfirmFormValues, string>>>({});
  const [formError, setFormError] = React.useState<string | null>(error || null);
  const [isResending, setIsResending] = React.useState(false);

  React.useEffect(() => {
    setFormError(error || null);
  }, [error]);

  function handleFieldChange(field: keyof ResetConfirmFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear form-level error when user starts typing
    if (formError) {
      setFormError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const result = resetConfirmSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ResetConfirmFormValues, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ResetConfirmFormValues] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const { confirmPassword, ...submitData } = result.data;
      await onSubmit?.(submitData);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Wystąpił błąd podczas resetu hasła");
    }
  }

  async function handleResend(): Promise<void> {
    setIsResending(true);
    try {
      await onResend?.();
    } finally {
      setIsResending(false);
    }
  }

  if (isExpired) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Link wygasł</h2>
          <p className="text-muted-foreground mb-6">
            Link do resetu hasła wygasł (ważność 1 godzina). Możesz wygenerować nowy link.
          </p>
          {onResend && (
            <Button type="button" onClick={handleResend} disabled={isResending} className="w-full h-12 text-base">
              {isResending ? "Wysyłanie..." : "Wyślij nowy link"}
            </Button>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            <a href="/auth/login" className="text-primary underline hover:text-primary/80">
              Wróć do logowania
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="reset-confirm-form">
      {/* Password Field */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-grow">
          <label htmlFor="password" className="block text-sm font-semibold mb-2">
            Nowe hasło
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => handleFieldChange("password", e.currentTarget.value)}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={errors.password ? "password_error" : "password_help"}
            placeholder="••••••••"
            disabled={isSubmitting}
            data-testid="reset-new-password"
          />
          {errors.password ? (
            <p id="password_error" className="text-sm text-destructive mt-1">
              {errors.password}
            </p>
          ) : (
            <p id="password_help" className="text-sm text-muted-foreground mt-1">
              Minimum 6 znaków
            </p>
          )}
        </div>
      </div>

      {/* Confirm Password Field */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-grow">
          <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">
            Potwierdź hasło
          </label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(e) => handleFieldChange("confirmPassword", e.currentTarget.value)}
            aria-invalid={Boolean(errors.confirmPassword) || undefined}
            aria-describedby={errors.confirmPassword ? "confirmPassword_error" : "confirmPassword_help"}
            placeholder="••••••••"
            disabled={isSubmitting}
            data-testid="reset-new-password-confirm"
          />
          {errors.confirmPassword ? (
            <p id="confirmPassword_error" className="text-sm text-destructive mt-1">
              {errors.confirmPassword}
            </p>
          ) : (
            <p id="confirmPassword_help" className="text-sm text-muted-foreground mt-1">
              Wprowadź hasło ponownie
            </p>
          )}
        </div>
      </div>

      {/* Form-level Error */}
      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className="text-sm text-destructive text-center"
          data-testid="reset-confirm-error"
        >
          {formError}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base"
        data-testid="reset-confirm-submit"
      >
        {isSubmitting ? "Resetowanie..." : "Ustaw nowe hasło"}
      </Button>
    </form>
  );
}
