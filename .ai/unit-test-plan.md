# Plan testów jednostkowych — Cookido AI

## Zakres i cele
- Weryfikacja kluczowej logiki biznesowej i niezmienników bez użycia prawdziwego DB/DOM.
- Priorytet dla obszarów wysokiego ryzyka (generowanie planu, swap) oraz tanich/testowalnych jednostek (schematy Zod, transformacje, utils).
- Użycie mocków/stubów dla Supabase i sieci; testy deterministyczne.

## Narzędzia i konwencje testowe
- Framework: Vitest; środowisko DOM nie jest wymagane dla tego planu.
- Lokalizacja testów: współlokalnie jako `*.test.ts` lub w `src/**/__tests__/*` dla większych zestawów.
- Nazewnictwo plików: odzwierciedla ścieżkę źródła, np. `src/lib/services/plans.service.test.ts`.

## Strategia mockowania
- Supabase: stub minimalnego łańcucha używanego w kodzie (`from().select().eq().in().update().insert().single().maybeSingle().order().range()`), zwracającego wartości ukształtowane jak prawdziwe wyniki.
- Granice modułów:
  - Spy/mock pomocniczych funkcji tam, gdzie ma to sens (np. `selectRecipeWithFallback`, `getRecipesForSlot`).
- Fetch: mock globalnego `fetch` w testach hooków.

## Obszary i przypadki testowe

### 1) Serwis planów — daty, cele kaloryczne, selekcja, generowanie
- Plik: `src/lib/services/plans.service.ts`

1.1 `calculateEndDate`
- Zwraca datę końcową włącznie dla różnych długości (1, 7, 31), na granicach miesięcy i lat przestępnych.
- Normalizuje do `YYYY-MM-DD`.

1.2 `generatePlanDates`
- Generuje ciągłe daty ISO o oczekiwanej długości; poprawny pierwszy/ostatni dzień; obsługa przejść miesiąc/rok.

1.3 `calculateSlotTargets` (utrwalenie obecnego zachowania)
- Podział 25/35/35/5 z zaokrąglaniem per slot. Wykrywa odchylenia przy zmianie kodu.
```35:47:src/lib/services/plans.service.ts
/**
 * Calculate calorie targets for each meal slot
 * Distribution: Breakfast 25%, Lunch 35%, Dinner 35%, Snacks 5%
 */
function calculateSlotTargets(
  dailyCalories: number
): Record<Enums<'meal_slot'>, number> {
  return {
    breakfast: Math.round(dailyCalories * 0.25),
    lunch: Math.round(dailyCalories * 0.35),
    dinner: Math.round(dailyCalories * 0.35),
    snack: Math.round(dailyCalories * 0.05)
  }
}
```
- Uwaga: PRD/plan testów wspominają 20/30/30/20; ta rozbieżność jest świadomie utrwalona — testy dokumentują aktualne „źródło prawdy”.

1.4 `selectRecipeWithFallback`
- Ścieżka A: wynik przy tolerancji ±20% i wykluczeniu wskazanych ID.
- Ścieżka B: eskalacja do ±30%, gdy brak wyników.
- Ścieżka C: dopuszczenie powtórek przy dalszym braku wyników.
- Zapewnia nie-NULL przy ostatniej próbie, gdy stubowane dane istnieją.

1.5 `generatePlan` — testy ograniczone ze stubami
- Scenariusz szczęśliwy (krótki plan, np. 3 dni):
  - Tworzy inserty `plans`, `plan_days`, `plan_day_slot_targets`, `plan_meals` (walidacja liczby i kształtu rekordów przez rejestrator stubów).
  - Lunch/obiad jako para wieloporcjowa:
    - Dzień 1: `is_leftover=false`, `portions_to_cook=recipe.portions`.
    - Dzień 2: `is_leftover=true`, `portions_to_cook=null`.
    - Identyczne `portion_multiplier` i `calories_planned` w obu dniach.
  - `filledSlots` zapobiega podwójnemu wypełnieniu dnia 2.
- Błąd: `ConflictError`, gdy `checkExistingActivePlan` zwraca true.
- Błąd: `ServerError`, gdy brak przepisu dla slotu.

1.6 `getPlans`
- Poprawna paginacja: `total`, `has_more` dla różnych `limit/offset`.
- Stosuje filtr `state`; zwraca `has_active_plan`, gdy istnieje jakikolwiek aktywny plan.

1.7 `getPlanDetailsWithMeals`/`getPlanById`
- Poprawne mapowanie; obecność/kształt zagnieżdżonych dni i posiłków, `available_slots`; wyliczenie `time_minutes`; przekazanie `portions_to_cook`.

### 2) Serwis posiłków planu — walidacja, swap, alternatywy, status
- Plik: `src/lib/services/planMeals.service.ts`

