# API Endpoint Implementation Plan: GET /api/plans/{id} (v2 Schema)

**Updated**: 2025-10-20
**Schema Version**: v2 (Multi-portion meal support with portions_to_cook)

---

## 1. Przegląd punktu końcowego

**Cel**: Pobrać kompletne szczegóły planu żywieniowego dla konkretnego użytkownika, w tym wszystkie dni, posiłki, przepisy i parametry multi-portion meal support (v2).

**Kontekst biznesowy**:
- Użytkownik chce wyświetlić wcześniej wygenerowany plan z pełnymi szczegółami
- Obejmuje zagnieżdżone struktury: dni → posiłki → przepisy
- **v2 ZMIANA**: Zwraca `portions_to_cook` (ile porcji gotować) i rozróżnia dzień gotowania vs resztki
- Wymagana autoryzacja na poziomie użytkownika (każdy widzi tylko swoje plany)

**Funkcjonalność**:
- Pobiera plan wraz ze wszystkimi powiązanymi danymi
- Zwraca celki kalorii na poszczególne sloty posiłków
- Zwraca szczegóły przepisów dla każdego posiłku
- **v2 NEW**: Zwraca `portions_to_cook` dla każdego posiłku
- **v2 NEW**: Pokazuje multi-portion grupy (via `multi_portion_group_id`)
- Obsługuje skalowanie w pionie (zagnieżdżone zasoby)

---

## 2. Szczegóły żądania

### Metoda HTTP i Route
- **Metoda**: GET
- **Route**: `/api/plans/{id}`
- **Handler**: `src/pages/api/plans/[id].ts`

### Parametry
- **URL Parameter (wymagany)**:
    - `id` (string → number): ID planu do pobrania
    - Typ: BIGINT (w bazie danych)
    - Walidacja: musi być dodatnią liczbą całkowitą

- **Parametry opcjonalne**: Brak

- **Query String**: Brak

### Request Headers
- `Authorization`: Bearer token (obsługiwany przez middleware)
- `Content-Type`: Nie wymagany (GET request)

### Request Body
Brak (GET request)

---

## 3. Wykorzystywane typy

### Response DTOs (v2 Updated)

```typescript
// Main response - wrapped format
{
  "data": PlanDetailsResponse
}

// PlanDetailsResponse (z types.ts)
type PlanDetailsResponse = PlanDTO & {
  days: PlanDayResponse[]
}

// PlanDTO - podstawowe pola planu
type PlanDTO = {
  id: number
  user_id: string
  state: Enums<'plan_state'>  // 'active' | 'archived' | 'draft'
  start_date: string          // ISO date
  end_date: string            // ISO date
  created_at: string          // ISO timestamp
  updated_at: string          // ISO timestamp
}

// PlanDayResponse - dzień z posiłkami i celami
type PlanDayResponse = {
  id: number
  plan_id: number
  date: string                // ISO date
  meals: MealResponse[]
  slot_targets: SlotTargetResponse[]
}

// 🔄 UPDATED for v2 semantics
type MealResponse = {
  id: number
  slot: Enums<'meal_slot'>           // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  status: Enums<'meal_status'>       // 'planned' | 'cooked' | 'eaten' | 'skipped'
  calories_planned: number
  portion_multiplier: number         // 🔄 Now: actual portions to eat (e.g., 2.4, 3.0)
  portions_to_cook: number | null    // 🆕 NEW: Set for day 1 (cooking), NULL for day 2 (leftovers)
  multi_portion_group_id: string | null  // Groups consecutive days for leftovers
  is_leftover: boolean               // true = day 2 (leftovers), false = day 1 (cooking)
  recipe: RecipeInMealResponse
}

// RecipeInMealResponse - subset danych przepisu w posiłku
type RecipeInMealResponse = {
  id: number
  name: string
  image_url: string | null
  time_minutes: number | null
  source_url: string | null
  available_slots: Enums<'meal_slot'>[]
}

// SlotTargetResponse - cel kalorii dla slotu
type SlotTargetResponse = {
  slot: Enums<'meal_slot'>
  calories_target: number
}
```

### Input Validation Schemas

```typescript
// Zod schema dla walidacji ID (w src/lib/schemas/plan.ts)
export const getPlanIdSchema = z.object({
  id: z.string().transform(Number).pipe(
    z.number().int().positive('Plan ID must be a positive integer')
  )
})

type GetPlanIdInput = z.infer<typeof getPlanIdSchema>
```

---

## 4. Szczegóły odpowiedzi

### Struktura odpowiedzi (200 OK) — v2 Updated

