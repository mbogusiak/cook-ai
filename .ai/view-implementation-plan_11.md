# API Endpoint Implementation Plan: GET /api/plans/{id}

## 1. Przegląd punktu końcowego

**Cel**: Pobranie szczegółowych informacji o konkretnym planie żywieniowym użytkownika wraz ze wszystkimi dniami, posiłkami i celami kalorycznymi.

**Funkcjonalność**:
- Zwraca pełny plan żywieniowy z zagnieżdżoną strukturą dni i posiłków
- Dla każdego posiłku dołącza informacje o przepisie
- Zawiera cele kaloryczne dla każdego slotu każdego dnia
- Obsługuje logikę wieloporcjowości (multi-portion meals) i restek (leftovers)
- Wymaga autoryzacji - użytkownik może pobrać tylko własne plany

**Zastosowanie biznesowe**: 
Endpoint ten jest kluczowy dla widoku głównego dashboardu, gdzie użytkownik przegląda swój plan dnia po dniu, widzi wszystkie zaplanowane posiłki, może je oznaczać jako ukończone/pominięte oraz inicjować wymianę.

---

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
`/api/plans/{id}`

### Parametry

#### Parametry ścieżki (Path Parameters):
- **id** (wymagany)
  - Typ: `number` (integer)
  - Ograniczenia: `id > 0`
  - Opis: Unikalny identyfikator planu
  - Walidacja: Musi być liczbą całkowitą dodatnią

#### Query Parameters:
Brak

#### Request Headers:
- `Content-Type: application/json`
- `Accept: application/json`
- Cookie zawierający sesję Supabase (automatycznie obsługiwane przez middleware)

#### Request Body:
Brak (metoda GET)

---

## 3. Wykorzystywane typy

### DTOs (Response Types)

```typescript
// z src/types.ts

// Główny typ odpowiedzi
export type PlanDetailsResponse = PlanDTO & {
  days: PlanDayResponse[]
}

// Bazowy plan DTO
export type PlanDTO = Pick<
  Tables<'plans'>,
  'id' | 'user_id' | 'state' | 'start_date' | 'end_date' | 'created_at' | 'updated_at'
>

// Szczegóły dnia w planie
export type PlanDayResponse = {
  id: number
  plan_id: number
  date: string
  meals: MealResponse[]
  slot_targets: SlotTargetResponse[]
}

// Szczegóły posiłku
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

// Przepis w kontekście posiłku
export type RecipeInMealResponse = Pick<
  RecipeDTO,
  'id' | 'name' | 'image_url' | 'time_minutes' | 'source_url' | 'available_slots'
>

// Cele kaloryczne dla slotu
export type SlotTargetResponse = Pick<
  Tables<'plan_day_slot_targets'>,
  'slot' | 'calories_target'
>
```

### Command Models
Brak (endpoint tylko do odczytu)

### Validation Schemas

```typescript
// Nowy schemat walidacji dla ID planu (do utworzenia w src/lib/schemas/)
import { z } from 'zod'

export const planIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
})
```

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

**Headers**:
```
Content-Type: application/json
```

**Body Structure**:
```json
{
  "data": {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "state": "active",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "days": [
      {
        "id": 1,
        "plan_id": 1,
        "date": "2024-01-15",
        "meals": [
          {
            "id": 1,
            "slot": "breakfast",
            "status": "planned",
            "calories_planned": 400,
            "portion_multiplier": 1.0,
            "portions_to_cook": null,
            "multi_portion_group_id": null,
            "is_leftover": false,
            "recipe": {
              "id": 1,
              "name": "Healthy Breakfast Bowl",
              "image_url": "https://example.com/image.jpg",
              "time_minutes": 15,
              "source_url": "https://cookido.com/recipe/123",
              "available_slots": ["breakfast", "lunch"]
            }
          },
          {
            "id": 2,
            "slot": "lunch",
            "status": "planned",
            "calories_planned": 600,
            "portion_multiplier": 2.0,
            "portions_to_cook": 6,
            "multi_portion_group_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
            "is_leftover": false,
            "recipe": {
              "id": 15,
              "name": "Gulasz wołowy",
              "image_url": "https://example.com/gulasz.jpg",
              "time_minutes": 45,
              "source_url": "https://cookido.com/recipe/456",
              "available_slots": ["lunch", "dinner"]
            }
          }
        ],
        "slot_targets": [
          { "slot": "breakfast", "calories_target": 400 },
          { "slot": "lunch", "calories_target": 600 },
          { "slot": "dinner", "calories_target": 600 },
          { "slot": "snack", "calories_target": 400 }
        ]
      }
    ],
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid plan ID format"
}
```
**Przyczyny**:
- ID nie jest liczbą
- ID jest ujemne lub zerem
- Nieprawidłowy format parametru

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
**Przyczyny**:
- Brak sesji użytkownika
- Wygasła sesja
- Nieprawidłowy token Supabase

