import React from 'react';
import type { MealSlotViewModel, MealViewModel } from './types';
import { MealCard } from './MealCard';

interface MealSlotProps {
  slot: MealSlotViewModel;
  onSwap: (meal: MealViewModel) => void;
  onPreview: (meal: MealViewModel) => void;
}

export const MealSlot: React.FC<MealSlotProps> = ({ slot, onSwap, onPreview }) => {
  const titleMap = {
    breakfast: 'Śniadanie',
    lunch: 'Obiad',
    dinner: 'Kolacja',
    snack: 'Przekąska',
  };

  return (
    <section className="flex flex-col h-full">
      <div className="mb-2 flex-shrink-0">
        <h3 className="text-xl font-semibold">{titleMap[slot.slot]}</h3>
      </div>
      {slot.meal ? <MealCard meal={slot.meal} onSwap={onSwap} onPreview={onPreview} /> : <div className="text-center py-8 border-2 border-dashed rounded-lg flex-1 flex items-center justify-center">Brak zaplanowanego posiłku</div>}
    </section>
  );
};