```json
{
  "data": {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "state": "active",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "days": [
      {
        "id": 1,
        "plan_id": 1,
        "date": "2024-01-15",
        "meals": [
          {
            "id": 101,
            "slot": "breakfast",
            "status": "planned",
            "calories_planned": 400,
            "portion_multiplier": 1.0,
            "portions_to_cook": 4,
            "multi_portion_group_id": null,
            "is_leftover": false,
            "recipe": {
              "id": 42,
              "name": "Healthy Breakfast Bowl",
              "image_url": "https://example.com/image.jpg",
              "time_minutes": 15,
              "source_url": "https://cookido.com/recipe/123",
              "available_slots": ["breakfast", "lunch"]
            }
          },
          {
            "id": 102,
            "slot": "lunch",
            "status": "planned",
            "calories_planned": 600,
            "portion_multiplier": 2.4,
            "portions_to_cook": 6,
            "multi_portion_group_id": "550e8400-e29b-41d4-a716-446655440001",
            "is_leftover": false,
            "recipe": {
              "id": 200,
              "name": "Gulasz (6-porcyjny)",
              "image_url": "https://example.com/gulasz.jpg",
              "time_minutes": 45,
              "source_url": "https://cookido.com/recipe/200",
              "available_slots": ["lunch", "dinner"]
            }
          },
          {
            "id": 103,
            "slot": "dinner",
            "status": "planned",
            "calories_planned": 600,
            "portion_multiplier": 2.4,
            "portions_to_cook": 6,
            "multi_portion_group_id": "550e8400-e29b-41d4-a716-446655440002",
            "is_leftover": false,
            "recipe": {
              "id": 201,
              "name": "Pizza (6-porcyjne)",
              "image_url": "https://example.com/pizza.jpg",
              "time_minutes": 30,
              "source_url": "https://cookido.com/recipe/201",
              "available_slots": ["lunch", "dinner"]
            }
          },
          {
            "id": 104,
            "slot": "snack",
            "status": "planned",
            "calories_planned": 400,
            "portion_multiplier": 1.0,
            "portions_to_cook": 1,
            "multi_portion_group_id": null,
            "is_leftover": false,
            "recipe": {
              "id": 333,
              "name": "Jogurt",
              "image_url": "https://example.com/jogurt.jpg",
              "time_minutes": 0,
              "source_url": "https://cookido.com/recipe/333",
              "available_slots": ["snack"]
            }
          }
        ],
        "slot_targets": [
          {
            "slot": "breakfast",
            "calories_target": 400
          },
          {
            "slot": "lunch",
            "calories_target": 600
          },
          {
            "slot": "dinner",
            "calories_target": 600
          },
          {
            "slot": "snack",
            "calories_target": 400
          }
        ]
      },
      {
        "id": 2,
        "plan_id": 1,
        "date": "2024-01-16",
        "meals": [
          {
            "id": 105,
            "slot": "breakfast",
            "status": "planned",
            "calories_planned": 400,
            "portion_multiplier": 1.0,
            "portions_to_cook": 3,
            "multi_portion_group_id": null,
            "is_leftover": false,
            "recipe": {
              "id": 43,
              "name": "Omelet",
              "image_url": "https://example.com/omelet.jpg",
              "time_minutes": 10,
              "source_url": "https://cookido.com/recipe/43",
              "available_slots": ["breakfast", "lunch"]
            }
          },
          {
            "id": 106,
            "slot": "lunch",
            "status": "planned",
            "calories_planned": 600,
            "portion_multiplier": 2.4,
            "portions_to_cook": null,
            "multi_portion_group_id": "550e8400-e29b-41d4-a716-446655440001",
            "is_leftover": true,
            "recipe": {
              "id": 200,
              "name": "Gulasz (6-porcyjny)",
              "image_url": "https://example.com/gulasz.jpg",
              "time_minutes": 45,
              "source_url": "https://cookido.com/recipe/200",
              "available_slots": ["lunch", "dinner"]
            }
          },
          {
            "id": 107,
            "slot": "dinner",
            "status": "planned",
            "calories_planned": 600,
            "portion_multiplier": 2.4,
            "portions_to_cook": null,
            "multi_portion_group_id": "550e8400-e29b-41d4-a716-446655440002",
            "is_leftover": true,
            "recipe": {
              "id": 201,
              "name": "Pizza (6-porcyjne)",
              "image_url": "https://example.com/pizza.jpg",
              "time_minutes": 30,
              "source_url": "https://cookido.com/recipe/201",
              "available_slots": ["lunch", "dinner"]
            }
          },
          {
            "id": 108,
            "slot": "snack",
            "status": "planned",
            "calories_planned": 400,
            "portion_multiplier": 1.0,
            "portions_to_cook": 1,
            "multi_portion_group_id": null,
            "is_leftover": false,
            "recipe": {
              "id": 334,
              "name": "Banan",
              "image_url": "https://example.com/banan.jpg",
              "time_minutes": 0,
              "source_url": "https://cookido.com/recipe/334",
              "available_slots": ["snack"]
            }
          }
        ],
        "slot_targets": [
          {
            "slot": "breakfast",
            "calories_target": 400
          },
          {
            "slot": "lunch",
            "calories_target": 600
          },
          {
            "slot": "dinner",
            "calories_target": 600
          },
          {
            "slot": "snack",
            "calories_target": 400
          }
        ]
      }
    ]
  }
}
```

