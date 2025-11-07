import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";

interface DayNavigatorProps {
  currentDate: string;
  planStartDate: string;
  planEndDate: string;
  planId: number;
}

export const DayNavigator: React.FC<DayNavigatorProps> = ({ currentDate, planStartDate, planEndDate, planId }) => {
  const current = new Date(currentDate);
  const start = new Date(planStartDate);
  const end = new Date(planEndDate);

  const isFirstDay = isSameDay(current, start);
  const isLastDay = isSameDay(current, end);

  const prevDay = subDays(current, 1);
  const nextDay = addDays(current, 1);

  const prevDayString = format(prevDay, "yyyy-MM-dd");
  const nextDayString = format(nextDay, "yyyy-MM-dd");

  const handleNavigate = (date: string) => {
    window.location.href = `/plans/${planId}/days/${date}`;
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleNavigate(prevDayString)}
        disabled={isFirstDay}
        aria-label="Poprzedni dzień"
        data-testid="day-prev"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center">
        <h2 className="text-2xl font-bold">{format(current, "EEEE", { locale: pl })}</h2>
        <p className="text-muted-foreground">{format(current, "d MMMM yyyy", { locale: pl })}</p>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleNavigate(nextDayString)}
        disabled={isLastDay}
        aria-label="Następny dzień"
        data-testid="day-next"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
