# Plan implementacji widoku Plan Overview

## 1. Przegląd

Widok **Plan Overview** to główny widok przeglądowy planu żywieniowego użytkownika. Jego celem jest dostarczenie użytkownikowi kompleksowego podglądu całego planu, w tym:
- Metadanych planu (zakres dat, status)
- Procentu ukończenia
- Listy wszystkich dni z miniaturami posiłków
- Możliwości zarządzania planem (archiwizacja, anulowanie)
- Nawigacji do szczegółowych widoków poszczególnych dni

Widok służy jako punkt startowy do przeglądania i zarządzania planem, umożliwiając szybką ocenę postępu oraz dostęp do szczegółów konkretnych dni.

## 2. Routing widoku

**Ścieżka**: `/plans/{id}`

**Typ**: Dynamiczna strona Astro z parametrem `id` (identyfikator planu)

**Plik**: `src/pages/plans/[id].astro`

**Przykładowe URL**:
- `/plans/1` - plan o ID 1
- `/plans/42` - plan o ID 42

**Wymagania**:
- Użytkownik musi być zalogowany (sprawdzane przez middleware)
- Użytkownik musi być właścicielem planu (sprawdzane przez RLS w Supabase)

## 3. Struktura komponentów

```
PlanOverviewPage (src/pages/plans/[id].astro)
└── PlanOverviewContent (React, główny kontener)
    ├── LoadingState (podczas ładowania danych)
    ├── ErrorState (w przypadku błędu)
    └── Main Content (po załadowaniu):
        ├── PlanHeader
        │   ├── Plan metadata (daty, status)
        │   ├── Completion progress bar
        │   └── ActionMenu
        │       └── ConfirmDialog (modal)
        ├── PlanCalendarStrip
        │   └── DateBadge[] (dla każdego dnia)
        └── DaysList
            └── DayCard[] (dla każdego dnia)
                ├── Day header (data, dzień tygodnia)
                ├── Meals grid
                │   └── MealMiniature[] (4 sloty)
                └── "Zobacz dzień" button/link
```

## 4. Szczegóły komponentów

### 4.1. PlanOverviewPage (Astro)

**Opis**: Główna strona Astro, która:
- Odbiera parametr `id` z URL
- Sprawdza autoryzację użytkownika
- Renderuje główny komponent React `PlanOverviewContent`
- Obsługuje server-side redirects w przypadku braku autoryzacji

**Główne elementy**:
- Layout wrapper (src/layouts/Layout.astro)
- PlanOverviewContent component z client:load directive

**Obsługiwane zdarzenia**: Brak (server-side)

**Warunki walidacji**:
- Parametr `id` musi być liczbą dodatnią
- Użytkownik musi być zalogowany

**Typy**:
- `Astro.params.id`: string (z URL)

**Propsy**: Brak (strona główna)

---

### 4.2. PlanOverviewContent (React)

**Opis**: Główny komponent React zarządzający stanem i logiką widoku. Odpowiada za:
- Pobieranie danych planu z API
- Transformację danych do ViewModel
- Obsługę akcji użytkownika (archive, cancel)
- Renderowanie odpowiednich stanów (loading, error, success)

**Główne elementy**:
```tsx
<div className="container mx-auto px-4 py-8">
  {isLoading && <LoadingState />}
  {error && <ErrorState error={error} onRetry={refetch} />}
  {plan && (
    <>
      <PlanHeader plan={plan} onArchive={handleArchive} onCancel={handleCancel} />
      <PlanCalendarStrip days={plan.days} />
      <DaysList days={plan.days} planId={plan.id} />
    </>
  )}
  <ConfirmDialog
    isOpen={showConfirmDialog}
    action={confirmAction}
    onConfirm={handleConfirm}
    onCancel={() => setShowConfirmDialog(false)}
  />
</div>
```

**Obsługiwane zdarzenia**:
- `handleArchive()` - inicjuje archiwizację planu
- `handleCancel()` - inicjuje anulowanie planu
- `handleConfirm()` - potwierdza wybraną akcję
- `refetch()` - ponownie pobiera dane planu

**Warunki walidacji**:
- Plan musi istnieć (nie null)
- Plan musi należeć do zalogowanego użytkownika (RLS)

**Typy**:
- State: `plan: PlanOverviewViewModel | null`
- State: `isLoading: boolean`
- State: `error: Error | null`
- State: `showConfirmDialog: boolean`
- State: `confirmAction: 'archive' | 'cancel' | null`

**Propsy**:
```typescript
interface PlanOverviewContentProps {
  planId: number
}
```

---

### 4.3. PlanHeader

**Opis**: Nagłówek planu wyświetlający metadane, status i akcje. Zawiera:
- Zakres dat planu (start_date - end_date)
- Badge ze statusem planu (aktywny/ukończony/anulowany)
- Progress bar z procentem ukończenia
- Menu akcji (archiwizuj/anuluj)

**Główne elementy**:
```tsx
<header className="bg-white rounded-lg shadow p-6 mb-6">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h1 className="text-2xl font-bold">
        Plan {formatDateRange(plan.startDate, plan.endDate)}
      </h1>
      <StateBadge state={plan.state} />
    </div>
    <ActionMenu
      canArchive={plan.completionPercentage >= 90 && plan.state === 'active'}
      onArchive={onArchive}
      onCancel={onCancel}
      isDisabled={plan.state !== 'active'}
    />
  </div>
  <CompletionProgress
    percentage={plan.completionPercentage}
    completed={plan.completedMeals}
    total={plan.totalMeals}
  />
</header>
```

**Obsługiwane zdarzenia**:
- Przekazywane z parent: `onArchive`, `onCancel`

**Warunki walidacji**:
- ActionMenu widoczne tylko gdy `plan.state === 'active'`
- Opcja "Archiwizuj" enabled tylko gdy `completionPercentage >= 90`

**Typy**:
- `plan: PlanOverviewViewModel`

**Propsy**:
```typescript
interface PlanHeaderProps {
  plan: PlanOverviewViewModel
  onArchive: () => void
  onCancel: () => void
}
```

---

### 4.4. ActionMenu

**Opis**: Dropdown menu z akcjami do zarządzania planem. Używa komponentu DropdownMenu z shadcn/ui. Zawiera opcje:
- "Archiwizuj plan" - dla planów z completion >= 90%
- "Anuluj plan" - dla wszystkich aktywnych planów

