/**
 * List/grid of day cards
 */

import { DayCard } from "./DayCard";
import type { DayViewModel } from "./types";

interface DaysListProps {
  days: DayViewModel[];
  planId: number;
}

export function DaysList({ days, planId }: DaysListProps) {
  return (
    <section aria-label="Lista dni w planie">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {days.map((day, index) => (
          <div
            key={day.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <DayCard day={day} planId={planId} />
          </div>
        ))}
      </div>
    </section>
  );
}
