import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MealViewModel } from "./types";
import { useMealAlternativesQuery, useSwapMeal } from "./hooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecipeDTO } from "@/types";

interface SwapModalProps {
  meal: MealViewModel | null;
  isOpen: boolean;
  onClose: () => void;
}

const AlternativesList: React.FC<{
  alternatives: RecipeDTO[];
  selected: number | null;
  onSelect: (id: number) => void;
}> = ({ alternatives, selected, onSelect }) => (
  <div className="space-y-3" data-testid="swap-options">
    {alternatives.map((alt, index) => (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
      <div
        key={alt.id}
        className={`flex gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          selected === alt.id ? "border-info bg-info/10" : "hover:bg-muted/30"
        }`}
        onClick={() => onSelect(alt.id)}
        data-testid={`swap-option-${index + 1}`}
      >
        <img
          src={alt.image_url || "/placeholder.svg"}
          alt={alt.name}
          className="w-20 h-20 object-cover rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold line-clamp-2">{alt.name}</h4>
          <p className="text-sm text-gray-500">{alt.calories_per_serving} kcal</p>
          <p className="text-xs text-gray-400 mt-1">{alt.time_minutes} min</p>
        </div>
      </div>
    ))}
  </div>
);

export const SwapModal: React.FC<SwapModalProps> = ({ meal, isOpen, onClose }) => {
  const { data: alternatives, isLoading, isError } = useMealAlternativesQuery(meal?.id ?? null);
  const { mutate: swapMeal, isPending: isSwapping } = useSwapMeal();
  const [selectedAlternative, setSelectedAlternative] = useState<number | null>(null);

  const handleSwap = () => {
    if (meal && selectedAlternative) {
      swapMeal(
        { mealId: meal.id, alternativeRecipeId: selectedAlternative },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    }
  };

  if (!meal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="swap-modal">
        <DialogHeader>
          <DialogTitle>Wymień posiłek: {meal.name}</DialogTitle>
          <DialogDescription>Wybierz jedną z poniższych alternatyw.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading && <Skeleton className="h-32 w-full" />}
          {isError && (
            <div className="border-l-4 border-destructive p-4 bg-destructive/10 text-destructive">
              Nie udało się załadować alternatyw.
            </div>
          )}
          {alternatives && alternatives.length > 0 && (
            <AlternativesList
              alternatives={alternatives}
              selected={selectedAlternative}
              onSelect={setSelectedAlternative}
            />
          )}
          {alternatives && alternatives.length === 0 && !isLoading && <p>Brak dostępnych alternatyw.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSwapping} data-testid="swap-cancel">
            Anuluj
          </Button>
          <Button onClick={handleSwap} disabled={!selectedAlternative || isSwapping} data-testid="swap-confirm">
            {isSwapping ? "Wymienianie..." : "Wymień"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
