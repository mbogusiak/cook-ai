/**
 * Plan header component
 * Displays metadata, status, and actions
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ActionMenu } from "./ActionMenu";
import { formatDateRange } from "./dateUtils";
import type { PlanOverviewViewModel, PlanState } from "./types";

interface PlanHeaderProps {
  plan: PlanOverviewViewModel;
  onArchive: () => void;
  onCancel: () => void;
}

/**
 * Returns badge variant and text for plan state
 */
function getStateBadge(state: PlanState) {
  const badges = {
    active: { variant: "default" as const, text: "Aktywny", className: "" },
    completed: { variant: "default" as const, text: "Ukończony", className: "bg-success" },
    cancelled: { variant: "destructive" as const, text: "Anulowany", className: "bg-destructive" },
  };
  return badges[state];
}

/**
 * Returns completion status text and color
 */
function getCompletionBadge(percentage: number) {
  if (percentage >= 90) {
    return { text: "Gotowy do archiwizacji", className: "text-success" };
  } else if (percentage >= 50) {
    return { text: "W trakcie", className: "text-warning" };
  } else {
    return { text: "Rozpoczęty", className: "text-muted-foreground" };
  }
}

export function PlanHeader({ plan, onArchive, onCancel }: PlanHeaderProps) {
  const stateBadge = getStateBadge(plan.state);
  const completionBadge = getCompletionBadge(plan.completionPercentage);

  return (
    <header className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 transition-shadow duration-200 hover:shadow-lg">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold mb-2 break-words">
            Plan {formatDateRange(plan.startDate, plan.endDate)}
          </h1>
          <Badge variant={stateBadge.variant} className={stateBadge.className}>
            {stateBadge.text}
          </Badge>
        </div>
        {plan.state === "active" && (
          <div className="shrink-0">
            <ActionMenu canArchive={plan.completionPercentage >= 90} onArchive={onArchive} onCancel={onCancel} />
          </div>
        )}
      </div>

      {/* Completion Progress */}
      <div className="space-y-2" role="region" aria-label="Postęp realizacji planu">
        <div className="flex justify-between items-center text-sm gap-2">
          <span className={`font-medium ${completionBadge.className} truncate`}>{completionBadge.text}</span>
          <span className="text-muted-foreground shrink-0">
            {plan.completedMeals} / {plan.totalMeals} posiłków
          </span>
        </div>
        <Progress
          value={plan.completionPercentage}
          className="h-2 transition-all duration-300"
          aria-label={`Postęp: ${plan.completionPercentage}%`}
        />
        <div className="text-right text-sm font-semibold text-muted-foreground">{plan.completionPercentage}%</div>
      </div>
    </header>
  );
}