#### 403 Forbidden
```json
{
  "error": "Access denied"
}
```
**Przyczyny**:
- Użytkownik próbuje uzyskać dostęp do planu innego użytkownika
- Polityki RLS odrzuciły zapytanie

#### 404 Not Found
```json
{
  "error": "Plan not found"
}
```
**Przyczyny**:
- Plan o podanym ID nie istnieje
- Plan istnieje, ale należy do innego użytkownika (RLS go ukrywa)

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
**Przyczyny**:
- Błąd połączenia z bazą danych
- Nieprzewidziany błąd aplikacji
- Błąd w zapytaniu SQL

---

## 5. Przepływ danych

### Diagram przepływu

```
1. Request → Astro API Endpoint
2. ↓
3. Walidacja parametru ID (Zod)
4. ↓
5. Middleware → Weryfikacja sesji Supabase (context.locals.supabase)
6. ↓
7. Service Layer → getPlanById(supabase, planId)
   ├─→ Zapytanie do plans (z RLS)
   ├─→ Zapytanie do plan_days (JOIN)
   ├─→ Zapytanie do plan_meals (JOIN)
   ├─→ Zapytanie do plan_day_slot_targets (JOIN)
   └─→ Zapytanie do recipes (JOIN przez recipe_id)
8. ↓
9. Transformacja danych do PlanDetailsResponse
10. ↓
11. Response → 200 OK z JSON
```

### Szczegółowy opis kroków

#### Krok 1-2: Routing
Astro odbiera żądanie GET do `/api/plans/{id}` i przekazuje je do handlera.

#### Krok 3: Walidacja parametrów
```typescript
const validationResult = planIdParamSchema.safeParse({ id: params.id })
if (!validationResult.success) {
  return new Response(JSON.stringify({ error: "Invalid plan ID format" }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  })
}
const planId = validationResult.data.id
```

#### Krok 4: Autoryzacja
Middleware już zweryfikował sesję. Klient Supabase w `context.locals.supabase` ma ustawiony kontekst użytkownika. Polityki RLS automatycznie filtrują wyniki.

#### Krok 5: Pobranie danych planu
```typescript
// Service wywołuje Supabase z zagnieżdżonymi JOIN
const plan = await plansService.getPlanById(supabase, planId)

if (!plan) {
  return new Response(JSON.stringify({ error: "Plan not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  })
}
```

#### Krok 6: Struktura zapytania SQL (koncepcyjnie)
```sql
-- Główne zapytanie do planu (RLS: user_id = auth.uid())
SELECT * FROM plans WHERE id = $1

-- Dni planu
SELECT * FROM plan_days WHERE plan_id = $1 ORDER BY date

-- Cele kaloryczne dla każdego dnia
SELECT * FROM plan_day_slot_targets WHERE plan_day_id IN (...)

-- Posiłki dla każdego dnia
SELECT 
  pm.*,
  r.id as recipe_id,
  r.name as recipe_name,
  r.image_url,
  r.source_url,
  (SELECT array_agg(rs.slot) FROM recipe_slots rs WHERE rs.recipe_id = r.id) as available_slots
FROM plan_meals pm
JOIN recipes r ON r.id = pm.recipe_id
WHERE pm.plan_day_id IN (...)
ORDER BY pm.slot
```

**Uwaga na RLS**: Zapytanie do `plans` automatycznie sprawdza `user_id = auth.uid()`. Jeśli plan nie należy do użytkownika, zwrócone zostanie 0 wierszy (interpretowane jako 404).

#### Krok 7: Transformacja do DTO
Service musi przekształcić płaskie wyniki z bazy w zagnieżdżoną strukturę:
- `Plan` → `days[]` → `meals[]` + `slot_targets[]`
- Każdy `meal` zawiera zagnieżdżony `recipe`

#### Krok 8: Odpowiedź
```typescript
return new Response(JSON.stringify({ data: plan }), {
  status: 200,
  headers: { "Content-Type": "application/json" }
})
```

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

**Metoda**: Session-based authentication przez Supabase
- Middleware (`src/middleware/index.ts`) już weryfikuje sesję
- `context.locals.supabase` zawiera klienta z kontekstem użytkownika
- Brak sesji → 401 Unauthorized (obsługiwane przez middleware lub w endpoincie)

**Implementacja**:
```typescript
const user = await context.locals.supabase.auth.getUser()
if (!user.data.user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
  })
}
```

### Autoryzacja

**Metoda**: Row Level Security (RLS) w Supabase