**Wyjaśnienie v2 semantyki** w przykładzie:
- **Day 1 (2024-01-15) Lunch** (ID 102):
    - `portion_multiplier: 2.4` → Zjedz 2.4 porcje
    - `portions_to_cook: 6` → Przepis ma 6 porcji, gotuj całość
    - `is_leftover: false` → To dzień gotowania
    - `multi_portion_group_id: ...` → Grupa multi-portion

- **Day 2 (2024-01-16) Lunch** (ID 106):
    - `portion_multiplier: 2.4` → **IDENTICAL** as Day 1
    - `portions_to_cook: null` → Nie gotuj! Resztki
    - `is_leftover: true` → To dzień restek
    - `multi_portion_group_id: ...` → **SAME group** as Day 1

### Kody statusu i odpowiedzi błędów

| Kod | Scenariusz | Odpowiedź |
|-----|-----------|----------|
| **200** | Plan znaleziony i autoryzowany | Pełne dane planu z zagnieżdżonymi danymi (v2 updated) |
| **400** | Nieprawidłowy format ID | `{"error": "Invalid plan ID"}` |
| **401** | Brak autoryzacji (brak tokenu) | `{"error": "Unauthorized"}` |
| **403** | Plan należy do innego użytkownika | `{"error": "Access denied"}` |
| **404** | Plan nie istnieje | `{"error": "Plan not found"}` |
| **500** | Błąd bazy danych | `{"error": "Internal server error"}` |

---

## 5. Przepływ danych (v2 Updated)

### Architektura zapytań

```
┌─────────────────────────────────────────┐
│ GET /api/plans/{id}                     │
│ Headers: Authorization: Bearer <token>  │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌─────────────────┐
        │ Middleware      │
        │ Ekstraktuj:     │
        │ - user_id       │
        │ - session       │
        └────────┬────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Walidacja ID (Zod)   │
        │ Parsuj: string → int │
        │ Sprawdź: > 0         │
        └────────┬─────────────┘
                 │
                 ▼
        ┌───────────────────────────────┐
        │ plans.service                 │
        │ .getPlanDetailsWithMeals()    │
        │ (v2: includes portions_to_cook)
        └────────┬──────────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
  Query 1     Query 2     Query 3
  plans       plan_days   (dla każdego dnia)
  WHERE       WHERE        - plan_day_slot_targets
    id        plan_id      - plan_meals (JOIN recipes)
    user_id   (autoryzacja)
                           🆕 including portions_to_cook
     │           │           │
     └───────────┼───────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Transformuj do DTO   │
        │ (v2: map portions_to_cook)
        │ PlanDetailsResponse  │
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Return 200 OK        │
        │ { data: ... }        │
        └──────────────────────┘
```

### Szczegółowe kroki dostępu do danych

**Krok 1: Pobranie głównego planu**
```sql
SELECT id, user_id, state, start_date, end_date, created_at, updated_at
FROM plans
WHERE id = $1 AND user_id = $2
```
- **$1**: plan ID (z URL)
- **$2**: authenticated user ID (z kontekstu)
- **Cel autoryzacji**: Upewnij się, że plan należy do bieżącego użytkownika

**Krok 2: Pobranie dni planu**
```sql
SELECT id, plan_id, date, created_at, updated_at
FROM plan_days
WHERE plan_id = $1
ORDER BY date ASC
```
- **$1**: plan ID
- **Zakres**: Wszystkie dni od start_date do end_date

**Krok 3: Dla każdego dnia - Pobranie celów slotów**
```sql
SELECT slot, calories_target
FROM plan_day_slot_targets
WHERE plan_day_id = $1
```
- **$1**: plan_day ID
- **Znormalizuj**: Slot jako enum, calories_target jako liczba

