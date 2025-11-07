import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PlanCard from "./PlanCard";
import type { PlanListItemVM } from "./types";

interface Props {
  items: PlanListItemVM[];
  hasActivePlan: boolean;
}

export default function PlansListContent({ items, hasActivePlan }: Props): JSX.Element {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brak planów</CardTitle>
          <CardDescription>Rozpocznij od wygenerowania nowego planu.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasActivePlan ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled>Generuj plan</Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                użytkownik może mieć tylko jeden aktywny plan
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button asChild>
              <a href="/onboarding">Generuj plan</a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}
