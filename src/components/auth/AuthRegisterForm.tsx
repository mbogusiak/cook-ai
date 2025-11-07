import React from "react";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterFormValues } from "@/lib/schemas/auth";

interface Props {
  onSubmit?: (values: Omit<RegisterFormValues, "confirmPassword">) => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string | null;
}

export function AuthRegisterForm({
  onSubmit,
  isSubmitting: externalIsSubmitting = false,
  error: externalError,
}: Props): React.ReactElement {
  const [values, setValues] = React.useState<RegisterFormValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof RegisterFormValues, string>>>({});
  const [formError, setFormError] = React.useState<string | null>(externalError || null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registrationSuccess, setRegistrationSuccess] = React.useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = React.useState(false);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormError(externalError || null);
  }, [externalError]);

  React.useEffect(() => {
    setIsSubmitting(externalIsSubmitting);
  }, [externalIsSubmitting]);

  function handleFieldChange(field: keyof RegisterFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear form-level error when user starts typing
    if (formError) {
      setFormError(null);
    }
    // Clear success state when user starts typing
    if (registrationSuccess) {
      setRegistrationSuccess(false);
      setRequiresEmailConfirmation(false);
      setRegisteredEmail(null);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setRegistrationSuccess(false);
    setRequiresEmailConfirmation(false);
    setRegisteredEmail(null);

    const result = registerSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterFormValues, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof RegisterFormValues] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // If custom onSubmit is provided, use it
    if (onSubmit) {
      try {
        const { confirmPassword, ...submitData } = result.data;
        await onSubmit(submitData);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Wystąpił błąd podczas rejestracji");
      }
      return;
    }

    // Default: call API endpoint
    setIsSubmitting(true);
    try {
      const { confirmPassword, ...submitData } = result.data;
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle API error
        const errorMessage = responseData.error || "Wystąpił błąd podczas rejestracji";
        setFormError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Success: check if email confirmation is required
      const requiresConfirmation = responseData.requiresEmailConfirmation || false;
      setRequiresEmailConfirmation(requiresConfirmation);
      setRegisteredEmail(responseData.user?.email || submitData.email);
      setRegistrationSuccess(true);

      if (!requiresConfirmation) {
        // If no email confirmation required, redirect to onboarding
        // (user is automatically logged in by Supabase)
        setTimeout(() => {
          window.location.href = "/onboarding";
        }, 1500);
      }

      setIsSubmitting(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Wystąpił błąd podczas rejestracji");
      setIsSubmitting(false);
    }
  }

  const submitting = isSubmitting || externalIsSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="register-form">
      {/* Email Field */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-grow">
          <label htmlFor="email" className="block text-sm font-semibold mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => handleFieldChange("email", e.currentTarget.value)}
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "email_error" : "email_help"}
            placeholder="twoj@email.pl"
            disabled={submitting || registrationSuccess}
            data-testid="register-email"
          />
          {errors.email ? (
            <p id="email_error" className="text-sm text-destructive mt-1">
              {errors.email}
            </p>
          ) : (
            <p id="email_help" className="text-sm text-muted-foreground mt-1">
              Wprowadź swój adres email
            </p>
          )}
        </div>
      </div>

      {/* Password Field */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-grow">
          <label htmlFor="password" className="block text-sm font-semibold mb-2">
            Hasło
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
            disabled={submitting || registrationSuccess}
            data-testid="register-password"
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
            disabled={submitting || registrationSuccess}
            data-testid="register-password-confirm"
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
          data-testid="register-error"
        >
          {formError}
        </div>
      )}

      {/* Success Message - Email Confirmation Required */}
      {registrationSuccess && requiresEmailConfirmation && (
        <div
          role="alert"
          aria-live="polite"
          className="text-sm text-center p-4 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="font-semibold text-primary mb-2">Rejestracja zakończona powodzeniem!</p>
          <p className="text-muted-foreground">
            Wysłaliśmy link potwierdzający na adres <strong>{registeredEmail}</strong>. Sprawdź swoją skrzynkę pocztową
            i kliknij link, aby aktywować konto.
          </p>
        </div>
      )}

      {/* Success Message - No Confirmation Required */}
      {registrationSuccess && !requiresEmailConfirmation && (
        <div
          role="alert"
          aria-live="polite"
          className="text-sm text-center p-4 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="font-semibold text-primary mb-2">Rejestracja zakończona powodzeniem!</p>
          <p className="text-muted-foreground">Przekierowywanie...</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={submitting || registrationSuccess}
        className="w-full h-12 text-base"
        data-testid="register-submit"
      >
        {submitting ? "Rejestrowanie..." : registrationSuccess ? "Zarejestrowano" : "Zarejestruj się"}
      </Button>
    </form>
  );
}