**Polityki RLS** (zgodnie z db-plan.md):
```sql
-- plans table
CREATE POLICY "Users can only see their own plans"
ON plans FOR SELECT
USING (user_id = auth.uid());

-- plan_days table
CREATE POLICY "Users can only see days from their plans"
ON plan_days FOR SELECT
USING (EXISTS (
  SELECT 1 FROM plans p 
  WHERE p.id = plan_days.plan_id 
  AND p.user_id = auth.uid()
));

-- plan_meals table (denormalizacja user_id dla wydajności)
CREATE POLICY "Users can only see their own meals"
ON plan_meals FOR SELECT
USING (user_id = auth.uid());
```

**Ochrona przed IDOR (Insecure Direct Object Reference)**:
- RLS automatycznie filtruje wyniki
- Jeśli użytkownik poda ID planu innego użytkownika → RLS zwróci 0 wierszy → 404 Not Found
- Nie ma wycieku informacji czy plan istnieje (zawsze 404 dla nieautoryzowanych planów)

### Walidacja danych wejściowych

**Walidacja parametru ID**:
```typescript
import { z } from 'zod'

const planIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
})

// Użycie
const result = planIdParamSchema.safeParse({ id: params.id })
if (!result.success) {
  return new Response(JSON.stringify({ error: "Invalid plan ID format" }), {
    status: 400
  })
}
```

**Ochrona przed**:
- SQL Injection: Parametry są przekazywane przez Supabase client (prepared statements)
- Type coercion attacks: Zod wymusza typ number
- Negative/zero IDs: Zod sprawdza `.positive()`

### Ochrona przed wyciekiem danych

**Wrażliwe dane w odpowiedzi**:
- `user_id` jest zwracany, ale to nie jest wrażliwe (UUID bez PII)
- Nie zwracamy: haseł, tokenów, kluczy API, emaili
- Recipe data pochodzi z publicznej tabeli `recipes` (niska wrażliwość)

**Denormalizacja `user_id` w `plan_meals`**:
- Przyspiesza zapytania RLS
- Wymaga spójności (obsługiwanej przez trigger `fn_set_plan_meals_denorm`)

### Rate Limiting

**Rekomendacja**: Dodać rate limiting na poziomie infrastruktury lub middleware:
- Max 100 requests/minute per user dla authenticated endpoints
- Supabase ma wbudowane rate limiting na poziomie projektu

**Implementacja** (opcjonalna, dla przyszłych iteracji):
```typescript
// Przykład middleware
const rateLimiter = new Map<string, { count: number, resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = rateLimiter.get(userId)
  
  if (!limit || limit.resetAt < now) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 60000 })
    return true
  }
  
  if (limit.count >= 100) return false
  
  limit.count++
  return true
}
```

---

## 7. Obsługa błędów

### Tabela błędów i kodów statusu

| Scenariusz | Status | Error Message | Przyczyna | Akcja |
|------------|--------|---------------|-----------|-------|
| Brak parametru ID | 400 | "Invalid plan ID format" | Astro routing powinien tego nie dopuścić | Zwróć 400 |
| ID niebędące liczbą | 400 | "Invalid plan ID format" | Np. `/api/plans/abc` | Walidacja Zod |
| ID ujemne lub 0 | 400 | "Invalid plan ID format" | Np. `/api/plans/-1` | Walidacja Zod |
| Brak sesji | 401 | "Unauthorized" | `getUser()` zwraca null | Sprawdź sesję na początku |
| Plan innego użytkownika | 404 | "Plan not found" | RLS ukrywa wynik | Traktuj jak not found |
| Plan nie istnieje | 404 | "Plan not found" | Brak w bazie | Sprawdź po query |
| Błąd połączenia DB | 500 | "Internal server error" | Supabase client error | Loguj szczegóły, zwróć ogólny błąd |
| Nieoczekiwany błąd | 500 | "Internal server error" | Wyjątek w kodzie | Loguj stack trace |

### Struktura obsługi błędów w kodzie

```typescript
export const GET: APIRoute = async (context) => {
  try {
    // 1. Walidacja parametrów
    const validationResult = planIdParamSchema.safeParse({ id: context.params.id })
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return new Response(
        JSON.stringify({ error: "Invalid plan ID format" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // 2. Autoryzacja
    const { data: { user } } = await context.locals.supabase.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // 3. Pobranie danych
    const planId = validationResult.data.id
    const plan = await plansService.getPlanById(context.locals.supabase, planId)
    
    // 4. Sprawdzenie istnienia (RLS może zwrócić null)
    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }), 
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // 5. Success response
    return new Response(
      JSON.stringify({ data: plan }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
    
  } catch (error) {
    // Logowanie szczegółów dla deweloperów
    console.error('Error in GET /api/plans/[id]:', error)
    
    // Ogólny błąd dla klienta (nie wyciekamy szczegółów)
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
```

