import type { PlanListItemVM } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  plan: PlanListItemVM;
};

function getStateLabel(state: PlanListItemVM["state"]): string {
  const stateLabels = {
    active: "Aktywny",
    archived: "Zarchiwizowany",
    cancelled: "Anulowany"
  };
  return stateLabels[state] || state;
}

function getStateColor(state: PlanListItemVM["state"]): string {
  const colors = {
    active: "text-info",
    archived: "text-success",
    cancelled: "text-destructive"
  };
  return colors[state] || "text-muted-foreground";
}

export default function PlanCard({ plan }: Props): JSX.Element {
  const stateLabel = getStateLabel(plan.state);
  const stateColor = getStateColor(plan.state);

  return (
    <a href={`/plans/${plan.id}`} aria-label={`Otwórz plan ${plan.id}`}>
      <Card className="hover:bg-accent transition-colors">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Plan #{plan.id}</CardTitle>
          <div className={`text-sm font-medium ${stateColor}`}>{stateLabel}</div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{plan.startDateLabel} → {plan.endDateLabel}</div>
        </CardContent>
      </Card>
    </a>
  );
}