**Krok 4: Dla każdego dnia - Pobranie posiłków z przepisami (v2 Updated)**
```sql
SELECT
  pm.id, pm.slot, pm.status, pm.calories_planned,
  pm.portion_multiplier, pm.portions_to_cook,    -- 🆕 NEW
  pm.multi_portion_group_id, pm.is_leftover,
  r.id as recipe_id, r.name, r.image_url, r.time_minutes,
  r.source_url, r.available_slots
FROM plan_meals pm
JOIN recipes r ON pm.recipe_id = r.id
WHERE pm.plan_day_id = $1
ORDER BY pm.slot ASC
```
- **$1**: plan_day ID
- **Slot order**: breakfast → lunch → dinner → snack
- **🆕 KEY CHANGE**: Teraz pobieramy `pm.portions_to_cook` z bazy

### Transformacja danych (v2 Updated)

Po pobraniu surowych danych z bazy:

1. Zgrupuj posiłki po dniach
2. Mapuj każdy posiłek na `MealResponse` z:
    - `portion_multiplier` (liczba porcji do zjedzenia)
    - **`portions_to_cook`** (ile porcji gotować — recipe.portions lub NULL)
    - `is_leftover` (czy to resztki)
    - `multi_portion_group_id` (ID grupy dla multi-portion)
    - zagnieżdżonym `RecipeInMealResponse`
3. Mapuj cele na `SlotTargetResponse`
4. Utwórz strukturę `PlanDetailsResponse`
5. Zwróć w formacie: `{ data: PlanDetailsResponse }`

**Pseudo-kod transformacji**:
```typescript
const mealResponse: MealResponse = {
  id: rawMeal.id,
  slot: rawMeal.slot,
  status: rawMeal.status,
  calories_planned: rawMeal.calories_planned,
  portion_multiplier: rawMeal.portion_multiplier,
  portions_to_cook: rawMeal.portions_to_cook,  // 🆕 NEW: map from DB
  multi_portion_group_id: rawMeal.multi_portion_group_id,
  is_leftover: rawMeal.is_leftover,
  recipe: mapRecipe(rawMeal)
}
```

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie
- **Wymagane**: Middleware `/src/middleware/index.ts` musi sprawdzić ważność tokenu Supabase
- **Token Source**: Header `Authorization: Bearer <token>`
- **Supabase**: Automatycznie mapuje token na `user_id` w `context.locals`
- **Fallback**: Jeśli brak tokenu, middleware powinien zwrócić 401 Unauthorized

### Autoryzacja (RLS - Row Level Security)
- **Zasada**: Każdy użytkownik może widzieć tylko swoje plany
- **Implementacja na poziomie aplikacji**:
    - W `plans.service.getPlanDetailsWithMeals()` sprawdzić: `plan.user_id === context.user_id`
    - Zwróć 403 Forbidden, jeśli nie pasuje
- **Implementacja na poziomie bazy (RLS)**:
    - Tabela `plans` powinna mieć politykę: `user_id = auth.uid()`
    - Działamy ponad RLS, ale dodatkowy check zapewnia defense-in-depth

### Walidacja danych wejściowych
- **URL Parameter**: Zod schema - konwersja string → number, sprawdzenie dodatności
- **Typ**: Musi być integer (bez wartości zmiennoprzecinkowych)
- **Zakres**: Brak górnego limitu (relies on BIGINT limit)

### Bezpieczeństwo treści odpowiedzi
- **DTO Structure**: `RecipeInMealResponse` zawiera tylko publiczne pola przepisu
- **Unikaj**: Wewnętrznych ID użytkowników, hash hasła, token API
- **PII**: Brak PII w odpowiedzi (plan_meals zawiera tylko metryki publiczne)
- **v2 Safety**: `portions_to_cook` to publiczna metrika, bezpieczna do ujawnienia

### Ochrona przed atakami

| Atak | Mitygacja |
|------|-----------|
| **SQL Injection** | Supabase SDK używa prepared statements; brak raw SQL |
| **Unauthorized Access** | RLS + app-level `user_id` check |
| **Parameter Tampering** | Zod walidacja ID; parsing bezpieczny |
| **DoS (large response)** | Limit liczby dni (np. max 365 dni na plan) - optional paging w przyszłości |
| **Information Disclosure** | DTO structure controls output fields |

---

## 7. Obsługa błędów

### Strategie obsługi błędów (v2)

#### Early Return Pattern
Obsługuj błędy na początku funkcji, używając guard clauses:

```typescript
export async function GET({ params, locals }: APIContext) {
  // Sprawdzenie autoryzacji (Early Return)
  if (!locals.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Walidacja parametrów (Early Return)
  const { id: planIdRaw } = params
  if (!planIdRaw || isNaN(Number(planIdRaw))) {
    return new Response(
      JSON.stringify({ error: "Invalid plan ID" }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  const planId = Number(planIdRaw)

  // Reszta logiki...
}
```

### Mapa błędów i odpowiadające im odpowiedzi

