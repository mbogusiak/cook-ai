import React from "react"
import { ChefHat, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useOnboardingForm } from "./useOnboardingForm.ts"
import { PlanGeneratorForm } from "./PlanGeneratorForm.tsx"
import { StartDateSelector } from "./StartDateSelector.tsx"
import { BlockingLoader } from "./BlockingLoader.tsx"

interface OnboardingPageProps {
  initialUser?: {
    id: string
    email?: string
  }
}

export default function OnboardingPage({ initialUser }: OnboardingPageProps): React.ReactElement {
  const {
    values,
    errors,
    isSubmitting,
    setField,
    validate,
    submit,
    serverMessage,
    clearServerMessage,
  } = useOnboardingForm({ initialUser })

  const [step, setStep] = React.useState<1 | 2>(1)

  function goNext(): void {
    const isValid = validate({ validateStartDate: false })
    if (!isValid) return
    clearServerMessage()
    setStep(2)
  }

  function goBack(): void {
    clearServerMessage()
    setStep(1)
  }

  async function handleGenerate(): Promise<void> {
    const ok = validate({ validateStartDate: true })
    if (!ok) return
    const planId = await submit()
    if (planId) {
      window.location.assign(`/plans/${planId}`)
    }
  }

  const progressPercent = step === 1 ? 50 : 100

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Top Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 rounded-full bg-warning flex items-center justify-center">
          <ChefHat className="w-8 h-8 text-warning-foreground" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-center mb-2">Stwórz swój plan żywieniowy</h1>

      {/* Step Indicator */}
      <p className="text-center text-muted-foreground mb-6">Krok {step} z 2</p>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-warning transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Error/Message Display */}
      {serverMessage && (
        <Card 
          role="alert" 
          aria-live="polite" 
          className={serverMessage.includes("Zaloguj się") 
            ? "border-warning bg-warning/10 mb-6" 
            : "border-muted mb-6"
          }
        >
          <CardContent className="flex items-center justify-center py-3">
            <div className="flex items-center justify-center gap-3">
              {serverMessage.includes("Zaloguj się") && (
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
              )}
              <p className={serverMessage.includes("Zaloguj się") 
                ? "text-foreground font-medium" 
                : "text-muted-foreground text-sm"
              }>
                {serverMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Button Container */}
      <div className="flex gap-3 mt-8">
        {step === 2 && (
          <Button
            variant="outline"
            type="button"
            onClick={goBack}
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
          data-testid={step === 1 ? "plan-next-step" : "generate-plan"}
        >
          {step === 1 ? "Dalej" : "Generuj plan"}
        </Button>
      </div>

      <BlockingLoader open={isSubmitting} message="Generowanie planu..." />
    </div>
  )
}


