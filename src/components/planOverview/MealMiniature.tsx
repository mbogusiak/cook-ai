/**
 * Miniature of a single meal in day card
 */

import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MealMiniatureViewModel } from "./types";
import { getPlaceholderImage } from "./utils";
import { cn } from "@/lib/utils";

interface MealMiniatureProps {
  meal: MealMiniatureViewModel;
}

/**
 * Returns badge variant and text for meal slot
 */
function getSlotLabel(slot: MealMiniatureViewModel["slot"]): string {
  const labels = {
    breakfast: "Śniadanie",
    lunch: "Obiad",
    dinner: "Kolacja",
    snack: "Przekąska",
  };
  return labels[slot];
}

export function MealMiniature({ meal }: MealMiniatureProps) {
  const imageSrc = meal.recipeImage || getPlaceholderImage(meal.recipeName);

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden group cursor-default transition-transform duration-200 hover:scale-105"
      role="article"
      aria-label={`${getSlotLabel(meal.slot)}: ${meal.recipeName}`}
    >
      {/* Image */}
      <img
        src={imageSrc}
        alt={meal.recipeName}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = getPlaceholderImage(meal.recipeName);
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-2 transition-transform duration-200 group-hover:translate-y-0">
        <p className="text-white text-xs font-medium line-clamp-2 mb-1 drop-shadow-md">{meal.recipeName}</p>
        <Badge variant="secondary" className="text-xs shadow-sm">
          {getSlotLabel(meal.slot)}
        </Badge>
      </div>

      {/* Calories badge - always in bottom right */}
      <Badge className="absolute bottom-2 right-2 text-xs font-semibold shadow-lg bg-black/70 text-white hover:bg-black/80">
        {meal.caloriesPlanned} kcal
      </Badge>

      {/* Completed icon - top right */}
      {meal.status === "completed" && (
        <div className="absolute top-2 right-2 bg-success rounded-full p-1 shadow-lg animate-in fade-in zoom-in duration-300">
          <CheckCircle className="h-4 w-4 text-success-foreground" />
        </div>
      )}

      {/* Skipped overlay */}
      {meal.status === "skipped" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <span className="text-white text-sm font-medium drop-shadow-md">Pominięty</span>
        </div>
      )}

      {/* Multi-portion badge */}
      {meal.portionsToShow && (
        <Badge
          className={cn(
            "absolute top-2 left-2 text-xs shadow-lg",
            meal.isLeftover ? "bg-warning hover:bg-warning/80" : "bg-info hover:bg-info/80"
          )}
        >
          {meal.portionsToShow}
        </Badge>
      )}
    </div>
  );
}
