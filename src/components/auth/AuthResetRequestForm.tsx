import React from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetRequestSchema, type ResetRequestFormValues } from "@/lib/schemas/auth"

type Props = {
  onSubmit?: (values: ResetRequestFormValues) => Promise<void> | void
  isSubmitting?: boolean
  error?: string | null
  success?: boolean
}

export function AuthResetRequestForm({ onSubmit, isSubmitting = false, error, success }: Props): React.ReactElement {
  const [values, setValues] = React.useState<ResetRequestFormValues>({
    email: "",
  })
  const [errors, setErrors] = React.useState<Partial<Record<keyof ResetRequestFormValues, string>>>({})
  const [formError, setFormError] = React.useState<string | null>(error || null)

  React.useEffect(() => {
    setFormError(error || null)
  }, [error])

  function handleFieldChange(field: keyof ResetRequestFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    // Clear form-level error when user starts typing
    if (formError) {
      setFormError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setErrors({})
    setFormError(null)

    const result = resetRequestSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ResetRequestFormValues, string>> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ResetRequestFormValues] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    try {
      await onSubmit?.(result.data)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Wystąpił błąd podczas wysyłania linku resetu")
    }
  }

  if (success) {
    return (
      <div className="space-y-6" data-testid="reset-request-success">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Sprawdź swoją skrzynkę</h2>
          <p className="text-muted-foreground mb-6">
            Wysłaliśmy link do resetu hasła na adres <strong>{values.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Link jest ważny przez 1 godzinę. Jeśli nie otrzymałeś emaila, sprawdź folder spam lub{" "}
            <a href="/auth/reset" className="text-primary underline hover:text-primary/80">
              wyślij ponownie
            </a>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="reset-request-form">
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
            disabled={isSubmitting}
            data-testid="reset-request-email"
          />
          {errors.email ? (
            <p id="email_error" className="text-sm text-destructive mt-1">
              {errors.email}
            </p>
          ) : (
            <p id="email_help" className="text-sm text-muted-foreground mt-1">
              Wprowadź adres email powiązany z kontem
            </p>
          )}
        </div>
      </div>

      {/* Form-level Error */}
      {formError && (
        <div role="alert" aria-live="assertive" className="text-sm text-destructive text-center" data-testid="reset-request-error">
          {formError}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base"
        data-testid="reset-request-submit"
      >
        {isSubmitting ? "Wysyłanie..." : "Wyślij link resetu"}
      </Button>
    </form>
  )
}





