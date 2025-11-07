/**
 * Card for a single day with meal miniatures
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealMiniature } from "./MealMiniature";
import { cn } from "@/lib/utils";
import type { DayViewModel, CompletionStatus } from "./types";

interface DayCardProps {
  day: DayViewModel;
  planId: number;
}

/**
 * Returns badge variant and text for completion status
 */
function getCompletionBadge(status: CompletionStatus) {
  const badges = {
    "all-completed": { variant: "default" as const, text: "Ukończony", className: "bg-success" },
    partial: { variant: "secondary" as const, text: "W trakcie", className: "" },
    none: { variant: "outline" as const, text: "Zaplanowany", className: "" },
  };
  return badges[status];
}

export function DayCard({ day, planId }: DayCardProps) {
  const completionBadge = getCompletionBadge(day.completionStatus);

  return (
    <Card
      id={`day-${day.date}`}
      className="overflow-hidden transition-shadow duration-200 hover:shadow-lg scroll-mt-6"
      data-testid={`day-card-${day.date}`}
    >
      <CardHeader>
        <CardTitle className="flex justify-between items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground capitalize">{day.dayOfWeek}</div>
            <div className="text-base sm:text-lg truncate">{day.formattedDate}</div>
          </div>
          <Badge variant={completionBadge.variant} className={cn("shrink-0 text-xs", completionBadge.className)}>
            {completionBadge.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total daily calories */}
        <div className="mb-3 text-center">
          <span className="text-2xl font-bold">{day.totalCalories}</span>
          <span className="text-sm text-muted-foreground ml-1">kcal</span>
        </div>

        {/* Meals grid - 2x2 for 4 meals */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
          {day.meals.map((meal) => (
            <MealMiniature key={meal.id} meal={meal} />
          ))}
        </div>

        {/* View day button */}
        <Button asChild className="w-full transition-transform duration-200 hover:scale-[1.02]">
          <a href={`/plans/${planId}/days/${day.date}`}>Zobacz dzień</a>
        </Button>
      </CardContent>
    </Card>
  );
}
