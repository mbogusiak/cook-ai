/**
 * ViewModel dla widoku przeglądu planu
 * Zawiera przetworzony plan z obliczonymi metrykami
 */
export interface PlanOverviewViewModel {
  id: number
  state: 'active' | 'completed' | 'cancelled'
  startDate: string // ISO format: "2024-01-15"
  endDate: string // ISO format: "2024-01-21"
  totalDays: number // liczba dni w planie
  completionPercentage: number // 0-100
  totalMeals: number // suma wszystkich posiłków
  completedMeals: number // liczba ukończonych posiłków
  days: DayViewModel[]
}

/**
 * ViewModel dla pojedynczego dnia w planie
 * Zawiera sformatowane daty i status ukończenia
 */
export interface DayViewModel {
  id: number
  date: string // ISO format: "2024-01-15"
  dayOfWeek: string // np. "Poniedziałek"
  formattedDate: string // np. "15 stycznia 2024"
  totalCalories: number // suma kalorii wszystkich posiłków w dniu
  meals: MealMiniatureViewModel[] // zawsze 4 sloty
  completionStatus: 'all-completed' | 'partial' | 'none'
}

/**
 * ViewModel dla miniatury posiłku
 * Uproszczona wersja dla wyświetlania w karcie dnia
 */
export interface MealMiniatureViewModel {
  id: number
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  status: 'planned' | 'completed' | 'skipped'
  recipeName: string
  recipeImage: string | null
  isLeftover: boolean
  portionsToShow: string | null // np. "Ugotuj na 2 dni" lub "Resztki"
}

/**
 * Typy pomocnicze dla statusów
 */
export type PlanState = 'active' | 'completed' | 'cancelled'
export type MealStatus = 'planned' | 'completed' | 'skipped'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type CompletionStatus = 'all-completed' | 'partial' | 'none'

/**
 * Typ błędu API
 */
export interface ApiError {
  status: number
  message: string
}

/**
 * Wynik hooka usePlanOverview
 */
export interface UsePlanOverviewResult {
  plan: PlanOverviewViewModel | null
  isLoading: boolean
  error: ApiError | null
  refetch: () => Promise<void>
}

/**
 * Wynik hooka usePlanActions
 */
export interface UsePlanActionsResult {
  archivePlan: () => Promise<void>
  cancelPlan: () => Promise<void>
  isArchiving: boolean
  isCancelling: boolean
  error: ApiError | null
}
