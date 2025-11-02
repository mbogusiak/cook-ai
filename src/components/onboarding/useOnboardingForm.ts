import React from "react"
import type { CreatePlanCommand } from "@/types"
import { useAuth } from "@/components/hooks/useAuth"

type Values = {
  daily_calories: number
  plan_length_days: number
  start_date: string
}

type Errors = {
  daily_calories?: string
  plan_length_days?: string
  start_date?: string
}

type ValidateOptions = {
  validateStartDate: boolean
}

interface UseOnboardingFormOptions {
  initialUser?: {
    id: string
    email?: string
  }
}

export function useOnboardingForm(options?: UseOnboardingFormOptions) {
  const { user, isLoading: authLoading } = useAuth()
  const initialUser = options?.initialUser
  
  // Use initialUser from SSR if available, otherwise use user from useAuth
  // This ensures we have user data immediately on first render
  const currentUser = user || (initialUser ? { id: initialUser.id, email: initialUser.email || undefined } : null)
  
  const [values, setValues] = React.useState<Values>({
    daily_calories: 2000,
    plan_length_days: 7,
    start_date: "",
  })
  const [errors, setErrors] = React.useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [serverMessage, setServerMessage] = React.useState<string>("")

  function setField(name: keyof Values, value: string | number): void {
    setValues((prev) => {
      const next = { ...prev }
      if (name === "daily_calories" || name === "plan_length_days") {
        const parsed = typeof value === "number" ? value : Number(value)
        next[name] = Number.isFinite(parsed) ? parsed : ("" as unknown as number)
      } else if (name === "start_date") {
        next.start_date = String(value)
      }
      return next
    })
  }

  function validate(opts: ValidateOptions): boolean {
    const nextErrors: Errors = {}
    if (!Number.isFinite(values.daily_calories) || values.daily_calories < 100 || values.daily_calories > 10000) {
      nextErrors.daily_calories = "Wprowadź liczbę 100-10000"
    }
    if (!Number.isFinite(values.plan_length_days) || values.plan_length_days < 1 || values.plan_length_days > 31) {
      nextErrors.plan_length_days = "Zakres 1-31"
    }
    if (opts.validateStartDate) {
      if (!values.start_date) {
        nextErrors.start_date = "Wybierz datę startu"
      } else {
        const today = new Date()
        const picked = new Date(values.start_date)
        const todayISO = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        if (picked < todayISO) {
          nextErrors.start_date = "Data nie może być wcześniejsza niż dzisiaj"
        }
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submit(): Promise<number | null> {
    setServerMessage("")
    setIsSubmitting(true)
    try {
      // Check if user is authenticated
      // Use currentUser which combines SSR and client-side auth
      if (authLoading && !initialUser) {
        setServerMessage("Ładowanie danych użytkownika...")
        return null
      }

      if (!currentUser || !currentUser.id) {
        setServerMessage("Zaloguj się, żeby wygenerować plan")
        setIsSubmitting(false)
        return null
      }

      // 1) Create user-settings
      // Note: user_id is now taken from session on the server
      const settingsBody = {
        default_daily_calories: values.daily_calories,
        default_plan_length_days: values.plan_length_days,
      }
      const usRes = await fetch("/api/user-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsBody),
      })
      if (!usRes.ok && usRes.status !== 409) {
        const text = await usRes.text()
        setServerMessage(`Błąd tworzenia ustawień: ${text}`)
        return null
      }

      // 2) Generate plan
      // Note: user_id is now taken from session on the server
      const planBody: CreatePlanCommand = {
        daily_calories: values.daily_calories,
        plan_length_days: values.plan_length_days,
        start_date: values.start_date,
      }
      const genRes = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planBody),
      })
      if (!genRes.ok) {
        const text = await genRes.text()
        setServerMessage(`Błąd generowania planu: ${text}`)
        return null
      }

      // Extract plan ID from response
      const planData = await genRes.json()
      const planId = planData.id

      if (!planId) {
        setServerMessage("Błąd: Nie otrzymano ID planu")
        return null
      }

      setServerMessage("Sukces! Przekierowanie...")
      return planId
    } catch (e) {
      setServerMessage("Wystąpił błąd sieci. Spróbuj ponownie.")
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  function clearServerMessage(): void {
    setServerMessage("")
  }

  return {
    values,
    errors,
    isSubmitting,
    serverMessage,
    setField,
    validate,
    submit,
    clearServerMessage,
    isAuthLoading: authLoading,
    isAuthenticated: !!currentUser,
  }
}

export type { Values as OnboardingViewModel, Errors as FormErrors }


