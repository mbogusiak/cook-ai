import type { PlanListItemVM } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  plan: PlanListItemVM;
};

export default function PlanCard({ plan }: Props): JSX.Element {
  return (
    <a href={`/plans/${plan.id}`} aria-label={`Otwórz plan ${plan.id}`}> 
      <Card className="hover:bg-accent transition-colors">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Plan #{plan.id}</CardTitle>
          <div className="text-sm text-muted-foreground">{plan.state}</div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{plan.startDateLabel} → {plan.endDateLabel}</div>
        </CardContent>
      </Card>
    </a>
  );
}