### Logging i Observability

**Co logować**:
- ✅ Wszystkie błędy walidacji (z szczegółami Zod)
- ✅ Wszystkie 500 errors (pełny stack trace)
- ✅ Unauthorized attempts (security monitoring)
- ❌ Success responses (zbyt dużo noise)
- ❌ User IDs w plaintext (GDPR concern)

**Format logów**:
```typescript
console.error('[GET /api/plans/:id]', {
  planId: validationResult.data?.id,
  userId: user?.id?.substring(0, 8), // Partial hash dla privacy
  error: error.message,
  stack: error.stack
})
```

**Monitoring metryki**:
- Liczba 404 (wysoka wartość może oznaczać problem z URL lub ataki)
- Liczba 401 (spike może oznaczać problem z sesją)
- Liczba 500 (błędy produkcyjne)
- Średni czas odpowiedzi (performance)

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

#### 1. N+1 Query Problem
**Problem**: 
- Pobranie planu (1 query)
- Dla każdego dnia osobne query do `plan_days` (N queries)
- Dla każdego posiłku osobne query do `recipes` (M queries)

**Rozwiązanie**: Użyć JOIN lub Supabase `.select()` z relacjami
```typescript
const { data, error } = await supabase
  .from('plans')
  .select(`
    *,
    days:plan_days(
      *,
      slot_targets:plan_day_slot_targets(*),
      meals:plan_meals(
        *,
        recipe:recipes(id, name, image_url, source_url)
      )
    )
  `)
  .eq('id', planId)
  .single()
```

**Uwaga**: Supabase automatycznie wykonuje efektywne JOIN.

#### 2. Duże plany (30 dni × 4 sloty = 120 posiłków)
**Problem**: Odpowiedź może być bardzo duża (>100KB JSON)

**Rozwiązanie**:
- Kompresja gzip (Astro automatycznie w prod)
- Paginacja dni (opcjonalna dla przyszłych iteracji)
- Lazy loading przepisów (opcjonalnie tylko ID, reszta on-demand)

**Aktualna decyzja**: MVP nie wymaga paginacji, maksymalnie 31 dni × 4 sloty = ~50KB JSON (akceptowalne).

#### 3. Brak cache'owania
**Problem**: Ten sam plan może być pobierany wielokrotnie w krótkim czasie (np. użytkownik odświeża stronę).

**Rozwiązanie**:
- **Opcja 1** (nie dla MVP): HTTP Cache-Control headers
  ```typescript
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "private, max-age=300" // 5 minut cache
  }
  ```
  ⚠️ **Uwaga**: Plan może się zmieniać (status posiłków, wymiany), więc cache musi być krótki.

- **Opcja 2**: Client-side cache (React Query na frontendzie)
  ```typescript
  const { data } = useQuery(['plan', planId], () => fetchPlan(planId), {
    staleTime: 5 * 60 * 1000 // 5 minut
  })
  ```

**Decyzja MVP**: Brak server-side cache (autosave wymaga aktualnych danych). Frontend użyje React Query.

#### 4. Indeksy bazodanowe
**Wymagane indeksy** (zgodnie z db-plan.md):
```sql
-- plans
CREATE UNIQUE INDEX idx_plans_active_user ON plans(user_id) WHERE state = 'active';

-- plan_days
CREATE INDEX idx_plan_days_plan_date ON plan_days(plan_id, date);

-- plan_meals
CREATE INDEX idx_plan_meals_plan_slot_status ON plan_meals(plan_id, slot, status);
```

**Weryfikacja**: Upewnić się, że migracja utworzyła te indeksy.

### Optymalizacje

#### Denormalizacja
✅ **Już zaimplementowane** w db-plan.md:
- `plan_meals.plan_id` (denormalizacja z `plan_days.plan_id`)
- `plan_meals.user_id` (denormalizacja z `plans.user_id`)

**Korzyść**: RLS query może filtrować bezpośrednio po `plan_meals.user_id` zamiast JOIN przez `plan_days` → `plans`.

#### Selectywne pobieranie pól
**Optymalizacja**: Nie pobieraj zbędnych pól z `recipes`
```typescript
recipe:recipes(
  id, 
  name, 
  image_url, 
  time_minutes, 
  source_url
  // Pomijamy: prep_minutes, cook_minutes, ingredients, protein_g, etc.
)
```

#### Agregacja `available_slots`
**Problem**: `recipe_slots` to osobna tabela (many-to-many).

**Rozwiązanie**: Sub-query lub array_agg
```sql
SELECT 
  r.id,
  r.name,
  r.image_url,
  r.source_url,
  COALESCE(
    (SELECT array_agg(rs.slot ORDER BY rs.slot) 
     FROM recipe_slots rs 
     WHERE rs.recipe_id = r.id),
    '{}'::meal_slot[]
  ) as available_slots
FROM recipes r
```

