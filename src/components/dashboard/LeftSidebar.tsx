import { Button } from "@/components/ui/button";

type Props = {
  hasActivePlan: boolean;
};

export default function LeftSidebar({ hasActivePlan }: Props): JSX.Element {
  return (
    <div className="sticky top-6">
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-2">Akcje</div>
        <Button asChild disabled={hasActivePlan} title={hasActivePlan ? "Masz już aktywny plan" : undefined}>
          <a href="/onboarding">Generuj plan</a>
        </Button>
      </div>
    </div>
  );
}


