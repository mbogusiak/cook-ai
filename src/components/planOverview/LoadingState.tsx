/**
 * Loading state with skeleton loaders
 */

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div
      className="container mx-auto px-4 py-8 animate-in fade-in duration-500"
      role="status"
      aria-label="Ładowanie planu"
    >
      {/* Header skeleton */}
      <Skeleton className="h-28 sm:h-32 w-full mb-6 rounded-lg" />

      {/* Calendar strip skeleton */}
      <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-hidden">
        <div className="flex gap-2 pb-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20 w-16 sm:w-20 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Day cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-72 sm:h-80 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