| Błąd | Kod | Przyczyna | Odpowiedź |
|------|-----|----------|----------|
| **AuthenticationError** | 401 | Brak tokenu lub token nieważny | `{"error": "Unauthorized"}` |
| **AuthorizationError** | 403 | Plan należy do innego użytkownika | `{"error": "Access denied"}` |
| **ValidationError** | 400 | ID nie jest liczbą | `{"error": "Invalid plan ID"}` |
| **NotFoundError** | 404 | Plan nie istnieje | `{"error": "Plan not found"}` |
| **DatabaseError** | 500 | Błąd połączenia/query | `{"error": "Internal server error"}` |
| **UnexpectedError** | 500 | Nienoczekiwany wyjątek | `{"error": "Internal server error"}` |

### Logowanie błędów
- **Gdzie**: Centralny `src/lib/errors.ts` lub serwis
- **Co logować**:
    - Typ błędu (AuthorizationError, DatabaseError, etc.)
    - User ID (dla kontekstu)
    - Plan ID
    - Error message i stack trace (dla 5xx)
- **Poziom**:
    - `warn`: 4xx błędy (validation, auth)
    - `error`: 5xx błędy (database, unexpected)
- **Nie logować**: Tokeny, hasła, wrażliwe PII

### Obsługa scenariuszy edge case (v2 Updated)

| Scenariusz | Obsługa |
|-----------|---------|
| Plan ma 0 dni | Zwróć pusty array `days: []` |
| Dzień ma 0 posiłków | Zwróć pusty array `meals: []` |
| Dzień ma 0 celów slotów | Zwróć pusty array `slot_targets: []` |
| `portions_to_cook` = NULL | Normalne — resztki (is_leftover=TRUE) |
| Przepis dla posiłku usunięty (orphaned meal) | Zwróć 500 (data integrity error) - should not happen with FK |
| Multi-portion grupa z różnymi multipliers | Zwróć 500 (constraint violation) — wyzwalacz powinien to zabezpieczyć |
| Nieoczekiwana struktura danych | Zwróć 500 i zaloguj (warning sign) |

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

#### 1. N+1 Query Problem
**Wąskie gardło**: Pobranie głównego planu, potem dla każdego dnia osobne query na posiłki
**Rozwiązanie**:
- Jedno JOIN zapytanie: `plan_meals JOIN recipes` dla wszystkich dni naraz
- Grupowanie w aplikacji (JavaScript) zamiast wielu queries

```typescript
// Efektywnie: Jedno query dla wszystkich posiłków z wszystkich dni
const meals = await supabase
  .from('plan_meals')
  .select('*, recipes(*)')
  .in('plan_day_id', dayIds)  // All days at once
```

#### 2. Pobranie dużych struktur
**Wąskie gardło**: Plan na 1 rok (365 dni) z 3 posiłkami na dzień = 1095 posiłków
**Rozwiązanie**:
- Dla MVP: Zaakceptuj (typowe plany ~7-30 dni)
- Dla przyszłości: Implementuj paging w query string: `?from_date=2024-01-15&to_date=2024-01-21`

#### 3. Brakujące indeksy
**Wąskie gardło**: Bazy danych bez indeksów na FK
**Rozwiązanie**: Zapewnij indeksy w migracjach:
```sql
CREATE INDEX idx_plan_days_plan_id ON plan_days(plan_id);
CREATE INDEX idx_plan_day_slot_targets_plan_day_id ON plan_day_slot_targets(plan_day_id);
CREATE INDEX idx_plan_meals_plan_day_id ON plan_meals(plan_day_id);
```

### Strategia optymalizacji

**Faza 1 (MVP)**:
- Jedno zagnieżdżone query z JOINami zamiast wielu oddzielnych
- Limit na długość planu (np. max 365 dni)
- In-memory grouping i transformacja

**Faza 2 (Po MVP)**:
- Dodaj paging: `/api/plans/{id}?from_date=2024-01-15&to_date=2024-01-21`
- Cache popularne plany (Redis) - dla authenticated users cache is safe
- Optimize selected columns - nie pobieraj `created_at`, `updated_at` jeśli nie potrzebne

**Faza 3 (Skalowanie)**:
- GraphQL fragment-based fetching
- Materialized views dla zagnieżdżonych struktur
- CDN cache na poziomie klienta

### Metryki do monitorowania
- Query time (target < 200ms dla typowego planu)
- Response size (target < 500KB dla 30-dniowego planu)
- Cache hit rate (jeśli wdrożysz cache)
- 95th percentile latency

---

## 9. Etapy wdrożenia (v2 Updated)

### Etap 1: Przygotowanie infrastruktury

