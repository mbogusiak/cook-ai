/**
 * Badge representing a single day in calendar strip
 */

import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDay } from './dateUtils'

interface DateBadgeProps {
  date: string
  dayOfWeek: string
  isCompleted: boolean
  onClick: () => void
}

export function DateBadge({ date, dayOfWeek, isCompleted, onClick }: DateBadgeProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`Przejdź do dnia ${dayOfWeek} ${formatDay(date)}`}
      className={cn(
        "flex flex-col items-center p-3 rounded-lg border-2",
        "transition-all duration-200 ease-in-out",
        "min-w-[70px] sm:min-w-[80px]",
        "hover:bg-accent hover:border-primary hover:shadow-md hover:scale-105",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "snap-start",
        isCompleted && "border-green-500 bg-green-50 hover:bg-green-100"
      )}
    >
      <span className="text-xs text-muted-foreground capitalize">
        {dayOfWeek.substring(0, 3)}
      </span>
      <span className="text-lg font-semibold">
        {formatDay(date)}
      </span>
      {isCompleted && (
        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
      )}
    </button>
  )
}

