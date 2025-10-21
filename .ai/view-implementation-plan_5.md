# API Endpoint Implementation Plan: GET /api/plans/{id}

## 1. Przegląd punktu końcowego

**Cel**: Pobrać kompletne szczegóły planu żywieniowego dla konkretnego użytkownika, w tym wszystkie dni, posiłki i ich parametry.

**Kontekst biznesowy**: 
- Użytkownik chce wyświetlić wcześniej wygenerowany plan z pełnymi szczegółami
- Obejmuje zagnieżdżone struktury: dni → posiłki → przepisy
- Wymagana autoryzacja na poziomie użytkownika (każdy widzi tylko swoje plany)

**Funkcjonalność**:
- Pobiera plan wraz ze wszystkimi powiązanymi danymi
- Zwraca celki kalorii na poszczególne sloty posiłków
- Zwraca szczegóły przepisów dla każdego posiłku
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

### Response DTOs
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

// MealResponse - szczegóły posiłku
type MealResponse = {
  id: number
  slot: Enums<'meal_slot'>           // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  status: Enums<'meal_status'>       // 'planned' | 'cooked' | 'eaten' | 'skipped'
  calories_planned: number
  portion_multiplier: number         // np. 1.0, 0.5, 1.5
  multi_portion_group_id: string | null
  is_leftover: boolean
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
    z.number().int().positive()
  )
})

type GetPlanIdInput = z.infer<typeof getPlanIdSchema>
```

---

## 4. Szczegóły odpowiedzi

### Struktura odpowiedzi (200 OK)
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
            "portion_multiplier": 1.0,
            "multi_portion_group_id": null,
            "is_leftover": false,
            "recipe": {
              "id": 43,
              "name": "Mediterranean Salad",
              "image_url": "https://example.com/salad.jpg",
              "time_minutes": 10,
              "source_url": "https://cookido.com/recipe/124",
              "available_slots": ["lunch", "dinner"]
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
            "calories_target": 500
          }
        ]
      }
    ]
  }
}
```

### Kody statusu i odpowiedzi błędów

| Kod | Scenariusz | Odpowiedź |
|-----|-----------|----------|
| **200** | Plan znaleziony i autoryzowany | Pełne dane planu z zagnieżdżonymi danymi |
| **400** | Nieprawidłowy format ID | `{"error": "Invalid plan ID"}` |
| **401** | Brak autoryzacji (brak tokenu) | `{"error": "Unauthorized"}` |
| **403** | Plan należy do innego użytkownika | `{"error": "Access denied"}` |
| **404** | Plan nie istnieje | `{"error": "Plan not found"}` |
| **500** | Błąd bazy danych | `{"error": "Internal server error"}` |

---

## 5. Przepływ danych

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
     │           │           │
     └───────────┼───────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Transformuj do DTO   │
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

**Krok 4: Dla każdego dnia - Pobranie posiłków z przepisami**
```sql
SELECT 
  pm.id, pm.slot, pm.status, pm.calories_planned,
  pm.portion_multiplier, pm.multi_portion_group_id, pm.is_leftover,
  r.id as recipe_id, r.name, r.image_url, r.time_minutes, 
  r.source_url, r.available_slots
FROM plan_meals pm
JOIN recipes r ON pm.recipe_id = r.id
WHERE pm.plan_day_id = $1
ORDER BY pm.slot ASC
```
- **$1**: plan_day ID
- **Slot order**: breakfast → lunch → dinner → snack

### Transformacja danych

Po pobraniu surowych danych z bazy:
1. Zgrupuj posiłki po dniach
2. Mapuj każdy posiłek na `MealResponse` z zagnieżdżonym `RecipeInMealResponse`
3. Mapuj cele na `SlotTargetResponse`
4. Utwórz strukturę `PlanDetailsResponse`
5. Zwróć w formacie: `{ data: PlanDetailsResponse }`

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

### Ochrona przed atakami

| Atak | Mitygacja |
|------|-----------|
| **SQL Injection** | Supabase SDK używa prepared statements; brak raw SQL |
| **Unauthorized Access** | RLS + app-level `user_id` check |
| **Parameter Tampering** | Zod walidacja ID; parsing bezpieczny |
| **DoS (large response)** | Limit liczby dni (np. max 365 dni na plan) - optional paging |
| **Information Disclosure** | DTO structure controls output fields |

---

## 7. Obsługa błędów

### Strategie obsługi błędów

#### Early Return Pattern
Obsługuj błędy na początku funkcji, używając guard clauses:

```typescript
export async function GET({ params, locals }: APIContext) {
  // Sprawdzenie autoryzacji (Early Return)
  if (!locals.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 }
    )
  }

  // Walidacja parametrów (Early Return)
  const { id: planIdRaw } = params
  if (!planIdRaw || isNaN(Number(planIdRaw))) {
    return new Response(
      JSON.stringify({ error: "Invalid plan ID" }),
      { status: 400 }
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

### Obsługa scenariuszy edge case

| Scenariusz | Obsługa |
|-----------|---------|
| Plan ma 0 dni | Zwróć pusty array `days: []` |
| Dzień ma 0 posiłków | Zwróć pusty array `meals: []` |
| Dzień ma 0 celów slotów | Zwróć pusty array `slot_targets: []` |
| Przepis dla posiłku usunięty (orphaned meal) | Zwróć 500 (data integrity error) - should not happen with FK |
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
// Efektywnie: Jedno query dla wszystkich posiłków
const meals = await supabase
  .from('plan_meals')
  .select('*, recipes(*)')
  .in('plan_day_id', dayIds)
```