1. **Aktualizacja schematów walidacji** (`src/lib/schemas/plan.ts`)
    - Dodaj lub zaktualizuj Zod schema: `getPlanIdSchema`
    - Waliduj ID jako dodatnią liczbę całkowitą
    - Testuj edge cases (0, -1, string, float)

2. **Przegląd typów** (`src/types.ts` — zupdate dla v2)
    - Weryfikuj: `PlanDetailsResponse`, `PlanDayResponse`, `MealResponse`
    - **🆕 WAŻNE**: Dodaj `portions_to_cook: number | null` do `MealResponse`
    - Upewnij się, że nazwy pól pasują do bazy danych

3. **Przegląd struktury bazy** (`supabase/migrations/`)
    - Weryfikuj: constraints, FK relationships
    - Dodaj indeksy (jeśli brakują):
        - `idx_plan_days_plan_id`
        - `idx_plan_day_slot_targets_plan_day_id`
        - `idx_plan_meals_plan_day_id`
    - **🆕 VERIFY**: plan_meals tabela ma kolumny v2:
        - `portions_to_cook INTEGER NULL`
        - `is_leftover BOOLEAN`

### Etap 2: Implementacja logiki serwisu (v2 Updated)

4. **Rozszerzenie `src/lib/services/plans.service.ts`**
    - Dodaj lub zaktualizuj metodę: `getPlanDetailsWithMeals(planId: number, userId: string)`
    - Logika:
      ```
      a) Query: SELECT plan WHERE id = planId AND user_id = userId
      b) Jeśli nie znaleziono: return null
      c) Query: SELECT plan_days WHERE plan_id = planId ORDER BY date
      d) Query: SELECT plan_day_slot_targets WHERE plan_day_id IN (dayIds)
      e) Query: SELECT plan_meals JOIN recipes WHERE plan_day_id IN (dayIds)
         🆕 IMPORTANT: Include portions_to_cook column
      f) Transformuj do PlanDetailsResponse (v2: map portions_to_cook)
      g) Return plan details
      ```
    - Error handling:
        - Rzuć `NotFoundError` jeśli plan nie istnieje
        - Rzuć `AuthorizationError` jeśli `plan.user_id !== userId`
        - Rzuć `DatabaseError` na SQL errors

5. **Dodaj/Zaktualizuj helper do transformacji** (w `plans.service.ts` lub `utils.ts`)
    - Funkcja: `transformToPlanDetailsResponse(rawData)`
    - Mapuj: surowe dane z bazy → strukturę PlanDetailsResponse
    - **🆕 IMPORTANT**: Mapuj `portions_to_cook` z bazy na DTO
    - Obsługuj null/undefined wartości dla `portions_to_cook`

6. **Pseudo-kod transformacji v2**:
```typescript
const mealResponseV2 = meals.map(meal => ({
  id: meal.id,
  slot: meal.slot,
  status: meal.status,
  calories_planned: meal.calories_planned,
  portion_multiplier: meal.portion_multiplier,
  portions_to_cook: meal.portions_to_cook,  // 🆕 NEW: map directly from DB
  multi_portion_group_id: meal.multi_portion_group_id,
  is_leftover: meal.is_leftover,
  recipe: {
    id: meal.recipes.id,
    name: meal.recipes.name,
    image_url: meal.recipes.image_url,
    time_minutes: meal.recipes.time_minutes,
    source_url: meal.recipes.source_url,
    available_slots: meal.recipes.available_slots
  }
}))
```

### Etap 3: Implementacja endpointu API (v2 Updated)

7. **Utwórz/Zaktualizuj endpoint** (`src/pages/api/plans/[id].ts`)
    - Handler: `export const GET: APIRoute = async ({ params, locals }) => { ... }`
    - Struktura:
      ```typescript
      // 1. Sprawdzenie autoryzacji
      if (!locals.user) return new Response(..., { status: 401 })
 
      // 2. Walidacja parametrów
      const validation = getPlanIdSchema.safeParse({ id: params.id })
      if (!validation.success) return new Response(..., { status: 400 })
 
      // 3. Pobranie danych (v2: includes portions_to_cook)
      try {
        const plan = await plansService.getPlanDetailsWithMeals(
          validation.data.id,
          locals.user.id
        )
      } catch (error) {
        if (error instanceof NotFoundError) return 404
        if (error instanceof AuthorizationError) return 403
        return 500
      }
 
      // 4. Zwrot odpowiedzi
      return new Response(JSON.stringify({ data: plan }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      ```

8. **Dodaj prerender = false**
   ```typescript
   export const prerender = false
   ```

### Etap 4: Testowanie (v2 Updated)

