import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Users } from 'lucide-react';
import type { MealViewModel } from './types';

interface RecipePreviewModalProps {
  meal: MealViewModel | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RecipePreviewModal: React.FC<RecipePreviewModalProps> = ({ meal, isOpen, onClose }) => {
  if (!meal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{meal.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image */}
          {meal.imageUrl && (
            <img src={meal.imageUrl} alt={meal.name} className="w-full h-64 object-cover rounded-lg" />
          )}

          {/* Quick info */}
          <div className="flex gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{meal.timeMinutes} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{meal.servings} porcji</span>
            </div>
            <div>
              <strong>{meal.caloriesPlanned} kcal</strong>
            </div>
          </div>

          {/* Ingredients */}
          {meal.ingredients.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Składniki</h3>
              <ul className="space-y-2">
                {meal.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 text-gray-400">•</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preparation steps */}
          {meal.preparation.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Kroki wykonania</h3>
              <ol className="space-y-4">
                {meal.preparation.map((step, index) => (
                  <li key={index} className="flex">
                    <span className="font-semibold text-gray-500 mr-3">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Link to Cookido */}
          <div className="pt-4 border-t">
            <a
              href={meal.cookidoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Zobacz oryginał w Cookido →
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
