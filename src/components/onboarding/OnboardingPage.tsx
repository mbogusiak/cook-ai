import React from "react"
import { ChefHat, Flame, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOnboardingForm } from "./useOnboardingForm.ts"
import { PlanGeneratorForm } from "./PlanGeneratorForm.tsx"
import { StartDateSelector } from "./StartDateSelector.tsx"
import { BlockingLoader } from "./BlockingLoader.tsx"

export default function OnboardingPage(): React.ReactElement {
  const {
    values,
    errors,
    isSubmitting,
    setField,
    validate,
    submit,
    serverMessage,
  } = useOnboardingForm()

  const [step, setStep] = React.useState<1 | 2>(1)

  function goNext(): void {
    const isValid = validate({ validateStartDate: false })
    if (!isValid) return
    setStep(2)
  }

  async function handleGenerate(): Promise<void> {
    const ok = validate({ validateStartDate: true })
    if (!ok) return
    const success = await submit()
    if (success) {
      window.location.assign("/")
    }
  }

  const progressPercent = step === 1 ? 50 : 100

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Top Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
          <ChefHat className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-center mb-2">Stwórz swój plan żywieniowy</h1>

      {/* Step Indicator */}
      <p className="text-center text-muted-foreground mb-6">Krok {step} z 2</p>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-200 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Form Content */}
      {step === 1 ? (
        <PlanGeneratorForm
          values={values}
          errors={errors}
          onFieldChange={setField}
          isSubmitting={isSubmitting}
        />
      ) : (
        <StartDateSelector
          value={values.start_date}
          onChange={(d: string) => setField("start_date", d)}
          error={errors.start_date}
        />
      )}

      {/* Error/Message Display */}
      {serverMessage && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground text-center mb-6">
          {serverMessage}
        </p>
      )}

      {/* Button Container */}
      <div className="flex gap-3 mt-8">
        {step === 2 && (
          <Button
            variant="outline"
            type="button"
            onClick={() => setStep(1)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Wstecz
          </Button>
        )}

        <Button
          type="button"
          onClick={step === 1 ? goNext : handleGenerate}
          disabled={isSubmitting}
          className={`${step === 2 ? "flex-1" : "w-full"} h-12 text-base`}
        >
          {step === 1 ? "Dalej" : "Generuj plan"}
        </Button>
      </div>

      <BlockingLoader open={isSubmitting} message="Generowanie planu..." />
    </div>
  )
}