**Główne elementy**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem
      onClick={onArchive}
      disabled={!canArchive}
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      Archiwizuj plan
      {!canArchive && <span className="text-xs text-muted-foreground">
        (Ukończ 90% posiłków)
      </span>}
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={onCancel}
      className="text-destructive"
    >
      <XCircle className="mr-2 h-4 w-4" />
      Anuluj plan
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Obsługiwane zdarzenia**:
- `onClick` na DropdownMenuItem → wywołuje `onArchive` lub `onCancel`

**Warunki walidacji**:
- MenuItem "Archiwizuj" disabled gdy `!canArchive`
- MenuItem "Anuluj" zawsze enabled (dla aktywnych planów)

**Typy**: Brak własnych, używa typów z shadcn/ui

**Propsy**:
```typescript
interface ActionMenuProps {
  canArchive: boolean
  onArchive: () => void
  onCancel: () => void
  isDisabled?: boolean
}
```

---

### 4.5. ConfirmDialog

**Opis**: Modal z potwierdzeniem destrukcyjnej akcji. Reużywalny komponent dla archiwizacji i anulowania planu. Wyświetla różne treści w zależności od typu akcji.

**Główne elementy**:
```tsx
<Dialog open={isOpen} onOpenChange={onCancel}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{getTitle(action)}</DialogTitle>
      <DialogDescription>{getDescription(action)}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Anuluj
      </Button>
      <Button
        variant={action === 'cancel' ? 'destructive' : 'default'}
        onClick={onConfirm}
        disabled={isLoading}
      >
        {isLoading ? 'Przetwarzanie...' : 'Potwierdź'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Obsługiwane zdarzenia**:
- `onConfirm()` - potwierdza akcję
- `onCancel()` - zamyka dialog bez akcji

**Warunki walidacji**:
- Przycisk "Potwierdź" disabled podczas `isLoading`

**Typy**:
- `action: 'archive' | 'cancel' | null`

**Propsy**:
```typescript
interface ConfirmDialogProps {
  isOpen: boolean
  action: 'archive' | 'cancel' | null
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}
```

---

### 4.6. PlanCalendarStrip

**Opis**: Poziomy pasek z datami wszystkich dni w planie. Umożliwia szybką nawigację do konkretnego dnia. Scroll automatyczny (overflow-x-auto).

**Główne elementy**:
```tsx
<div className="mb-6 overflow-x-auto">
  <div className="flex gap-2 pb-2">
    {days.map((day) => (
      <DateBadge
        key={day.id}
        date={day.date}
        dayOfWeek={day.dayOfWeek}
        isCompleted={day.completionStatus === 'all-completed'}
        onClick={() => handleDateClick(day.date)}
      />
    ))}
  </div>
</div>
```

**Obsługiwane zdarzenia**:
- `handleDateClick(date)` - scroll do odpowiedniej karty dnia lub nawigacja

**Warunki walidacji**: Brak

**Typy**:
- `days: DayViewModel[]`

**Propsy**:
```typescript
interface PlanCalendarStripProps {
  days: DayViewModel[]
  activeDate?: string
}
```

---

### 4.7. DateBadge

**Opis**: Badge reprezentujący pojedynczy dzień w PlanCalendarStrip. Pokazuje datę, dzień tygodnia i status ukończenia.

**Główne elementy**:
```tsx
<button
  onClick={onClick}
  className={cn(
    "flex flex-col items-center p-3 rounded-lg border-2 transition-colors min-w-[80px]",
    isCompleted && "border-green-500 bg-green-50",
    "hover:bg-accent"
  )}
>
  <span className="text-xs text-muted-foreground">{dayOfWeek}</span>
  <span className="text-lg font-semibold">{formatDay(date)}</span>
  {isCompleted && <CheckCircle className="h-4 w-4 text-green-500 mt-1" />}
</button>
```

**Obsługiwane zdarzenia**:
- `onClick()` - przekazane z parent

**Warunki walidacji**: Brak

**Typy**: Brak własnych

**Propsy**:
```typescript
interface DateBadgeProps {
  date: string
  dayOfWeek: string
  isCompleted: boolean
  onClick: () => void
}
```

---

### 4.8. DaysList

**Opis**: Lista (grid) kart dni. Responsive layout: 1 kolumna (mobile), 2 kolumny (tablet), 3 kolumny (desktop).

**Główne elementy**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {days.map((day) => (
    <DayCard
      key={day.id}
      day={day}
      planId={planId}
    />
  ))}
</div>
```

**Obsługiwane zdarzenia**: Brak (przekazywane do DayCard)

**Warunki walidacji**: Brak

**Typy**:
- `days: DayViewModel[]`
- `planId: number`

**Propsy**:
```typescript
interface DaysListProps {
  days: DayViewModel[]
  planId: number
}
```

---

### 4.9. DayCard

**Opis**: Karta pojedynczego dnia z miniaturami 4 posiłków. Zawiera nagłówek z datą, sumę kalorii całego dnia, grid z posiłkami i przycisk nawigacji do szczegółowego widoku dnia.

**Główne elementy**:
```tsx
<Card id={`day-${day.date}`} className="overflow-hidden">
  <CardHeader>
    <CardTitle className="flex justify-between items-center">
      <div>
        <div className="text-sm text-muted-foreground">{day.dayOfWeek}</div>
        <div>{day.formattedDate}</div>
      </div>
      <CompletionBadge status={day.completionStatus} />
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="mb-3 text-center">
      <span className="text-2xl font-bold">{day.totalCalories}</span>
      <span className="text-sm text-muted-foreground ml-1">kcal</span>
    </div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      {day.meals.map((meal) => (
        <MealMiniature key={meal.id} meal={meal} />
      ))}
    </div>
    <Button asChild className="w-full">
      <a href={`/plans/${planId}/days/${day.date}`}>
        Zobacz dzień
      </a>
    </Button>
  </CardContent>
</Card>
```

**Obsługiwane zdarzenia**:
- Click na Button → nawigacja (href)

**Warunki walidacji**: Brak (wszystkie dni zawsze dostępne)

**Typy**:
- `day: DayViewModel`

**Propsy**:
```typescript
interface DayCardProps {
  day: DayViewModel
  planId: number
}
```

---

### 4.10. MealMiniature

