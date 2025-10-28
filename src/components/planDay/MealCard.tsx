import React, { useState } from 'react';
import type { MealViewModel } from './types';
import { Button } from '@/components/ui/button';
import { useUpdateMealStatus } from './hooks';
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealCardProps {
  meal: MealViewModel;
  onSwap: (meal: MealViewModel) => void;
  onPreview: (meal: MealViewModel) => void;
}

export const MealCard: React.FC<MealCardProps> = ({ meal, onSwap, onPreview }) => {
  const { mutate: updateStatus, isPending } = useUpdateMealStatus();
  const [showIngredients, setShowIngredients] = useState(true);

  const handleStatusChange = (status: 'completed' | 'skipped') => {
    if (meal.status === status) {
      updateStatus({ mealId: meal.id, status: 'planned' });
    } else {
      updateStatus({ mealId: meal.id, status });
    }
  };

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all flex flex-col h-full",
      meal.status === 'completed' && "border-success bg-success/10",
      meal.status === 'skipped' && "border-destructive bg-destructive/10 opacity-60",
      isPending && "opacity-50 cursor-not-allowed"
    )}>
      <div className="relative flex-shrink-0">
        <img src={meal.imageUrl || '/placeholder.svg'} alt={meal.name} className="w-full h-32 object-cover" />
        <div className="absolute top-2 right-2 flex gap-2 bg-white/70 backdrop-blur-sm rounded-full p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange('completed')} disabled={isPending}>
            {meal.status === 'completed' ? <CheckCircle2 className="text-success" /> : <CheckCircle2 />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange('skipped')} disabled={isPending}>
            {meal.status === 'skipped' ? <XCircle className="text-destructive" /> : <XCircle />}
          </Button>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 overflow-hidden">
        <h4 className="font-bold truncate">{meal.name}</h4>
        <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
          <span>{meal.caloriesPlanned} kcal</span>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{meal.timeMinutes} min</span>
          </div>
        </div>
        {meal.multiPortionText && <p className="text-sm text-info mt-2">{meal.multiPortionText}</p>}

        {/* Ingredients section - scrollable */}
        {meal.ingredients.length > 0 && (
          <div className="mt-3 border-t pt-3 flex flex-col flex-1 min-h-0 overflow-hidden">
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 flex-shrink-0"
            >
              <span>Składniki ({meal.ingredients.length})</span>
              {showIngredients ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showIngredients && (
              <ul className="mt-2 space-y-1 text-sm text-gray-600 overflow-y-auto flex-1">
                {meal.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{ingredient}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4 flex-shrink-0">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onPreview(meal)}
            disabled={isPending || meal.status !== 'planned'}
          >
            Ugotuj
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-warning hover:bg-warning/80 text-warning-foreground"
            disabled={isPending || meal.status !== 'planned'}
            onClick={() => onSwap(meal)}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Wymień
          </Button>
        </div>
      </div>
    </div>
  );
};