9. **Testy jednostkowe** (`src/lib/services/plans.service.test.ts`)
    - Test: `getPlanDetailsWithMeals` zwraca poprawną strukturę (z portions_to_cook)
    - Test: `portions_to_cook` jest mapowany z bazy
    - Test: Multi-portion grupy mają identyczne portion_multiplier
    - Test: Rzuca `NotFoundError` gdy plan nie istnieje
    - Test: Rzuca `AuthorizationError` dla cudzych planów
    - Test: Transformacja mapuje fields prawidłowo

10. **Testy integracyjne** (curl/QUICK_TEST_REFERENCE.md)
    - Test 401: Brak Authorization headera
    - Test 400: Nieprawidłowy format ID (`abc`, `0`, `-1`)
    - Test 403: Plan należy do innego użytkownika
    - Test 404: ID nie istnieje
    - Test 200: Prawidłowy plan zwraca zagnieżdżone dane (v2)
    - Test: Sprawdzenie struktury odpowiedzi (format JSON, typy pól)
    - **🆕 Test v2**: Sprawdzenie `portions_to_cook` w odpowiedzi
    - **🆕 Test v2**: Sprawdzenie multi-portion grupy (identyczne multipliers, różne portions_to_cook)

11. **Testy wydajności** (dla planów o różnych rozmiarach)
    - Zmierz czas dla: planu 7-dniowego, 30-dniowego, 100-dniowego
    - Weryfikuj response size
    - Sprawdź pod kątem N+1 queries (używając Supabase Studio)
    - Weryfikuj że portions_to_cook jest pobierany (nie NULL dla wszystkich)

### Etap 5: Dokumentacja i wdrożenie

12. **Aktualizacja dokumentacji API**
    - Dodaj do API_TESTING.md lub QUICK_TEST_REFERENCE.md
    - Przykład curl:
      ```bash
      curl -X GET https://yourapp.com/api/plans/1 \
        -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json"
      ```
    - **🆕 v2**: Wyjaśnij pola `portions_to_cook`, `is_leftover`, multi-portion grupy

13. **Code review i merge**
    - PR powinien zawierać:
        - Service method z error handling (v2 updated)
        - API endpoint handler
        - Zod schemas
        - Testy (unit + integration)
        - Dokumentacja zmian
        - **🆕**: Objaśnienie v2 semantyki

14. **Wdrożenie**
    - Merge do main
    - Deploy (Vercel/DigitalOcean)
    - Monitoruj logi błędów w pierwsze 24h
    - Sprawdź czy portions_to_cook są zwracane w odpowiedziach

---

## 10. Checklist do zatwierdzenia (v2 Updated)

- [ ] Zod schema dla walidacji ID napisana i przetestowana
- [ ] Service method `getPlanDetailsWithMeals` implementowana z error handling (v2)
- [ ] **Helper transformacji danych do `PlanDetailsResponse` (v2: map portions_to_cook)**
- [ ] **MealResponse DTO zawiera `portions_to_cook: number | null`**
- [ ] API endpoint handler w `[id].ts` ze wszystkimi códami błędów
- [ ] Early returns dla błędów (guard clauses)
- [ ] **SQL query pobiera `pm.portions_to_cook` z bazy**
- [ ] Testy jednostkowe i integracyjne (w tym v2 semantyki)
- [ ] **Testy sprawdzające portions_to_cook w odpowiedzi**
- [ ] **Testy sprawdzające multi-portion grupy (identical multipliers)**
- [ ] Dokumentacja curl examples (z v2 wyjaśnieniami)
- [ ] RLS polityki zweryfikowane w Supabase
- [ ] Indeksy bazy danych (jeśli brakują)
- [ ] Performance baseline zmierzony
- [ ] Code review approval
- [ ] Monitoring/alerting gotowy

---

## 11. v2 Schema Reference

### plan_meals table (v2)
- `id` BIGSERIAL PRIMARY KEY
- `plan_day_id` BIGINT (FK to plan_days)
- `recipe_id` BIGINT (FK to recipes)
- `slot` meal_slot ENUM
- `status` meal_status DEFAULT 'planned'
- `calories_planned` INTEGER
- `portion_multiplier` NUMERIC(8,1) ← Liczba porcji (not fraction!)
- **`portions_to_cook` INTEGER NULL** ← NEW in v2
- **`is_leftover` BOOLEAN DEFAULT FALSE** ← NEW in v2
- `multi_portion_group_id` UUID NULL

### Multi-Portion Example (v2 Data)