**Opis**: Miniatura pojedynczego posiłku w DayCard. Pokazuje zdjęcie (lub placeholder), nazwę przepisu, status i badge wieloporcjowości.

**Główne elementy**:
```tsx
<div className="relative aspect-square rounded-lg overflow-hidden group">
  <img
    src={meal.recipeImage || getPlaceholder(meal.recipeName)}
    alt={meal.recipeName}
    className="w-full h-full object-cover"
    onError={(e) => {
      e.currentTarget.src = getPlaceholder(meal.recipeName)
    }}
  />
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
  <div className="absolute bottom-0 left-0 right-0 p-2">
    <p className="text-white text-xs font-medium line-clamp-2">
      {meal.recipeName}
    </p>
    <SlotBadge slot={meal.slot} className="mt-1" />
  </div>
  {meal.status === 'completed' && (
    <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-green-500" />
  )}
  {meal.portionsToShow && (
    <Badge className="absolute top-2 left-2 text-xs">
      {meal.portionsToShow}
    </Badge>
  )}
</div>
```

**Obsługiwane zdarzenia**:
- `onError` na img → fallback do placeholder

**Warunki walidacji**: Brak

**Typy**:
- `meal: MealMiniatureViewModel`

**Propsy**:
```typescript
interface MealMiniatureProps {
  meal: MealMiniatureViewModel
}
```

---

### 4.11. LoadingState

**Opis**: Stan ładowania wyświetlany podczas pobierania danych. Używa szkieletów (skeletons) dla lepszego UX.

**Główne elementy**:
```tsx
<div className="container mx-auto px-4 py-8">
  <Skeleton className="h-32 mb-6" /> {/* Header */}
  <Skeleton className="h-20 mb-6" /> {/* Calendar strip */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <Skeleton key={i} className="h-64" /> {/* Day cards */}
    ))}
  </div>
</div>
```

**Obsługiwane zdarzenia**: Brak

**Warunki walidacji**: Brak

**Typy**: Brak

**Propsy**: Brak (lub opcjonalnie `count: number` dla liczby szkieletów)

---

### 4.12. ErrorState

**Opis**: Stan błędu wyświetlany gdy nie udało się załadować planu. Pokazuje komunikat błędu i przycisk retry.

**Główne elementy**:
```tsx
<div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[400px]">
  <AlertCircle className="h-16 w-16 text-destructive mb-4" />
  <h2 className="text-2xl font-bold mb-2">{getErrorTitle(error)}</h2>
  <p className="text-muted-foreground mb-6">{getErrorMessage(error)}</p>
  <div className="flex gap-4">
    {onRetry && (
      <Button onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Spróbuj ponownie
      </Button>
    )}
    <Button variant="outline" asChild>
      <a href="/dashboard">Wróć do listy planów</a>
    </Button>
  </div>
</div>
```

**Obsługiwane zdarzenia**:
- `onRetry()` - ponowne pobranie danych

**Warunki walidacji**: Brak

**Typy**:
- `error: Error | { status: number, message: string }`

**Propsy**:
```typescript
interface ErrorStateProps {
  error: Error | ApiError
  onRetry?: () => void
}
```

---

## 5. Typy

### 5.1. Istniejące typy z API (src/types.ts)

```typescript
// Response z API GET /api/plans/{id}
export type PlanDetailsResponse = PlanDTO & {
  days: PlanDayResponse[]
}

export type PlanDTO = Pick<
  Tables<'plans'>,
  'id' | 'user_id' | 'state' | 'start_date' | 'end_date' | 'created_at' | 'updated_at'
>

export type PlanDayResponse = {
  id: number
  plan_id: number
  date: string
  meals: MealResponse[]
  slot_targets: SlotTargetResponse[]
}

export type MealResponse = {
  id: number
  slot: Enums<'meal_slot'>
  status: Enums<'meal_status'>
  calories_planned: number
  portion_multiplier: number
  portions_to_cook: number | null
  multi_portion_group_id: string | null
  is_leftover: boolean
  recipe: RecipeInMealResponse
}

export type RecipeInMealResponse = Pick<
  RecipeDTO,
  'id' | 'name' | 'image_url' | 'time_minutes' | 'source_url' | 'available_slots'
>

// Command dla PATCH /api/plans/{id}
export type UpdatePlanCommand = {
  state: Enums<'plan_state'> // 'active' | 'completed' | 'cancelled'
}
```

### 5.2. Nowe typy ViewModel (do utworzenia w src/components/planOverview/types.ts)

```typescript
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
```

### 5.3. Typy dla hooków

```typescript
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
```

## 6. Zarządzanie stanem

### 6.1. Lokalne zarządzanie stanem w PlanOverviewContent

Stan komponentu PlanOverviewContent:

```typescript
const [plan, setPlan] = useState<PlanOverviewViewModel | null>(null)
const [isLoading, setIsLoading] = useState<boolean>(true)
const [error, setError] = useState<ApiError | null>(null)
const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)
const [confirmAction, setConfirmAction] = useState<'archive' | 'cancel' | null>(null)
```

### 6.2. Custom Hooki

#### usePlanOverview

**Lokalizacja**: `src/components/planOverview/usePlanOverview.ts`

**Cel**: Pobieranie i transformacja danych planu z API

**Implementacja**:
```typescript
export function usePlanOverview(planId: number): UsePlanOverviewResult {
  const [plan, setPlan] = useState<PlanOverviewViewModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchPlan = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/plans/${planId}`)
      
      if (!response.ok) {
        throw {
          status: response.status,
          message: await response.text()
        }
      }
      
      const data: { data: PlanDetailsResponse } = await response.json()
      const viewModel = transformToPlanOverview(data.data)
      setPlan(viewModel)
    } catch (err) {
      setError(err as ApiError)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlan()
  }, [planId])

  return { plan, isLoading, error, refetch: fetchPlan }
}
```

#### usePlanActions

**Lokalizacja**: `src/components/planOverview/usePlanActions.ts`

**Cel**: Obsługa akcji archiwizacji i anulowania planu

**Implementacja**:
```typescript
export function usePlanActions(planId: number, onSuccess: () => void): UsePlanActionsResult {
  const [isArchiving, setIsArchiving] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const archivePlan = async () => {
    setIsArchiving(true)
    setError(null)
    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'completed' })
      })
      
      if (!response.ok) throw new Error('Failed to archive plan')
      
      onSuccess()
    } catch (err) {
      setError({ status: 500, message: err.message })
    } finally {
      setIsArchiving(false)
    }
  }

  const cancelPlan = async () => {
    setIsCancelling(true)
    setError(null)
    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'cancelled' })
      })
      
      if (!response.ok) throw new Error('Failed to cancel plan')
      
      onSuccess()
    } catch (err) {
      setError({ status: 500, message: err.message })
    } finally {
      setIsCancelling(false)
    }
  }

  return { archivePlan, cancelPlan, isArchiving, isCancelling, error }
}
```

### 6.3. Funkcje transformujące

**Lokalizacja**: `src/components/planOverview/transforms.ts`

**Funkcje**:

```typescript
/**
 * Transformuje PlanDetailsResponse z API do PlanOverviewViewModel
 */
