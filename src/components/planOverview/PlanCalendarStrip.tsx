/**
 * Horizontal calendar strip with all plan days
 */

import { DateBadge } from "./DateBadge";
import type { DayViewModel } from "./types";

interface PlanCalendarStripProps {
  days: DayViewModel[];
  activeDate?: string;
}

export function PlanCalendarStrip({ days }: PlanCalendarStripProps) {
  /**
   * Handles date click - scrolls to the corresponding day card
   */
  const handleDateClick = (date: string) => {
    const element = document.getElementById(`day-${date}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
      aria-label="Nawigacja po dniach planu"
      data-testid="calendar-strip"
    >
      <div className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4">
        <div className="flex gap-2 py-2 snap-x snap-mandatory min-w-min">
          {days.map((day) => (
            <DateBadge
              key={day.id}
              date={day.date}
              dayOfWeek={day.dayOfWeek}
              isCompleted={day.completionStatus === "all-completed"}
              onClick={() => handleDateClick(day.date)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
