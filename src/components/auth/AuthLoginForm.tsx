import React from "react";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth";

interface Props {
  onSubmit?: (values: LoginFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string | null;
}

export function AuthLoginForm({
  onSubmit,
  isSubmitting: externalIsSubmitting = false,
  error: externalError,
}: Props): React.ReactElement {
  const [values, setValues] = React.useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const [formError, setFormError] = React.useState<string | null>(externalError || null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setFormError(externalError || null);
  }, [externalError]);

  React.useEffect(() => {
    setIsSubmitting(externalIsSubmitting);
  }, [externalIsSubmitting]);

  function handleFieldChange(field: keyof LoginFormValues, value: string): void {
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

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormValues, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof LoginFormValues] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // If custom onSubmit is provided, use it
    if (onSubmit) {
      try {
        await onSubmit(result.data);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Wystąpił błąd podczas logowania");
      }
      return;
    }

    // Default: call API endpoint
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle API error
        const errorMessage = responseData.error || "Wystąpił błąd podczas logowania";
        setFormError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Success: determine redirect destination
      const urlParams = new URLSearchParams(window.location.search);
      const nextParam = urlParams.get("next");

      if (nextParam) {
        // Redirect to next parameter
        window.location.href = decodeURIComponent(nextParam);
        return;
      }

      // Check if user has active plan (client-side fallback)
      // SSR guard in login.astro should handle this, but we provide fallback
      try {
        const plansResponse = await fetch("/api/plans?state=active&limit=1");
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          const hasActivePlan = plansData.has_active_plan || (plansData.data && plansData.data.length > 0);

          if (hasActivePlan) {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/onboarding";
          }
        } else {
          // Fallback to onboarding if check fails
          window.location.href = "/onboarding";
        }
      } catch (checkError) {
        // Fallback to onboarding on error
        console.error("Error checking active plan:", checkError);
        window.location.href = "/onboarding";
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Wystąpił błąd podczas logowania");
      setIsSubmitting(false);
    }
  }

  const submitting = isSubmitting || externalIsSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="login-form">
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
            disabled={submitting}
            data-testid="login-email"
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
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => handleFieldChange("password", e.currentTarget.value)}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={errors.password ? "password_error" : "password_help"}
            placeholder="••••••••"
            disabled={submitting}
            data-testid="login-password"
          />
          {errors.password ? (
            <p id="password_error" className="text-sm text-destructive mt-1">
              {errors.password}
            </p>
          ) : (
            <p id="password_help" className="text-sm text-muted-foreground mt-1">
              Wprowadź swoje hasło
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
          data-testid="login-error"
        >
          {formError}
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={submitting} className="w-full h-12 text-base" data-testid="login-submit">
        {submitting ? "Logowanie..." : "Zaloguj się"}
      </Button>
    </form>
  );
}