Supabase może to obsłużyć przez:
```typescript
recipe:recipes(
  *,
  slots:recipe_slots(slot)
)
```

Później w service zmapować `slots` na `available_slots`.

### Benchmark celów
- **Czas odpowiedzi**: < 500ms dla planu 7-dniowego
- **Wielkość odpowiedzi**: < 100KB (nieskompresowane JSON)
- **DB queries**: Max 5 queries (1 plan + 1 days + 1 meals + 1 targets + 1 recipes)

---

## 9. Kroki implementacji

### Faza 1: Przygotowanie schematu walidacji

**Plik**: `src/lib/schemas/planParams.ts` (nowy)

**Zadanie**:
```typescript
import { z } from 'zod'

/**
 * Schema for validating plan ID path parameter
 */
export const planIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Plan ID must be a positive integer"
  })
})

export type PlanIdParam = z.infer<typeof planIdParamSchema>
```

**Test walidacji**:
```typescript
// Powinno przejść
planIdParamSchema.parse({ id: "123" }) // → { id: 123 }
planIdParamSchema.parse({ id: 1 }) // → { id: 1 }

// Powinno rzucić error
planIdParamSchema.parse({ id: "abc" }) // ❌ ZodError
planIdParamSchema.parse({ id: "-1" }) // ❌ ZodError
planIdParamSchema.parse({ id: "0" }) // ❌ ZodError
```

---

### Faza 2: Implementacja service method

**Plik**: `src/lib/services/plans.service.ts` (rozszerzenie istniejącego)

**Metoda do dodania**: `getPlanById`

**Sygnatura**:
```typescript
export async function getPlanById(
  supabase: SupabaseClient,
  planId: number
): Promise<PlanDetailsResponse | null>
```

**Implementacja** (szkic):
```typescript
import type { SupabaseClient } from '../db/supabase.client'
import type { PlanDetailsResponse, PlanDayResponse, MealResponse, RecipeInMealResponse, SlotTargetResponse } from '../types'

export async function getPlanById(
  supabase: SupabaseClient,
  planId: number
): Promise<PlanDetailsResponse | null> {
  
  // 1. Pobranie planu (RLS sprawdzi user_id automatycznie)
  const { data: planData, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()
  
  if (planError || !planData) {
    if (planError?.code === 'PGRST116') {
      // Not found or RLS blocked
      return null
    }
    throw planError
  }
  
  // 2. Pobranie dni planu
  const { data: daysData, error: daysError } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', planId)
    .order('date', { ascending: true })
  
  if (daysError) throw daysError
  
  const dayIds = daysData.map(d => d.id)
  
  // 3. Pobranie celów kalorycznych dla dni
  const { data: targetsData, error: targetsError } = await supabase
    .from('plan_day_slot_targets')
    .select('*')
    .in('plan_day_id', dayIds)
  
  if (targetsError) throw targetsError
  
  // 4. Pobranie posiłków z przepisami
  const { data: mealsData, error: mealsError } = await supabase
    .from('plan_meals')
    .select(`
      id,
      plan_day_id,
      slot,
      status,
      calories_planned,
      portion_multiplier,
      portions_to_cook,
      multi_portion_group_id,
      is_leftover,
      recipe_id,
      recipes (
        id,
        name,
        image_url,
        prep_minutes,
        cook_minutes,
        source_url
      )
    `)
    .in('plan_day_id', dayIds)
    .order('slot')
  
  if (mealsError) throw mealsError
  
  // 5. Pobranie dostępnych slotów dla każdego przepisu
  const recipeIds = [...new Set(mealsData.map(m => m.recipe_id))]
  const { data: recipeSlotsData, error: slotsError } = await supabase
    .from('recipe_slots')
    .select('recipe_id, slot')
    .in('recipe_id', recipeIds)
  
  if (slotsError) throw slotsError
  
  // 6. Mapowanie slotów do przepisów
  const recipeSlotsMap = new Map<number, string[]>()
  recipeSlotsData.forEach(rs => {
    if (!recipeSlotsMap.has(rs.recipe_id)) {
      recipeSlotsMap.set(rs.recipe_id, [])
    }
    recipeSlotsMap.get(rs.recipe_id)!.push(rs.slot)
  })
  
  // 7. Budowanie zagnieżdżonej struktury
  const days: PlanDayResponse[] = daysData.map(day => {
    // Posiłki dla tego dnia
    const dayMeals = mealsData
      .filter(m => m.plan_day_id === day.id)
      .map(m => {
        const recipe = m.recipes as any // Type assertion (Supabase zwraca object)
        const timeMinutes = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)
        
        const mealResponse: MealResponse = {
          id: m.id,
          slot: m.slot,
          status: m.status,
          calories_planned: m.calories_planned,
          portion_multiplier: m.portion_multiplier,
          portions_to_cook: m.portions_to_cook,
          multi_portion_group_id: m.multi_portion_group_id,
          is_leftover: m.is_leftover,
          recipe: {
            id: recipe.id,
            name: recipe.name,
            image_url: recipe.image_url,
            time_minutes: timeMinutes > 0 ? timeMinutes : null,
            source_url: recipe.source_url,
            available_slots: recipeSlotsMap.get(recipe.id) || []
          }
        }
        return mealResponse
      })
    
    // Cele kaloryczne dla tego dnia
    const dayTargets: SlotTargetResponse[] = targetsData
      .filter(t => t.plan_day_id === day.id)
      .map(t => ({
        slot: t.slot,
        calories_target: t.calories_target
      }))
    
    return {
      id: day.id,
      plan_id: day.plan_id,
      date: day.date,
      meals: dayMeals,
      slot_targets: dayTargets
    }
  })
  
  // 8. Zwrócenie pełnej odpowiedzi
  const response: PlanDetailsResponse = {
    id: planData.id,
    user_id: planData.user_id,
    state: planData.state,
    start_date: planData.start_date,
    end_date: planData.end_date,
    created_at: planData.created_at,
    updated_at: planData.updated_at,
    days
  }
  
  return response
}
```