#### 2. Pobranie dużych struktur
**Wąskie gardło**: Plan na 1 rok (365 dni) z 3 posiłkami na dzień = 1095 posiłków
**Rozwiązanie**:
- Dla MVP: Zaakceptuj (typowe plany ~7-30 dni)
- Dla przyszłości: Implementuj paging w query string: `?page=1&limit=7`

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

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie infrastruktury

1. **Aktualizacja schematów walidacji** (`src/lib/schemas/plan.ts`)
   - Dodaj Zod schema: `getPlanIdSchema`
   - Waliduj ID jako dodatnią liczbę całkowitą
   - Testuj edge cases (0, -1, string, float)

2. **Przegląd typów** (`src/types.ts` - już istnieją)
   - Weryfikuj: `PlanDetailsResponse`, `PlanDayResponse`, `MealResponse` 
   - Upewnij się, że nazwy pól pasują do bazy danych

3. **Przegląd struktury bazy** (`supabase/migrations/`)
   - Weryfikuj: constraints, FK relationships
   - Dodaj indeksy (jeśli brakują):
     - `idx_plan_days_plan_id`
     - `idx_plan_day_slot_targets_plan_day_id`
     - `idx_plan_meals_plan_day_id`

### Etap 2: Implementacja logiki serwisu

4. **Rozszerzenie `src/lib/services/plans.service.ts`**
   - Dodaj metodę: `getPlanDetailsWithMeals(planId: number, userId: string)`
   - Logika:
     ```
     a) Query: SELECT plan WHERE id = planId AND user_id = userId
     b) Jeśli nie znaleziono: return null
     c) Query: SELECT plan_days WHERE plan_id = planId ORDER BY date
     d) Query: SELECT plan_day_slot_targets WHERE plan_day_id IN (dayIds)
     e) Query: SELECT plan_meals JOIN recipes WHERE plan_day_id IN (dayIds)
     f) Transformuj do PlanDetailsResponse
     g) Return plan details
     ```
   - Error handling:
     - Rzuć `NotFoundError` jeśli plan nie istnieje
     - Rzuć `AuthorizationError` jeśli `plan.user_id !== userId`
     - Rzuć `DatabaseError` na SQL errors

5. **Dodaj helper do transformacji** (w `plans.service.ts` lub `utils.ts`)
   - Funkcja: `transformToPlanDetailsResponse(rawData)`
   - Mapuj: surowe dane z bazy → strukturę PlanDetailsResponse
   - Obsługuj null/undefined wartości

### Etap 3: Implementacja endpointu API

6. **Utwórz/Zaktualizuj endpoint** (`src/pages/api/plans/[id].ts`)
   - Handler: `export const GET: APIRoute = async ({ params, locals }) => { ... }`
   - Struktura:
     ```typescript
     // 1. Sprawdzenie autoryzacji
     if (!locals.user) return new Response(..., { status: 401 })
     
     // 2. Walidacja parametrów
     const validation = getPlanIdSchema.safeParse({ id: params.id })
     if (!validation.success) return new Response(..., { status: 400 })
     
     // 3. Pobranie danych
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

7. **Dodaj prerender = false**
   ```typescript
   export const prerender = false
   ```

### Etap 4: Testowanie

8. **Testy jednostkowe** (`src/lib/services/plans.service.test.ts`)
   - Test: `getPlanDetailsWithMeals` zwraca poprawną strukturę
   - Test: Rzuca `NotFoundError` gdy plan nie istnieje
   - Test: Rzuca `AuthorizationError` dla cudzych planów
   - Test: Transformacja mapuje fields prawidłowo

9. **Testy integracyjne** (curl/QUICK_TEST_REFERENCE.md)
   - Test 401: Brak Authorization headera
   - Test 400: Nieprawidłowy format ID (`abc`, `0`, `-1`)
   - Test 403: Plan należy do innego użytkownika
   - Test 404: ID nie istnieje
   - Test 200: Prawidłowy plan zwraca zagnieżdżone dane
   - Test: Sprawdzenie struktury odpowiedzi (format JSON, typy pól)

10. **Testy wydajności** (dla planów o różnych rozmiarach)
    - Zmierz czas dla: planu 7-dniowego, 30-dniowego, 100-dniowego
    - Weryfikuj response size
    - Sprawdź pod kątem N+1 queries (używając Supabase Studio)

### Etap 5: Dokumentacja i wdrożenie

11. **Aktualizacja dokumentacji API**
    - Dodaj do API_TESTING.md lub QUICK_TEST_REFERENCE.md
    - Przykład curl:
      ```bash
      curl -X GET https://yourapp.com/api/plans/1 \
        -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json"
      ```

12. **Code review i merge**
    - PR powinien zawierać:
      - Service method z error handling
      - API endpoint handler
      - Zod schemas
      - Testy (unit + integration)
      - Dokumentacja zmian

13. **Wdrożenie**
    - Merge do main
    - Deploy (Vercel/DigitalOcean)
    - Monitoruj logi błędów w eerste 24h

---

## 10. Checklist do zatwierdzenia

- [ ] Zod schema dla walidacji ID napisana i przetestowana
- [ ] Service method `getPlanDetailsWithMeals` implementowana z error handling
- [ ] Helper transformacji danych do `PlanDetailsResponse` 
- [ ] API endpoint handler w `[id].ts` ze wszystkimi códami błędów
- [ ] Early returns dla błędów (guard clauses)
- [ ] Testy jednostkowe i integracyjne
- [ ] Dokumentacja curl examples
- [ ] RLS polityki zweryfikowane w Supabase
- [ ] Indeksy bazy danych (jeśli brakują)
- [ ] Performance baseline zmierzony
- [ ] Code review approval
- [ ] Monitoring/alerting gotowy
