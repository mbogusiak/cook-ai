import { Button } from "@/components/ui/button";

type Props = {
  hasActivePlan: boolean;
};

export default function BottomCTA({ hasActivePlan }: Props): JSX.Element {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white/90 backdrop-blur p-4">
      <Button asChild className="w-full" disabled={hasActivePlan} title={hasActivePlan ? "Masz już aktywny plan" : undefined}>
        <a href="/onboarding">Generuj plan</a>
      </Button>
    </div>
  );
}


