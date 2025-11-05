import React, { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { usePlanDayQuery } from './hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/planOverview/ErrorState';
import { MealSlot } from './MealSlot';
import { DayNavigator } from './DayNavigator';
import { SwapModal } from './SwapModal';
import { RecipePreviewModal } from './RecipePreviewModal';
import type { MealViewModel } from './types';

import { getSupabaseBrowserClient } from '@/db/supabase.browser.client';

interface PlanDayViewProps {
  planId: number;
  date: string;
  supabaseUrl: string;
  supabaseKey: string;
}

const PlanDayLoadingSkeleton: React.FC = () => (
  <div className="container mx-auto px-4 py-8 space-y-8">
    <Skeleton className="h-10 w-1/2 mx-auto" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  </div>
);

export const PlanDayView: React.FC<PlanDayViewProps> = ({ planId, date, supabaseUrl, supabaseKey }) => {
  // Initialize the browser client on first render.
  getSupabaseBrowserClient(supabaseUrl, supabaseKey);

  const { data, isLoading, isError, error, refetch } = usePlanDayQuery(planId, date);
  const [activeMeal, setActiveMeal] = useState<MealViewModel | null>(null);
  const [isSwapModalOpen, setSwapModalOpen] = useState(false);
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);

  const handleOpenSwapModal = (meal: MealViewModel) => {
    setActiveMeal(meal);
    setSwapModalOpen(true);
  };

  const handleOpenPreviewModal = (meal: MealViewModel) => {
    setActiveMeal(meal);
    setPreviewModalOpen(true);
  };

  const handleCloseModals = () => {
    setActiveMeal(null);
    setSwapModalOpen(false);
    setPreviewModalOpen(false);
  };

  if (isLoading) {
    return <PlanDayLoadingSkeleton />;
  }

  if (isError) {
    return <ErrorState error={{ message: error?.message || 'Wystąpił błąd' }} onRetry={refetch} />;
  }

  // Calculate total calories for the day
  const totalCalories = data?.slots
    ? Object.values(data.slots)
        .filter((slot) => slot.meal)
        .reduce((sum, slot) => sum + (slot.meal?.caloriesPlanned || 0), 0)
    : 0;

  return (
    <>
      <div className="container mx-auto px-4 py-8" data-testid="plan-day-view">
        {data && (
          <header className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="w-16 h-16 rounded-full border border-info flex flex-col items-center justify-center text-info">
                <div className="font-bold text-lg">{totalCalories}</div>
                <div className="text-xs font-medium">kcal</div>
              </div>
              <div className="flex-1 text-center">
                <DayNavigator
                  currentDate={data.date}
                  planStartDate={data.planStartDate}
                  planEndDate={data.planEndDate}
                  planId={data.planId}
                />
              </div>
              <div className="w-20" />
            </div>
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => window.location.href = `/plans/${planId}`}
              >
                ← Wróć do planu
              </Button>
            </div>
          </header>
        )}

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8 md:grid-rows-2 auto-rows-fr min-h-[calc(100vh-300px)]">
          {data?.slots.breakfast && <MealSlot slot={data.slots.breakfast} onSwap={handleOpenSwapModal} onPreview={handleOpenPreviewModal} />}
          {data?.slots.lunch && <MealSlot slot={data.slots.lunch} onSwap={handleOpenSwapModal} onPreview={handleOpenPreviewModal} />}
          {data?.slots.dinner && <MealSlot slot={data.slots.dinner} onSwap={handleOpenSwapModal} onPreview={handleOpenPreviewModal} />}
          {data?.slots.snack && <MealSlot slot={data.slots.snack} onSwap={handleOpenSwapModal} onPreview={handleOpenPreviewModal} />}
        </main>
      </div>

      <SwapModal meal={activeMeal} isOpen={isSwapModalOpen} onClose={handleCloseModals} />
      <RecipePreviewModal meal={activeMeal} isOpen={isPreviewModalOpen} onClose={handleCloseModals} />
    </>
  );
};