**Uwagi implementacyjne**:
- RLS automatycznie filtruje `plans` po `user_id = auth.uid()`
- Jeśli plan nie należy do użytkownika, `single()` zwróci error `PGRST116` (not found)
- Zwracamy `null` w przypadku not found (łatwiejsze do obsłużenia w endpoincie)
- Throw error w przypadku innych błędów DB (złapane jako 500 w endpoincie)

---

### Faza 3: Utworzenie endpointa API

**Plik**: `src/pages/api/plans/[id].ts` (nowy)

**Struktura**:
```typescript
import type { APIRoute } from 'astro'
import { planIdParamSchema } from '../../../lib/schemas/planParams'
import { getPlanById } from '../../../lib/services/plans.service'

export const prerender = false

export const GET: APIRoute = async (context) => {
  try {
    // 1. Walidacja parametru ID
    const validationResult = planIdParamSchema.safeParse({ 
      id: context.params.id 
    })
    
    if (!validationResult.success) {
      console.error('[GET /api/plans/:id] Validation error:', {
        input: context.params.id,
        errors: validationResult.error.errors
      })
      
      return new Response(
        JSON.stringify({ error: "Invalid plan ID format" }), 
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      )
    }
    
    const planId = validationResult.data.id
    
    // 2. Sprawdzenie autoryzacji
    const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[GET /api/plans/:id] Unauthorized access attempt:', {
        planId,
        authError: authError?.message
      })
      
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { 
          status: 401, 
          headers: { "Content-Type": "application/json" } 
        }
      )
    }
    
    // 3. Pobranie planu z serwisu
    const plan = await getPlanById(context.locals.supabase, planId)
    
    // 4. Obsługa not found (może być spowodowane RLS)
    if (!plan) {
      console.warn('[GET /api/plans/:id] Plan not found or access denied:', {
        planId,
        userId: user.id.substring(0, 8) // Partial dla privacy
      })
      
      return new Response(
        JSON.stringify({ error: "Plan not found" }), 
        { 
          status: 404, 
          headers: { "Content-Type": "application/json" } 
        }
      )
    }
    
    // 5. Success response
    return new Response(
      JSON.stringify({ data: plan }), 
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json"
          // Opcjonalnie: "Cache-Control": "private, max-age=300"
        } 
      }
    )
    
  } catch (error) {
    // Logowanie pełnego błędu dla debugowania
    console.error('[GET /api/plans/:id] Internal error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: context.params
    })
    
    // Ogólny błąd dla klienta (bezpieczeństwo)
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    )
  }
}
```

