// ViewModel dla całego widoku dnia
export interface PlanDayViewModel {
  date: string; // "2025-10-26"
  formattedDate: string; // "26 października 2025"
  dayOfWeek: string; // "Niedziela"
  planId: number;
  planStartDate: string;
  planEndDate: string;
  slots: {
    breakfast: MealSlotViewModel;
    lunch: MealSlotViewModel;
    dinner: MealSlotViewModel;
    snack: MealSlotViewModel;
  };
}

// ViewModel dla pojedynczego slotu
export interface MealSlotViewModel {
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  targetCalories: number;
  meal: MealViewModel | null; // Slot może być pusty
}

// ViewModel dla pojedynczego posiłku
export interface MealViewModel {
  id: number;
  status: "planned" | "completed" | "skipped";
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId: number;
  name: string;
  imageUrl: string | null;
  timeMinutes: number;
  caloriesPlanned: number;
  servings: number;
  cookidoUrl: string;
  ingredients: string[];
  preparation: string[];

  // Pola do logiki posiłków wieloporcjowych
  isMultiPortionCookDay: boolean; // Czy to dzień gotowania na zapas?
  isMultiPortionLeftoverDay: boolean; // Czy to dzień jedzenia resztek?
  multiPortionText: "Ugotuj na 2 dni" | "Resztki z wczoraj" | null;
}