export function transformToPlanOverview(data: PlanDetailsResponse): PlanOverviewViewModel {
  const allMeals = data.days.flatMap(day => day.meals)
  const completedMeals = allMeals.filter(m => m.status === 'completed')
  
  return {
    id: data.id,
    state: data.state,
    startDate: data.start_date,
    endDate: data.end_date,
    totalDays: data.days.length,
    completionPercentage: allMeals.length > 0 
      ? Math.round((completedMeals.length / allMeals.length) * 100)
      : 0,
    totalMeals: allMeals.length,
    completedMeals: completedMeals.length,
    days: data.days.map(transformToDay)
  }
}

/**
 * Transformuje PlanDayResponse do DayViewModel
 */
export function transformToDay(day: PlanDayResponse): DayViewModel {
  const completedCount = day.meals.filter(m => m.status === 'completed').length
  const totalCount = day.meals.length
  
  let completionStatus: CompletionStatus
  if (completedCount === 0) {
    completionStatus = 'none'
  } else if (completedCount === totalCount) {
    completionStatus = 'all-completed'
  } else {
    completionStatus = 'partial'
  }
  
  // Calculate total calories for the day
  const totalCalories = day.meals.reduce((sum, meal) => sum + meal.calories_planned, 0)
  
  return {
    id: day.id,
    date: day.date,
    dayOfWeek: getDayOfWeek(day.date),
    formattedDate: formatDate(day.date),
    totalCalories: Math.round(totalCalories),
    meals: day.meals.map(transformToMealMiniature),
    completionStatus
  }
}

/**
 * Transformuje MealResponse do MealMiniatureViewModel
 */
export function transformToMealMiniature(meal: MealResponse): MealMiniatureViewModel {
  let portionsToShow: string | null = null
  
  if (meal.portions_to_cook !== null && meal.portions_to_cook > 1) {
    portionsToShow = `Ugotuj na ${meal.portions_to_cook} dni`
  } else if (meal.is_leftover) {
    portionsToShow = 'Resztki'
  }
  
  return {
    id: meal.id,
    slot: meal.slot,
    status: meal.status,
    recipeName: meal.recipe.name,
    recipeImage: meal.recipe.image_url,
    isLeftover: meal.is_leftover,
    portionsToShow
  }
}
```

### 6.4. Funkcje pomocnicze dla dat

**Lokalizacja**: `src/components/planOverview/dateUtils.ts`

```typescript
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

/**
 * Zwraca nazwę dnia tygodnia po polsku
 */
export function getDayOfWeek(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'EEEE', { locale: pl })
}

/**
 * Formatuje datę do postaci "15 stycznia 2024"
 */
export function formatDate(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'd MMMM yyyy', { locale: pl })
}

/**
 * Formatuje dzień (liczba) dla badge
 */
export function formatDay(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'd')
}