**Konfiguracja**:
- `export const prerender = false` - wymuszamy SSR (nie możemy cache'ować z auth)
- Metoda: tylko `GET` (inne metody → 405 Method Not Allowed, Astro automatycznie)

---

### Faza 4: Weryfikacja RLS i uprawnień

**Zadanie**: Upewnić się, że polityki RLS są aktywne

**Plik migracji**: `supabase/migrations/20251015144149_create_initial_schema.sql`

**Weryfikacja polityk**:
```sql
-- Sprawdzenie czy RLS jest włączone
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('plans', 'plan_days', 'plan_meals', 'plan_day_slot_targets');

-- Sprawdzenie polityk
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('plans', 'plan_days', 'plan_meals', 'plan_day_slot_targets');
```

**Oczekiwane polityki**:
1. `plans`: SELECT WHERE `user_id = auth.uid()`
2. `plan_days`: SELECT WHERE EXISTS (JOIN do plans WHERE user_id = auth.uid())
3. `plan_meals`: SELECT WHERE `user_id = auth.uid()` (denormalizacja)
4. `plan_day_slot_targets`: SELECT WHERE EXISTS (JOIN do plan_days → plans)

**Test ręczny**:
```sql
-- Zaloguj się jako user A
SET request.jwt.claim.sub = 'user-a-uuid';

-- Spróbuj pobrać plan user B
SELECT * FROM plans WHERE id = <plan_user_b_id>;
-- Oczekiwany wynik: 0 wierszy

-- Spróbuj pobrać własny plan
SELECT * FROM plans WHERE id = <plan_user_a_id>;
-- Oczekiwany wynik: 1 wiersz
```

---

### Faza 5: Testy jednostkowe i integracyjne

#### Test 1: Walidacja parametrów
```bash
# ID nieprawidłowe
curl -X GET "http://localhost:3000/api/plans/abc" \
  -H "Cookie: sb-access-token=..." \
  -v

# Oczekiwane: 400 Bad Request
# { "error": "Invalid plan ID format" }
```

#### Test 2: Brak autoryzacji
```bash
# Bez ciasteczka sesji
curl -X GET "http://localhost:3000/api/plans/1" \
  -v

# Oczekiwane: 401 Unauthorized
# { "error": "Unauthorized" }
```

#### Test 3: Plan nie istnieje
```bash
# Prawidłowy ID, ale plan nie istnieje
curl -X GET "http://localhost:3000/api/plans/999999" \
  -H "Cookie: sb-access-token=..." \
  -v

# Oczekiwane: 404 Not Found
# { "error": "Plan not found" }
```

#### Test 4: Plan innego użytkownika
```bash
# Zalogowany jako User A, próbuje dostęp do planu User B
curl -X GET "http://localhost:3000/api/plans/<user_b_plan_id>" \
  -H "Cookie: sb-access-token-user-a=..." \
  -v

# Oczekiwane: 404 Not Found (RLS ukrywa)
# { "error": "Plan not found" }
```

#### Test 5: Success case
```bash
# Własny plan, prawidłowa sesja
curl -X GET "http://localhost:3000/api/plans/1" \
  -H "Cookie: sb-access-token=..." \
  -v | jq .

# Oczekiwane: 200 OK
# {
#   "data": {
#     "id": 1,
#     "user_id": "...",
#     "state": "active",
#     "start_date": "2024-01-15",
#     "end_date": "2024-01-21",
#     "days": [...]
#   }
# }
```

#### Test 6: Weryfikacja struktury odpowiedzi
**Checklist**:
- ✅ Plan ma wszystkie pola (`id`, `user_id`, `state`, `start_date`, `end_date`, timestamps)
- ✅ `days` jest tablicą
- ✅ Każdy day ma `meals` i `slot_targets`
- ✅ Każdy meal ma zagnieżdżony `recipe`
- ✅ `recipe.available_slots` jest tablicą slotów
- ✅ `time_minutes` jest sumą `prep_minutes + cook_minutes`
- ✅ Posiłki wieloporcjowe mają `multi_portion_group_id` i `portions_to_cook`
- ✅ Resztki mają `is_leftover: true` i `portions_to_cook: null`

#### Test 7: Performance test
```bash
# Pomiar czasu odpowiedzi
time curl -X GET "http://localhost:3000/api/plans/1" \
  -H "Cookie: sb-access-token=..." \
  -o /dev/null \
  -s \
  -w "\nTime: %{time_total}s\n"

# Oczekiwane: < 0.5s dla planu 7-dniowego
```

---

### Faza 6: Dokumentacja i finalizacja

#### Aktualizacja API_TESTING.md
Dodać sekcję dla `GET /api/plans/{id}`:
```markdown
## GET /api/plans/{id} - Plan Details Endpoint

### Test Case 1: Fetch Existing Plan (Success - 200)
[Przykłady curl...]

### Test Case 2: Invalid Plan ID (Bad Request - 400)
[...]

### Test Case 3: Unauthorized (401)
[...]

### Test Case 4: Plan Not Found (404)
[...]
```

#### Aktualizacja CURL_EXAMPLES.md (jeśli istnieje)
Dodać przykład użycia z autentykacją.

#### Code review checklist
- [ ] Walidacja Zod działa poprawnie
- [ ] RLS polityki są aktywne
- [ ] Service zwraca poprawną strukturę DTO
- [ ] Endpoint obsługuje wszystkie kody błędów
- [ ] Logowanie błędów jest adekwatne (nie loguje PII)
- [ ] Typy TypeScript są zgodne z `src/types.ts`
- [ ] Testy manualne przechodzą
- [ ] Performance jest akceptowalne (< 500ms)

---

## 10. Checklist przed wdrożeniem

### Pre-deployment
- [ ] Migracja bazy danych została uruchomiona (schemat z db-plan.md)
- [ ] Polityki RLS są aktywne na wszystkich tabelach
- [ ] Indeksy zostały utworzone (performance)
- [ ] Middleware Astro obsługuje sesje Supabase
- [ ] Zmienne środowiskowe są ustawione (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`)

### Code quality
- [ ] Walidacja Zod działa dla edge cases
- [ ] Service method ma poprawne typy
- [ ] Endpoint zwraca wszystkie wymagane pola DTO
- [ ] Obsługa błędów jest kompleksowa
- [ ] Logi nie zawierają wrażliwych danych

### Testing
- [ ] Test: Invalid ID → 400
- [ ] Test: No session → 401
- [ ] Test: Other user's plan → 404
- [ ] Test: Non-existent plan → 404
- [ ] Test: Valid plan → 200 z pełną strukturą
- [ ] Test: Multi-portion meals mają poprawne flagi
- [ ] Performance test: < 500ms dla 7-dniowego planu

### Documentation
- [ ] API_TESTING.md zaktualizowana
- [ ] Inline comments w kodzie (szczególnie logika transformacji)
- [ ] Types w `src/types.ts` są aktualne

### Security review
- [ ] RLS weryfikacja (nie można pobrać cudzych planów)
- [ ] SQL injection protection (Supabase parameterized queries)
- [ ] Error messages nie wyciekają szczegółów implementacji
- [ ] Rate limiting rozważone (opcjonalne dla MVP)

---

## 11. Potencjalne rozszerzenia (post-MVP)

### Filtrowanie dni
**Parametr query**: `?start_date=2024-01-15&end_date=2024-01-17`

**Use case**: Pobranie tylko kilku dni zamiast całego planu (performance).

**Implementacja**:
```typescript
const { start_date, end_date } = context.url.searchParams

let query = supabase.from('plan_days').select('*').eq('plan_id', planId)

if (start_date) query = query.gte('date', start_date)
if (end_date) query = query.lte('date', end_date)
```

### Paginacja dni
**Parametr query**: `?page=1&per_page=7`

**Use case**: Mobile app z infinite scroll.

### Sparse fields
**Parametr query**: `?fields=days.meals.recipe`

**Use case**: Pobierz tylko potrzebne dane (zmniejszenie payloadu).

### Real-time updates
**Technologia**: Supabase Realtime

**Use case**: Jeśli użytkownik ma plan otwarty na dwóch urządzeniach, zmiany na jednym są widoczne na drugim.

**Implementacja** (frontend):
```typescript
const subscription = supabase
  .channel('plan_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'plan_meals',
    filter: `plan_id=eq.${planId}`
  }, (payload) => {
    // Aktualizuj UI
  })
  .subscribe()
```

### ETags / Conditional requests
**Header**: `If-None-Match: "hash-of-plan"`

**Response**: `304 Not Modified` jeśli plan się nie zmienił.

**Use case**: Oszczędność bandwidth.

---

## 12. Podsumowanie

Endpoint `GET /api/plans/{id}` jest kluczowym elementem aplikacji, umożliwiającym użytkownikom przeglądanie swoich planów żywieniowych z pełnymi szczegółami posiłków i przepisów.

**Kluczowe aspekty**:
1. ✅ **Bezpieczeństwo**: RLS + sesje Supabase
2. ✅ **Wydajność**: Denormalizacja + indeksy + efektywne JOIN
3. ✅ **Walidacja**: Zod schema dla parametrów
4. ✅ **Obsługa błędów**: Wszystkie edge cases obsłużone
5. ✅ **Zgodność z PRD**: Obsługa multi-portion meals i leftovers

**Następne kroki**:
Po wdrożeniu tego endpointa, użytkownicy będą mogli:
- Przeglądać swoje plany w widoku dziennym (dashboard)
- Zobaczyć wizualne oznaczenia dla posiłków wieloporcjowych
- Kliknąć w przepis i przejść do Cookido
- Przygotować się do implementacji funkcji wymiany posiłków (`POST /api/plan-meals/{id}/swap`)

**Czas implementacji** (szacunkowy):
- Faza 1-2 (Schema + Service): 2-3h
- Faza 3 (Endpoint): 1h
- Faza 4-5 (Weryfikacja + Testy): 2h
- Faza 6 (Docs): 30min
- **Total**: ~6 godzin dla doświadczonego developera

---

**Dokument przygotowany**: 2025-10-23  
**Status**: Gotowy do implementacji  
**Priorytet**: Wysoki (blocking dla dashboard UI)




