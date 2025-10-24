import React from "react"
import type { CreateUserSettingsCommand, CreatePlanCommand } from "@/types"

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

export function useOnboardingForm() {
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

  async function submit(): Promise<boolean> {
    setServerMessage("")
    setIsSubmitting(true)
    try {
      // Development: Use fixed user ID
      const userId = "321a3490-fa8f-43ee-82c5-9efdfe027603"

      // 1) Create user-settings
      const settingsBody: CreateUserSettingsCommand = {
        user_id: userId,
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
        return false
      }

      // 2) Generate plan
      const planBody: CreatePlanCommand & { user_id: string } = {
        user_id: userId,
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
        return false
      }

      setServerMessage("Sukces! Przekierowanie...")
      return true
    } catch (e) {
      setServerMessage("Wystąpił błąd sieci. Spróbuj ponownie.")
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    values,
    errors,
    isSubmitting,
    serverMessage,
    setField,
    validate,
    submit,
  }
}

export type { Values as OnboardingViewModel, Errors as FormErrors }