**Query**:
```sql
SELECT
    pm.id,
    pm.plan_day_id,
    pd.date,
    pm.slot,
    pm.portion_multiplier,
    pm.portions_to_cook,
    pm.is_leftover,
    pm.multi_portion_group_id,
    r.name as recipe_name,
    r.portions as recipe_portions
FROM plan_meals pm
         JOIN plan_days pd ON pm.plan_day_id = pd.id
         JOIN recipes r ON pm.recipe_id = r.id
WHERE pm.multi_portion_group_id IS NOT NULL
ORDER BY pm.multi_portion_group_id, pd.date;
```

**Expected Result** (multi-portion pair):
```
Day 1 Lunch:
├─ portion_multiplier: 2.4
├─ portions_to_cook: 6 ← Cook the full 6-portion recipe
├─ is_leftover: FALSE
└─ multi_portion_group_id: uuid-123

Day 2 Lunch:
├─ portion_multiplier: 2.4 ← IDENTICAL!
├─ portions_to_cook: NULL ← Don't cook, use leftovers
├─ is_leftover: TRUE
└─ multi_portion_group_id: uuid-123 ← SAME group
```

---

## 12. Appendix: Field Explanations (v2)

### portion_multiplier (v2 Semantics)

```
DEFINITION: How many portions of the recipe to eat

EXAMPLE:
- Recipe: Gulasz (6 portions, 250 kcal per portion)
- Target calories: 600 kcal
- portion_multiplier = 600 / 250 = 2.4

INTERPRETATION: "Eat 2.4 portions of this 6-portion recipe"
- Total calories: 250 × 2.4 = 600 kcal ✓

MULTI-PORTION PAIR:
- Day 1 (cooking): portion_multiplier = 2.4 (same)
- Day 2 (leftovers): portion_multiplier = 2.4 (IDENTICAL!)
- This ensures you eat the same amount both days
```

### portions_to_cook (v2 NEW)

```
DEFINITION: How many portions to prepare (cook today)

VALUES:
- If is_leftover = FALSE (cooking day): portions_to_cook = recipe.portions
  → "Cook the entire recipe today"

- If is_leftover = TRUE (leftovers day): portions_to_cook = NULL
  → "Don't cook, use leftovers from yesterday"

EXAMPLE:
- Day 1 (dinner): portions_to_cook = 6 → "Cook the 6-portion gulasz"
- Day 2 (lunch): portions_to_cook = NULL → "Use yesterday's leftover gulasz"

UI INTERPRETATION:
- portions_to_cook NOT NULL → Show "Cook {portions_to_cook} portions"
- portions_to_cook IS NULL AND is_leftover = TRUE → Show "Leftovers from yesterday"
- portions_to_cook NOT NULL AND is_leftover = FALSE → Show "Cook and eat today"
```

### is_leftover (v2)

```
DEFINITION: Is this a leftover day?

VALUES:
- FALSE: First day of cooking (normal meal)
- TRUE: Second day (using leftovers from yesterday)

MULTI-PORTION PAIR:
- Day 1: is_leftover = FALSE (cooking day)
- Day 2: is_leftover = TRUE (leftovers day)

SINGLE-PORTION MEAL:
- is_leftover = FALSE (always)
```

### multi_portion_group_id (v2)

```
DEFINITION: Groups paired multi-portion meals

STRUCTURE:
- Day 1 meal: multi_portion_group_id = "uuid-abc"
- Day 2 meal: multi_portion_group_id = "uuid-abc" (SAME UUID)

SINGLE-PORTION:
- multi_portion_group_id = NULL
```

---

## 13. Validation & Quality Checklist (v2)

### Pre-Deployment Validation

- [ ] **Type Safety**: All TypeScript strict mode rules satisfied
- [ ] **Validation**: All inputs validated with Zod
- [ ] **Error Handling**: All error paths return appropriate HTTP status
- [ ] **Authentication**: Session verification implemented
- [ ] **Authorization**: User can only view own plans
- [ ] **RLS**: Database policies restrict cross-user access
- [ ] **Documentation**: Code comments explain complex logic
- [ ] **Testing**: Integration tests cover happy path and error cases
- [ ] **Performance**: Response time < 200ms for typical plan
- [ ] **Logging**: Errors logged with context for debugging
- [ ] **Security**: No SQL injection, XSS, or auth bypass vulnerabilities
- [ ] **v2 Semantics**: `portions_to_cook` is returned in response
- [ ] **Multi-Portion**: Groups shown with identical multipliers and different portions_to_cook
- [ ] **Data Integrity**: Constraints enforced (DB level via triggers)

### Code Quality Standards

- **Coverage**: > 80% test coverage for service layer
- **Linting**: Pass ESLint with zero warnings
- **Type Errors**: Zero TypeScript errors
- **Documentation**: JSDoc comments for all public functions
- **Error Messages**: User-friendly, actionable error messages

---

**Plan v ready for implementation!** ✅