2.1 `validateSwapCandidate`
- Błąd, gdy `recipe.available_slots` nie zawiera `planMeal.slot`.
- Oblicza `portionMultiplier = round(target/recipe.cal)` i zwraca błąd, gdy > `recipe.portions`.
- Weryfikuje `plannedCalories` w tolerancji ±20% celu slotu (zarówno zbyt nisko, jak i zbyt wysoko); przechodzi w tolerancji.

2.2 `performSwapTransaction`
- Pojedynczy posiłek (bez grupy): aktualizuje tylko przekazany `id`; przelicza `portion_multiplier` i `calories_planned`.
- Grupa wieloporcjowa: aktualizuje wszystkie posiłki w grupie; zachowuje semantykę resztek (`is_leftover=true` nie dostaje `portions_to_cook`).
- Zwraca `UpdatedMealInSwap[]` z dołączonym `portions_to_cook`.

2.3 `getAlternativesForMeal`
- Wylicza `targetCaloriesPerServing = calories_planned / portion_multiplier`.
- Filtruje po slocie i ±20% celu na porcję; wyklucza bieżący przepis; respektuje `limit`.
- Zwraca przepisy wzbogacone o `available_slots`.

2.4 `updateMealStatus`
- Ścieżki: NotFound (brak posiłku), Forbidden (inny użytkownik), Success (zaktualizowano status i zwrócono).

### 3) Schematy Zod — reguły walidacji
- Pliki: `src/lib/schemas/plan.ts`, `src/lib/schemas/recipe.ts`

3.1 `createPlanCommandSchema`
- Akceptuje poprawne dane; odrzuca: kalorie <800/> 6000, długość <1/> 365, `start_date` niepoprawny lub nie w przyszłości (dzisiaj/przeszłość).

3.2 `updatePlanCommandSchema`
- Akceptuje tylko dozwolone wartości enum; asercja oczekiwanego mapowania w aplikacji (UI `completed` → API `archived`).

3.3 `getPlansQuerySchema`
- `state` nullish→undefined; limity `limit`/`offset`; koercja ze stringów.

3.4 `GetRecipesQuerySchema`
- Enum slotu; dodatnie liczby całkowite dla kalorii; długość wyszukiwania; `min<=max` (refine).

### 4) Transformacje UI i utilsy (czyste funkcje)
- Pliki: `src/components/planOverview/transforms.ts`, `src/components/planOverview/dateUtils.ts`

4.1 `transformToPlanOverview`
- Mapuje `state: 'archived'` → `'completed'` w UI; liczy `completionPercentage` z zaokrągleniem; sumy i liczniki.
```12:31:src/components/planOverview/transforms.ts
export function transformToPlanOverview(data: PlanDetailsResponse): PlanOverviewViewModel {
  const allMeals = data.days.flatMap(day => day.meals)
  const completedMeals = allMeals.filter(m => m.status === 'completed')
  const state = data.state === 'archived' ? 'completed' : data.state
  return {
    id: data.id,
    state: state as 'active' | 'completed' | 'cancelled',
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
```

4.2 `transformToDay`
- Wyznacza `completionStatus` dla 0/wszystkie/częściowo; sumuje `calories_planned` z zaokrągleniem.

4.3 `transformToMealMiniature`
- Badge: `'Ugotuj na 2 dni'` dla dnia gotowania; `'Resztki'` dla dnia z resztkami.

4.4 `dateUtils`
- `getDayOfWeek`, `formatDate`, `formatDateRange` — poprawne formaty PL i przypadki brzegowe.

## Struktura plików testów
- `src/lib/services/plans.service.test.ts`
- `src/lib/services/planMeals.service.test.ts`
- `src/lib/schemas/plan.schema.test.ts`
- `src/lib/schemas/recipe.schema.test.ts`
- `src/components/planOverview/transforms.test.ts`
- `src/components/planOverview/dateUtils.test.ts`
- Opcjonalnie: `src/lib/services/plans.getPlans.test.ts` (jeśli wydzielone)

## Fabryki danych testowych
- Minimalne factory dla przepisów, wierszy `plan_meal`, celów slotów; helper do tworzenia stubu Supabase z wstępnie załadowanymi odpowiedziami i rejestrowaniem insertów/update’ów.

## Poza zakresem (unit)
- Handlery tras API (pokryte testami API/integracyjnymi).
- Renderowanie komponentów React i zachowanie react-query (pokryte testami UI/E2E).

## Kryteria wyjścia
- Pokryte ścieżki krytyczne:
  - Pomocnicze funkcje generowania planu, fallback selekcji, parowanie wieloporcjowe
  - Walidacja swapa i ścieżki transakcyjne
  - Wszystkie schematy Zod — ścieżki nominalne i brzegowe
  - Transformacje overview/day/meal i utilsy dat
- Rekomendowane pokrycie: ≥80% linii w powyższych plikach (jakość ponad surowe %).


