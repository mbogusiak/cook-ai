import React from "react"
import { Flame, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"

export type OnboardingFormValues = {
  daily_calories: number
  plan_length_days: number
  start_date: string
}

export type OnboardingFormErrors = {
  daily_calories?: string
  plan_length_days?: string
  start_date?: string
}

type Props = {
  values: OnboardingFormValues
  errors: OnboardingFormErrors
  isSubmitting?: boolean
  onFieldChange: (name: keyof OnboardingFormValues, value: string | number) => void
}

export function PlanGeneratorForm({ values, errors, onFieldChange, isSubmitting }: Props): React.ReactElement {
  return (
    <form className="space-y-6">
      {/* Calories Field */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
        </div>
        <div className="flex-grow">
          <label htmlFor="daily_calories" className="block text-sm font-semibold mb-2">
            Dzienne zapotrzebowanie kaloryczne
          </label>
          <Input
            id="daily_calories"
            type="number"
            inputMode="numeric"
            min={100}
            max={10000}
            step={50}
            value={Number.isFinite(values.daily_calories) ? values.daily_calories : ""}
            onChange={(e) => onFieldChange("daily_calories", e.currentTarget.value)}
            aria-invalid={Boolean(errors.daily_calories) || undefined}
            aria-describedby={errors.daily_calories ? "daily_calories_error" : "daily_calories_help"}
            placeholder="np. 2000"
            disabled={isSubmitting}
          />
          {errors.daily_calories ? (
            <p id="daily_calories_error" className="text-sm text-destructive mt-1">
              {errors.daily_calories}
            </p>
          ) : (
            <p id="daily_calories_help" className="text-sm text-muted-foreground mt-1">
              Wprowadź swoją dzienną normę kalorii
            </p>
          )}
        </div>
      </div>

      {/* Plan Length Field */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className="flex-grow">
          <label htmlFor="plan_length_days" className="block text-sm font-semibold mb-2">
            Długość planu (dni)
          </label>
          <Input
            id="plan_length_days"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            step={1}
            value={Number.isFinite(values.plan_length_days) ? values.plan_length_days : ""}
            onChange={(e) => onFieldChange("plan_length_days", e.currentTarget.value)}
            aria-invalid={Boolean(errors.plan_length_days) || undefined}
            aria-describedby={errors.plan_length_days ? "plan_length_days_error" : "plan_length_days_help"}
            placeholder="np. 7"
            disabled={isSubmitting}
          />
          {errors.plan_length_days ? (
            <p id="plan_length_days_error" className="text-sm text-destructive mt-1">
              {errors.plan_length_days}
            </p>
          ) : (
            <p id="plan_length_days_help" className="text-sm text-muted-foreground mt-1">
              Zalecamy plan 7-dniowy
            </p>
          )}
        </div>
      </div>
    </form>
  )
}