/**
 * Formatuje zakres dat "15 sty - 21 sty 2024"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  return `${format(start, 'd MMM', { locale: pl })} - ${format(end, 'd MMM yyyy', { locale: pl })}`
}
```

## 7. Integracja API

### 7.1. GET /api/plans/{id}

**Cel**: Pobranie szczegółów planu wraz ze wszystkimi dniami i posiłkami

**Request**:
- Method: `GET`
- URL: `/api/plans/{id}`
- Headers: Cookie z sesją (automatyczne)
- Params: `id` (number) - identyfikator planu

**Response (Success - 200)**:
```typescript
{
  data: PlanDetailsResponse
}
```

**Response (Error)**:
- `401 Unauthorized`: Brak sesji - redirect do /login
- `403 Forbidden`: Brak dostępu - wyświetl ErrorState
- `404 Not Found`: Plan nie istnieje - wyświetl ErrorState
- `500 Internal Server Error`: Błąd serwera - wyświetl ErrorState z retry

**Użycie**: Hook `usePlanOverview`

**Timing**: 
- OnMount komponentu PlanOverviewContent
- Po wykonaniu akcji archive/cancel (refetch)

---

### 7.2. PATCH /api/plans/{id}

**Cel**: Aktualizacja statusu planu (archiwizacja lub anulowanie)

**Request**:
- Method: `PATCH`
- URL: `/api/plans/{id}`
- Headers: 
  - `Content-Type: application/json`
  - Cookie z sesją (automatyczne)
- Body:
```typescript
{
  state: 'completed' | 'cancelled'
}
```

**Response (Success - 200)**:
```typescript
{
  data: PlanDTO
}
```

**Response (Error)**:
- `400 Bad Request`: Nieprawidłowy stan
- `401 Unauthorized`: Brak sesji
- `403 Forbidden`: Brak dostępu
- `404 Not Found`: Plan nie istnieje
- `409 Conflict`: Plan już w tym stanie
- `500 Internal Server Error`: Błąd serwera

**Użycie**: Hook `usePlanActions`

**Timing**: 
- Po potwierdzeniu akcji w ConfirmDialog
- Następnie automatyczny refetch GET /api/plans/{id}

---

### 7.3. Przykład integracji w komponencie

```typescript
export function PlanOverviewContent({ planId }: PlanOverviewContentProps) {
  const { plan, isLoading, error, refetch } = usePlanOverview(planId)
  const { archivePlan, cancelPlan, isArchiving, isCancelling } = usePlanActions(
    planId,
    () => {
      refetch() // Po sukcesie, odśwież dane
      setShowConfirmDialog(false)
    }
  )
  
  // ... reszta implementacji
}
```

## 8. Interakcje użytkownika

### 8.1. Przeglądanie listy dni

**Akcja**: Użytkownik scrolluje listę dni w DaysList

**Obsługa**: 
- Automatyczne renderowanie wszystkich dni
- Brak specjalnej logiki
- Smooth scroll dla lepszego UX

**Implementacja**: Standardowy overflow z Tailwind

---

### 8.2. Kliknięcie "Zobacz dzień"

**Akcja**: Użytkownik klika przycisk/link "Zobacz dzień" na karcie DayCard

**Obsługa**: 
- Nawigacja do `/plans/{planId}/days/{date}`
- Używamy `<a>` tag dla SSR compatibility
- Alternatywnie: client-side routing z Astro

**Implementacja**:
```tsx
<Button asChild>
  <a href={`/plans/${planId}/days/${day.date}`}>
    Zobacz dzień
  </a>
</Button>
```

**Oczekiwany wynik**: 
- Przejście do szczegółowego widoku dnia
- Użytkownik widzi wszystkie posiłki tego dnia z opcjami interakcji

---

### 8.3. Kliknięcie daty w PlanCalendarStrip

**Akcja**: Użytkownik klika DateBadge w pasku kalendarza

**Obsługa**: 
- Opcja 1: Smooth scroll do odpowiedniej karty DayCard w liście
- Opcja 2: Nawigacja bezpośrednio do `/plans/{planId}/days/{date}`

**Implementacja (scroll)**:
```typescript
const handleDateClick = (date: string) => {
  const element = document.getElementById(`day-${date}`)
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
```

**Oczekiwany wynik**: 
- Lista dni przewija się do wybranego dnia
- Wybrany dzień jest widoczny na ekranie

---

### 8.4. Otwarcie ActionMenu

**Akcja**: Użytkownik klika ikonę menu (3 kropki) w PlanHeader

**Obsługa**: 
- Toggle dropdown menu z shadcn/ui
- Pokazanie dostępnych akcji

**Implementacja**: DropdownMenu component z shadcn/ui

**Oczekiwany wynik**: 
- Dropdown otwiera się z opcjami:
  - "Archiwizuj plan" (disabled jeśli completion < 90%)
  - "Anuluj plan"

---

### 8.5. Kliknięcie "Archiwizuj plan"

**Akcja**: Użytkownik wybiera "Archiwizuj plan" z ActionMenu

**Obsługa**: 
1. Sprawdzenie warunku: `completionPercentage >= 90`
2. Jeśli warunek spełniony: pokazanie ConfirmDialog
3. Jeśli nie: pokazanie toast z komunikatem "Ukończ co najmniej 90% posiłków"

**Implementacja**:
```typescript
const handleArchive = () => {
  if (plan.completionPercentage < 90) {
    toast.error('Ukończ co najmniej 90% posiłków aby zarchiwizować plan')
    return
  }
  setConfirmAction('archive')
  setShowConfirmDialog(true)
}
```

**ConfirmDialog**:
- Tytuł: "Archiwizować plan?"
- Opis: "Plan zostanie oznaczony jako ukończony. Nie będziesz mógł już edytować posiłków."
- Przyciski: "Anuluj", "Archiwizuj"

**Po potwierdzeniu**:
1. Wywołanie `archivePlan()` z hooka
2. Loading state w dialog
3. Po sukcesie: refetch danych, zamknięcie dialogu, toast success
4. Po błędzie: wyświetlenie błędu, możliwość retry

**Oczekiwany wynik**: 
- Plan zmienia status na 'completed'
- Badge w headerze pokazuje "Ukończony"
- ActionMenu się ukrywa lub pokazuje tylko "Zobacz szczegóły"

---

### 8.6. Kliknięcie "Anuluj plan"

**Akcja**: Użytkownik wybiera "Anuluj plan" z ActionMenu

**Obsługa**: 
1. Pokazanie ConfirmDialog (bez sprawdzania warunków)

**Implementacja**:
```typescript
const handleCancel = () => {
  setConfirmAction('cancel')
  setShowConfirmDialog(true)
}
```

**ConfirmDialog**:
- Tytuł: "Anulować plan?"
- Opis: "Plan zostanie anulowany. Wszystkie dane zostaną zachowane, ale nie będziesz mógł już edytować posiłków."
- Przyciski: "Cofnij", "Anuluj plan" (destructive variant)

**Po potwierdzeniu**:
1. Wywołanie `cancelPlan()` z hooka
2. Loading state w dialog
3. Po sukcesie: refetch danych, zamknięcie dialogu, toast success
4. Po błędzie: wyświetlenie błędu, możliwość retry

**Oczekiwany wynik**: 
- Plan zmienia status na 'cancelled'
- Badge w headerze pokazuje "Anulowany"
- ActionMenu się ukrywa

---

### 8.7. Retry po błędzie ładowania

**Akcja**: Użytkownik klika "Spróbuj ponownie" w ErrorState

**Obsługa**: 
- Wywołanie funkcji `refetch()` z hooka
- Powrót do loading state
- Ponowne pobranie danych

**Implementacja**:
```tsx
<Button onClick={refetch}>
  <RefreshCw className="mr-2 h-4 w-4" />
  Spróbuj ponownie
</Button>
```

**Oczekiwany wynik**: 
- Loading state
- Po sukcesie: wyświetlenie planu
- Po błędzie: ponownie ErrorState

---

## 9. Warunki i walidacja

### 9.1. Dostęp do planu

**Komponent**: PlanOverviewPage (Astro)

**Warunki**:
- Użytkownik musi być zalogowany
- Plan musi istnieć
- Plan musi należeć do użytkownika (sprawdzane przez RLS)

**Walidacja**:
```typescript
// W stronie Astro
const user = await Astro.locals.supabase.auth.getUser()
if (!user.data.user) {
  return Astro.redirect('/login')
}

// RLS automatycznie filtruje w API
```

**Komunikaty błędów**:
- 401: Redirect do /login (bez komunikatu)
- 403: "Nie masz dostępu do tego planu"
- 404: "Plan nie został znaleziony"

---

### 9.2. Wyświetlanie ActionMenu

**Komponent**: PlanHeader

**Warunek**: `plan.state === 'active'`

**Walidacja**:
```typescript
{plan.state === 'active' && (
  <ActionMenu
    canArchive={plan.completionPercentage >= 90}
    onArchive={onArchive}
    onCancel={onCancel}
  />
)}
```

**Wpływ na UI**:
- Jeśli plan nie jest aktywny: ActionMenu się nie renderuje
- Dla completed/cancelled: opcjonalnie pokazać badge zamiast menu

---

### 9.3. Włączenie opcji "Archiwizuj"

**Komponent**: ActionMenu

**Warunki**:
- `plan.state === 'active'` AND
- `plan.completionPercentage >= 90`

**Walidacja**:
```typescript
<DropdownMenuItem
  onClick={onArchive}
  disabled={!canArchive}
>
  Archiwizuj plan
  {!canArchive && (
    <span className="text-xs text-muted-foreground block mt-1">
      Ukończ co najmniej 90% posiłków
    </span>
  )}
</DropdownMenuItem>
```

**Wpływ na UI**:
- Jeśli `canArchive === false`: opcja disabled + tooltip
- Kliknięcie disabled opcji: brak akcji lub toast z wyjaśnieniem

---

### 9.4. Włączenie opcji "Anuluj"

**Komponent**: ActionMenu

**Warunek**: `plan.state === 'active'`

**Walidacja**: Opcja zawsze enabled dla aktywnych planów

**Wpływ na UI**: Brak (zawsze clickable dla aktywnych planów)

---

### 9.5. Wyświetlanie badge completion

**Komponent**: PlanHeader (CompletionProgress)

**Warunki**:
- `completionPercentage >= 90`: badge zielony "Gotowy do archiwizacji"
- `completionPercentage 50-89`: badge żółty "W trakcie"
- `completionPercentage < 50`: badge szary "Rozpoczęty"

**Walidacja**:
```typescript
function getCompletionBadge(percentage: number) {
  if (percentage >= 90) {
    return { variant: 'success', text: 'Gotowy do archiwizacji' }
  } else if (percentage >= 50) {
    return { variant: 'warning', text: 'W trakcie' }
  } else {
    return { variant: 'secondary', text: 'Rozpoczęty' }
  }
}
```

**Wpływ na UI**: Kolorystyka i tekst badge

---

### 9.6. Wyświetlanie badge state

**Komponent**: PlanHeader (StateBadge)

**Warunki**:
- `state === 'active'`: badge niebieski "Aktywny"
- `state === 'completed'`: badge zielony "Ukończony"
- `state === 'cancelled'`: badge czerwony "Anulowany"

**Walidacja**:
```typescript
function getStateBadge(state: PlanState) {
  const variants = {
    active: { variant: 'default', text: 'Aktywny' },
    completed: { variant: 'success', text: 'Ukończony' },
    cancelled: { variant: 'destructive', text: 'Anulowany' }
  }
  return variants[state]
}
```

**Wpływ na UI**: Kolorystyka i tekst badge

---

### 9.7. Walidacja przed archiwizacją

**Komponent**: PlanOverviewContent (handleArchive)

**Warunki**:
- `plan.state === 'active'`
- `plan.completionPercentage >= 90`

**Walidacja**:
```typescript
const handleArchive = () => {
  if (plan.state !== 'active') {
    toast.error('Nie można archiwizować nieaktywnego planu')
    return
  }
  if (plan.completionPercentage < 90) {
    toast.error('Ukończ co najmniej 90% posiłków aby zarchiwizować plan')
    return
  }
  // Kontynuuj z ConfirmDialog
}
```

**Wpływ na UI**: Toast z komunikatem błędu, dialog się nie otwiera

---

### 9.8. Walidacja obrazków

**Komponent**: MealMiniature

**Warunki**: `meal.recipeImage` może być `null`

**Walidacja**:
```typescript
const imageSrc = meal.recipeImage || getPlaceholderImage(meal.recipeName)

// Fallback w przypadku błędu ładowania
<img
  src={imageSrc}
  onError={(e) => {
    e.currentTarget.src = getPlaceholderImage(meal.recipeName)
  }}
/>
```

**Wpływ na UI**: Placeholder zamiast broken image

---

## 10. Obsługa błędów

### 10.1. Plan nie istnieje (404)

**Scenariusz**: Użytkownik wpisuje URL do nieistniejącego planu

**Obsługa**:
```typescript
if (error?.status === 404) {
  return (
    <ErrorState
      error={error}
      title="Plan nie znaleziony"
      message="Plan o podanym ID nie istnieje lub został usunięty."
      actionLabel="Wróć do listy planów"
      actionHref="/dashboard"
    />
  )
}
```

**UI**: ErrorState z komunikatem i przyciskiem powrotu

---

### 10.2. Brak autoryzacji (401)

**Scenariusz**: Sesja użytkownika wygasła

**Obsługa**:
```typescript
// W middleware Astro lub w API call
if (response.status === 401) {
  window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
}
```

**UI**: Automatyczny redirect do /login

---

### 10.3. Brak dostępu (403)

**Scenariusz**: Użytkownik próbuje dostać się do planu innego użytkownika

**Obsługa**:
```typescript
if (error?.status === 403) {
  return (
    <ErrorState
      error={error}
      title="Brak dostępu"
      message="Nie masz uprawnień do wyświetlenia tego planu."
      actionLabel="Wróć do listy planów"
      actionHref="/dashboard"
    />
  )
}
```

**UI**: ErrorState z komunikatem o braku dostępu

---

### 10.4. Błąd serwera (500)

**Scenariusz**: Błąd po stronie serwera lub bazy danych

**Obsługa**:
```typescript
if (error?.status === 500) {
  return (
    <ErrorState
      error={error}
      title="Wystąpił błąd"
      message="Nie udało się załadować planu. Spróbuj ponownie za chwilę."
      actionLabel="Spróbuj ponownie"
      onAction={refetch}
      secondaryActionLabel="Wróć do listy planów"
      secondaryActionHref="/dashboard"
    />
  )
}
```

**UI**: ErrorState z opcją retry i powrotu

---

### 10.5. Błąd podczas archiwizacji/anulowania

**Scenariusz**: Błąd API podczas PATCH /api/plans/{id}

**Obsługa**:
```typescript
const handleConfirm = async () => {
  try {
    if (confirmAction === 'archive') {
      await archivePlan()
    } else {
      await cancelPlan()
    }
    toast.success('Plan został zaktualizowany')
    setShowConfirmDialog(false)
    refetch()
  } catch (error) {
    toast.error('Nie udało się zaktualizować planu. Spróbuj ponownie.')
    // Dialog pozostaje otwarty, użytkownik może spróbować ponownie
  }
}
```

**UI**: Toast z błędem, dialog pozostaje otwarty

---

### 10.6. Brak danych w planie

**Scenariusz**: Plan istnieje, ale nie ma żadnych dni (edge case)

**Obsługa**:
```typescript
if (plan && plan.days.length === 0) {
  return (
    <ErrorState
      title="Pusty plan"
      message="Ten plan nie zawiera żadnych dni."
      actionLabel="Wróć do listy planów"
      actionHref="/dashboard"
    />
  )
}
```

**UI**: ErrorState z komunikatem

---

### 10.7. Timeout API

**Scenariusz**: Request trwa > 30 sekund

**Obsługa**:
```typescript
const fetchWithTimeout = async (url: string, timeout = 30000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(id)
    return response
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}
```

**UI**: ErrorState z komunikatem o timeout i opcją retry

---

### 10.8. Błąd ładowania obrazka

**Scenariusz**: URL obrazka jest nieprawidłowy lub obrazek nie istnieje

**Obsługa**:
```typescript
function getPlaceholderImage(recipeName: string): string {
  // Generuj placeholder na podstawie pierwszej litery i koloru
  const firstLetter = recipeName[0].toUpperCase()
  const color = getColorFromString(recipeName)
  return `https://ui-avatars.com/api/?name=${firstLetter}&background=${color}&color=fff&size=200`
}

<img
  src={meal.recipeImage || getPlaceholderImage(meal.recipeName)}
  onError={(e) => {
    e.currentTarget.src = getPlaceholderImage(meal.recipeName)
  }}
/>
```

**UI**: Kolorowy placeholder z pierwszą literą nazwy przepisu

---

### 10.9. Plan z przyszłą datą startu

**Scenariusz**: Użytkownik tworzy plan startujący w przyszłości

**Obsługa**: 
- Plan jest normalnie wyświetlany
- Badge może pokazywać "Zaplanowany" zamiast "Aktywny"
- Wszystkie funkcje działają normalnie

**Walidacja**:
```typescript
function getPlanStateBadge(plan: PlanOverviewViewModel) {
  if (plan.state === 'active' && new Date(plan.startDate) > new Date()) {
    return { variant: 'secondary', text: 'Zaplanowany' }
  }
  // ... reszta logiki
}
```

**UI**: Badge "Zaplanowany"

---

### 10.10. Błąd walidacji completion < 90% przy archiwizacji

**Scenariusz**: Backend zwraca błąd 400 przy próbie archiwizacji planu z completion < 90%

**Obsługa**:
```typescript
try {
  await archivePlan()
} catch (error) {
  if (error.status === 400) {
    toast.error('Nie można zarchiwizować planu. Ukończ co najmniej 90% posiłków.')
  } else {
    toast.error('Wystąpił błąd. Spróbuj ponownie.')
  }
}
```

**UI**: Toast z komunikatem błędu

---

## 11. Kroki implementacji

### Faza 1: Setup projektu i struktura plików (30 min)

1. **Utworzenie struktury folderów**
   ```
   src/components/planOverview/
   ├── PlanOverviewContent.tsx
   ├── PlanHeader.tsx
   ├── ActionMenu.tsx
   ├── ConfirmDialog.tsx
   ├── PlanCalendarStrip.tsx
   ├── DateBadge.tsx
   ├── DaysList.tsx
   ├── DayCard.tsx
   ├── MealMiniature.tsx
   ├── LoadingState.tsx
   ├── ErrorState.tsx
   ├── types.ts
   ├── usePlanOverview.ts
   ├── usePlanActions.ts
   ├── transforms.ts
   ├── dateUtils.ts
   └── utils.ts
   ```

2. **Utworzenie strony Astro**
   - Plik: `src/pages/plans/[id].astro`
   - Podstawowa struktura z Layout
   - Przekazanie planId do komponentu React

3. **Dodanie typów ViewModel**
   - Plik: `src/components/planOverview/types.ts`
   - Zdefiniowanie wszystkich interfejsów z sekcji 5.2

---

### Faza 2: Utilities i funkcje pomocnicze (1h)

4. **Implementacja dateUtils.ts**
   - Instalacja `date-fns`: `npm install date-fns`
   - Funkcje: `getDayOfWeek`, `formatDate`, `formatDay`, `formatDateRange`
   - Import locale 'pl-PL'

5. **Implementacja transforms.ts**
   - Funkcje transformacji: `transformToPlanOverview`, `transformToDay`, `transformToMealMiniature`
   - Logika obliczania completion percentage
   - Logika określania portionsToShow

6. **Implementacja utils.ts**
   - Funkcja `getPlaceholderImage(recipeName)`
   - Funkcja `getColorFromString(str)` dla placeholder colors
   - Funkcje pomocnicze dla badges

---

### Faza 3: Custom hooki (1h)

7. **Implementacja usePlanOverview.ts**
   - Hook do pobierania danych z API
   - Obsługa stanów: loading, error, success
   - Transformacja danych do ViewModel
   - Funkcja refetch

8. **Implementacja usePlanActions.ts**
   - Hook do akcji archive/cancel
   - Obsługa loading states
   - Error handling
   - Callback onSuccess

---

### Faza 4: Komponenty podstawowe (2h)

9. **LoadingState.tsx**
   - Skeleton loader dla całego widoku
   - Użycie Skeleton z shadcn/ui
   - Responsive layout

10. **ErrorState.tsx**
    - Wyświetlanie różnych typów błędów
    - Przycisk retry
    - Przycisk powrotu do dashboard

11. **MealMiniature.tsx**
    - Wyświetlanie obrazka przepisu
    - Fallback do placeholder
    - Status badge (completed/skipped)
    - Multi-portion badge
    - Slot badge
    - Tooltip z pełną nazwą

12. **DateBadge.tsx**
    - Badge z datą i dniem tygodnia
    - Indicator ukończenia (zielony border)
    - Hover effects

---

### Faza 5: Komponenty złożone (2.5h)

13. **ConfirmDialog.tsx**
    - Modal z potwierdzeniem
    - Różne treści dla archive/cancel
    - Loading state podczas akcji
    - Użycie Dialog z shadcn/ui

14. **ActionMenu.tsx**
    - Dropdown z shadcn/ui
    - Opcje: Archiwizuj, Anuluj
    - Disabled state dla archiwizacji
    - Tooltip z wyjaśnieniem

15. **CompletionProgress.tsx** (sub-komponent PlanHeader)
    - Progress bar
    - Liczby: completed/total
    - Badge z statusem completion

16. **StateBadge.tsx** (sub-komponent PlanHeader)
    - Badge dla plan state
    - Różne kolory dla active/completed/cancelled

17. **PlanHeader.tsx**
    - Layout z flexbox
    - Integracja StateBadge, CompletionProgress, ActionMenu
    - Tytuł z zakresem dat

18. **PlanCalendarStrip.tsx**
    - Horizontal scroll container
    - Renderowanie DateBadge dla każdego dnia
    - Snap scroll dla lepszego UX
    - Responsywność

19. **DayCard.tsx**
    - Card z shadcn/ui
    - Header z datą i completion badge
    - Grid 2x2 dla 4 posiłków (MealMiniature)
    - Button "Zobacz dzień"
    - ID dla scroll target

20. **DaysList.tsx**
    - Responsive grid (1/2/3 kolumny)
    - Renderowanie DayCard dla każdego dnia

---

### Faza 6: Główny komponent (1.5h)

21. **PlanOverviewContent.tsx**
    - Zarządzanie stanem (useState)
    - Użycie custom hooków (usePlanOverview, usePlanActions)
    - Logika handleArchive, handleCancel, handleConfirm
    - Renderowanie warunkowe (loading/error/success)
    - Integracja wszystkich sub-komponentów

22. **Integracja w src/pages/plans/[id].astro**
    - Import PlanOverviewContent
    - Przekazanie planId z params
    - client:load directive
    - Obsługa błędów server-side (redirect dla 401)

---

### Faza 7: Styling i responsywność (1.5h)

23. **Styling komponentów z Tailwind**
    - Responsive breakpoints (mobile-first)
    - Dark mode support (opcjonalnie)
    - Hover/focus states
    - Transitions i animations

24. **Testowanie responsywności**
    - Mobile (320px - 768px)
    - Tablet (768px - 1024px)
    - Desktop (1024px+)
    - Testowanie na różnych urządzeniach

25. **Accessibility improvements**
    - ARIA labels
    - Keyboard navigation
    - Focus indicators
    - Screen reader support

---

### Faza 8: Testing i bug fixing (2h)

26. **Manual testing - happy path**
    - Załadowanie planu
    - Nawigacja po dniach (calendar strip)
    - Kliknięcie "Zobacz dzień"
    - Archiwizacja planu (completion >= 90%)
    - Anulowanie planu

27. **Testing error scenarios**
    - Plan nie istnieje (404)
    - Brak dostępu (403)
    - Błąd serwera (500)
    - Timeout
    - Błędy podczas akcji

28. **Testing edge cases**
    - Plan z 1 dniem
    - Plan z 30 dniami
    - Plan bez obrazków przepisów
    - Plan z completion < 90% (disabled archive)
    - Plan z przyszłą datą startu
    - Plan completed/cancelled (brak ActionMenu)

29. **Performance testing**
    - Czas ładowania dla planu 7-dniowego
    - Czas ładowania dla planu 30-dniowego
    - Smooth scrolling
    - Image loading performance

30. **Bug fixing**
    - Naprawa znalezionych bugów
    - Code review
    - Refactoring jeśli potrzebne

---

### Faza 9: Dokumentacja i finalizacja (30 min)

31. **Dokumentacja kodu**
    - JSDoc comments dla funkcji publicznych
    - README w folderze components/planOverview (opcjonalnie)
    - Przykłady użycia

32. **Update API_TESTING.md**
    - Dodanie przykładów testowania widoku
    - Curl commands dla API endpoints

33. **Git commit i PR**
    - Commit z opisem zmian
    - Utworzenie PR z opisem implementacji
    - Link do testów i screenshotów

---

### Podsumowanie czasowe

| Faza | Czas | Opis |
|------|------|------|
| Faza 1 | 30 min | Setup i struktura |
| Faza 2 | 1h | Utilities |
| Faza 3 | 1h | Custom hooki |
| Faza 4 | 2h | Komponenty podstawowe |
| Faza 5 | 2.5h | Komponenty złożone |
| Faza 6 | 1.5h | Główny komponent |
| Faza 7 | 1.5h | Styling i responsywność |
| Faza 8 | 2h | Testing |
| Faza 9 | 30 min | Dokumentacja |
| **Total** | **~12h** | **Pełna implementacja** |

---

### Checklisty dla developera

**Przed rozpoczęciem**:
- [ ] Endpoint GET /api/plans/{id} działa i zwraca PlanDetailsResponse
- [ ] Endpoint PATCH /api/plans/{id} jest gotowy (lub zaplanowany)
- [ ] RLS policies są aktywne
- [ ] Middleware Astro obsługuje sesje Supabase
- [ ] Shadcn/ui components są zainstalowane (Dialog, DropdownMenu, Button, Card, Badge)

**Po implementacji każdej fazy**:
- [ ] Kod jest przetestowany lokalnie
- [ ] Brak błędów TypeScript
- [ ] Brak błędów ESLint (zgodnie z user rules: nie naprawiaj automatycznie)
- [ ] Komponenty są responsive
- [ ] Accessibility jest zachowane

**Przed finalnym commitem**:
- [ ] Wszystkie fazy są ukończone
- [ ] Manual testing passed
- [ ] Error scenarios tested
- [ ] Edge cases tested
- [ ] Performance jest akceptowalna
- [ ] Kod jest zdokumentowany
- [ ] README/dokumentacja zaktualizowana

---

## Dodatkowe uwagi

### Zależności npm

Upewnij się, że są zainstalowane:
```json
{
  "dependencies": {
    "date-fns": "^3.0.0",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest"
  }
}
```

### Zmienne środowiskowe

Wymagane w `.env`:
```
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

### Potencjalne rozszerzenia (post-MVP)

- Real-time updates (Supabase Realtime)
- Eksport planu do PDF
- Udostępnianie planu (share link)
- Duplikowanie planu
- Filtrowanie dni (tylko ukończone, tylko przyszłe)
- Statystyki planu (kalorie, makroskładniki)

---

**Dokument przygotowany**: 2024-10-23  
**Wersja**: 1.0  
**Status**: Gotowy do implementacji

