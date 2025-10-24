# API Endpoint Implementation Plan: GET /api/plans

## 1. Przegląd punktu końcowego

**Endpoint**: `GET /api/plans`

**Cel**: Pobieranie listy planów żywieniowych dla zalogowanego użytkownika z opcjonalnym filtrowaniem po statusie oraz paginacją wyników.

**Funkcjonalność**:
- Zwraca listę planów użytkownika w formacie stronicowanym
- Umożliwia filtrowanie planów według stanu (active, archived, cancelled)
- Obsługuje paginację z konfigurowalnymi parametrami limit i offset
- Zabezpiecza dostęp poprzez uwierzytelnianie użytkownika
- Wykorzystuje Row Level Security (RLS) do autoryzacji na poziomie bazy danych

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
```
/api/plans
```

### Query Parameters

**Wszystkie parametry są opcjonalne:**

| Parametr | Typ | Domyślna wartość | Ograniczenia | Opis |
|----------|-----|------------------|--------------|------|
| `state` | string | brak | enum: 'active' \| 'archived' \| 'cancelled' | Filtruje plany według stanu |
| `limit` | number | 10 | min: 1, max: 50 | Liczba wyników na stronę |
| `offset` | number | 0 | min: 0 | Offset dla paginacji |

### Przykładowe zapytania

```
GET /api/plans
GET /api/plans?state=active
GET /api/plans?limit=20&offset=0
GET /api/plans?state=archived&limit=5&offset=10
```

### Request Body
Brak - endpoint GET nie przyjmuje body.

### Headers
- `Authorization`: Bearer token (zarządzane automatycznie przez Supabase Auth)
- `Content-Type`: application/json (dla odpowiedzi)

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

**PlanDTO** - podstawowe dane planu:
```typescript
// Z src/types.ts (linie 98-101)
type PlanDTO = Pick<
  Tables<'plans'>,
  'id' | 'user_id' | 'state' | 'start_date' | 'end_date' | 'created_at' | 'updated_at'
>
```

**PlansListResponse** - odpowiedź ze stronicowaną listą:
```typescript
// Z src/types.ts (linie 107)
type PlansListResponse = PaginatedResponse<PlanDTO>

// Rozwinięcie:
type PlansListResponse = {
  data: PlanDTO[]
  pagination: PaginationMeta
}
```

**PaginationMeta** - metadane paginacji:
```typescript
// Z src/types.ts (linie 8-13)
type PaginationMeta = {
  total: number        // Całkowita liczba wyników
  limit: number        // Liczba wyników na stronę
  offset: number       // Aktualny offset
  has_more: boolean    // Czy są kolejne strony
}
```

### Validation Schema (do utworzenia)

**GetPlansQuerySchema** - schemat walidacji Zod dla query params:
```typescript
// Do dodania w src/lib/schemas/plan.ts
const getPlansQuerySchema = z.object({
  state: z.enum(['active', 'archived', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0)
})

export type GetPlansQuery = z.infer<typeof getPlansQuerySchema>
```

### Service Function Signature (do utworzenia/aktualizacji)

```typescript
// W src/lib/services/plans.service.ts
async function getPlans(
  supabase: SupabaseClient,
  userId: string,
  filters: GetPlansQuery
): Promise<PlansListResponse>
```

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

**Struktura**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "state": "active",
      "start_date": "2024-01-15",
      "end_date": "2024-01-21",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0,
    "has_more": false
  }
}
```

**Uwagi**:
- Pusta tablica `data` jest poprawną odpowiedzią (użytkownik może nie mieć planów)
- `has_more` obliczane jako: `(offset + limit) < total`
- Daty w formacie ISO 8601

### Error Responses

#### 400 Bad Request
Nieprawidłowe parametry zapytania.

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_enum_value",
      "path": ["state"],
      "message": "Invalid enum value. Expected 'active' | 'archived' | 'cancelled'"
    }
  ]
}
```

#### 401 Unauthorized
Brak autoryzacji użytkownika.

```json
{
  "error": "Unauthorized"
}
```

#### 500 Internal Server Error
Błąd serwera (błąd bazy danych, nieoczekiwany wyjątek).

```json
{
  "error": "Internal server error"
}
```

**Uwaga**: Szczegóły błędu są logowane po stronie serwera, ale nie są zwracane w odpowiedzi ze względów bezpieczeństwa.

## 5. Przepływ danych

### Diagram przepływu

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Request: GET /api/plans?state=active&limit=20&offset=0      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Parse & Validate Query Params (Zod)                         │
│    - Validate state enum                                        │
│    - Validate limit (1-50)                                      │
│    - Validate offset (≥0)                                       │
│    - Apply defaults                                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ OK
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Authenticate User (context.locals.supabase)                 │
│    - Get user from session                                      │
│    - Extract user_id                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Authenticated
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Call Service: getPlans(supabase, userId, filters)           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Build Database Query                                         │
│    a. Base query: from('plans').select('*', {count: 'exact'})  │
│    b. RLS automatically filters by user_id                      │
│    c. Apply state filter: .eq('state', state) if provided      │
│    d. Apply ordering: .order('created_at', {ascending: false}) │
│    e. Apply pagination: .range(offset, offset + limit - 1)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Execute Query & Process Results                              │
│    - Extract count (total)                                      │
│    - Extract data rows                                          │
│    - Calculate has_more: (offset + limit) < total              │
│    - Build PaginationMeta                                       │
│    - Build PlansListResponse                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Return Response: 200 OK with PlansListResponse              │
└─────────────────────────────────────────────────────────────────┘
```

### Interakcje z bazą danych

**Tabela**: `plans`

**Struktura zapytania**:
```typescript
// Przykład zapytania Supabase
const { data, error, count } = await supabase
  .from('plans')
  .select('*', { count: 'exact' })
  .eq('state', 'active')  // jeśli filtr state
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

**RLS Policy**: Automatycznie filtruje wyniki według `user_id = auth.uid()`, więc nie ma potrzeby dodawać tego warunku w zapytaniu.

### Obsługa paginacji

- **Offset-based pagination**: Tradycyjna metoda z offset i limit
- **Calculation**:
  - Pierwsza strona: `offset=0, limit=10` → zwraca rekordy 0-9
  - Druga strona: `offset=10, limit=10` → zwraca rekordy 10-19
- **has_more flag**: `(offset + limit) < total`
  - Przykład: total=25, offset=10, limit=10 → 20 < 25 → has_more=true

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)

**Mechanizm**: Supabase Auth z JWT tokens

**Implementacja**:
1. Middleware Astro automatycznie ustawia `context.locals.supabase` z klientem Supabase
2. W endpoincie wywołać `supabase.auth.getUser()`
3. Jeśli brak użytkownika → zwróć 401 Unauthorized

```typescript
const { data: { user }, error } = await context.locals.supabase.auth.getUser()
if (!user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### Autoryzacja (Authorization)

**Mechanizm**: Row Level Security (RLS) w PostgreSQL

**Polityki RLS dla tabeli `plans`**:
- Polityka SELECT: `user_id = auth.uid()`
- Automatyczna filtracja wyników - użytkownik widzi tylko swoje plany
- Nie ma potrzeby ręcznego filtrowania po `user_id` w aplikacji

**Zalety**:
- Bezpieczeństwo na poziomie bazy danych
- Ochrona przed błędami programistycznymi
- Uproszczenie logiki aplikacji

### Walidacja danych wejściowych

**Cel**: Zapobieganie atakom i błędom

**Mechanizm**: Zod schemas

**Co walidujemy**:
1. **state**: Tylko dozwolone wartości enum ('active', 'archived', 'cancelled')
2. **limit**: Liczba całkowita 1-50 (zapobiega przeciążeniu serwera)
3. **offset**: Liczba całkowita ≥0 (zapobiega negatywnym offsetom)

**Korzyści**:
- Type safety w TypeScript
- Automatyczna konwersja typów (z.coerce.number)
- Szczegółowe komunikaty błędów
- Ochrona przed SQL injection (choć Supabase chroni domyślnie)

### Ochrona przed atakami

1. **SQL Injection**: Supabase client automatycznie escapuje parametry
2. **DoS (Denial of Service)**: 
   - Maksymalny limit 50 wyników
   - Rate limiting powinien być dodany na poziomie infrastruktury (przyszłość)
3. **Data Exposure**: 
   - RLS zapewnia izolację danych między użytkownikami
   - Zwracamy tylko pola z PlanDTO, nie eksponujemy wrażliwych danych
4. **CSRF**: Nieistotne dla API endpointów (brak cookies session-based)

## 7. Obsługa błędów

### Hierarchia obsługi błędów

```
┌─────────────────────────────────────┐
│ Request                             │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ Validation Error (Zod)?             │──YES──> 400 Bad Request
└─────────┬───────────────────────────┘
          │ NO
          ▼
┌─────────────────────────────────────┐
│ Authentication Error?                │──YES──> 401 Unauthorized
└─────────┬───────────────────────────┘
          │ NO
          ▼
┌─────────────────────────────────────┐
│ Database Error?                      │──YES──> 500 Internal Error
└─────────┬───────────────────────────┘         (log details)
          │ NO
          ▼
┌─────────────────────────────────────┐
│ 200 OK with PlansListResponse       │
└─────────────────────────────────────┘
```

### Scenariusze błędów

#### 1. Błąd walidacji (400 Bad Request)

**Przyczyny**:
- Nieprawidłowa wartość `state` (np. "invalid-state")
- `limit` > 50 lub < 1
- `offset` < 0
- Nieprawidłowy typ danych (np. state=123)

**Odpowiedź**:
```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "too_big",
      "path": ["limit"],
      "message": "Number must be less than or equal to 50"
    }
  ]
}
```

**Implementacja**:
```typescript
const result = getPlansQuerySchema.safeParse(queryParams)
if (!result.success) {
  return new Response(JSON.stringify({
    error: "Validation error",
    details: result.error.issues
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

#### 2. Błąd uwierzytelniania (401 Unauthorized)

**Przyczyny**:
- Brak tokena autoryzacyjnego
- Nieważny/wygasły token
- Token dla nieistniejącego użytkownika

**Odpowiedź**:
```json
{
  "error": "Unauthorized"
}
```

**Implementacja**:
```typescript
const { data: { user }, error } = await supabase.auth.getUser()
if (!user || error) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

#### 3. Błąd serwera (500 Internal Server Error)

**Przyczyny**:
- Błąd połączenia z bazą danych
- Błąd Supabase API
- Nieoczekiwany wyjątek w kodzie

**Odpowiedź** (dla klienta):
```json
{
  "error": "Internal server error"
}
```

**Logowanie** (server-side):
```typescript
try {
  // ... logic
} catch (error) {
  console.error('[GET /api/plans] Error:', error)
  // W przyszłości: wysłanie do Sentry/Logtail
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**Nie eksponować szczegółów błędu**: Ze względów bezpieczeństwa, szczegóły błędów serwerowych są tylko logowane, nie zwracane klientowi.

### Best Practices

1. **Zawsze obsługuj wszystkie ścieżki błędów**
2. **Loguj błędy serwera** dla debugowania
3. **Nie eksponuj stack trace** klientowi
4. **Używaj spójnych formatów błędów** JSON
5. **Zwracaj odpowiednie kody statusu HTTP**
6. **Waliduj wejście wcześnie** (fail fast)

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Zapytanie COUNT**:
   - Dla dużych tabel może być kosztowne
   - Supabase wykonuje COUNT w ramach tego samego zapytania (`{count: 'exact'}`)

2. **Brak indeksu na kolumnie state**:
   - Jeśli filtrowanie po state jest częste, rozważ dodanie indeksu
   - SQL: `CREATE INDEX idx_plans_state ON plans(state)`

3. **Sortowanie po created_at**:
   - Istnieje już indeks na created_at (kolumna timestamptz)
   - Jeśli nie, dodaj: `CREATE INDEX idx_plans_created_at ON plans(created_at DESC)`

### Strategie optymalizacji

#### 1. Indeksy bazy danych

**Rekomendowane indeksy**:
```sql
-- Indeks dla filtrowania po state i sortowania
CREATE INDEX idx_plans_state_created_at ON plans(state, created_at DESC);

-- Indeks dla RLS (prawdopodobnie już istnieje)
CREATE INDEX idx_plans_user_id ON plans(user_id);
```

#### 2. Limit domyślny i maksymalny

- **Default limit: 10** - balansuje między UX a obciążeniem serwera
- **Max limit: 50** - zapobiega nadmiernemu obciążeniu
- Alternatywa: cursor-based pagination dla bardzo dużych zbiorów (przyszłość)

#### 3. Caching (przyszłość)

Dla tego endpointu caching nie jest priorytetem, ponieważ:
- Dane są specyficzne dla użytkownika
- Dane mogą się często zmieniać (nowe plany, zmiany statusu)

Jeśli byłby potrzebny:
- Cache na poziomie HTTP (Cache-Control headers)
- Redis dla często pobieranych planów
- Invalidacja przy mutacjach (POST, PATCH)

#### 4. Query optimization

```typescript
// Optymalne zapytanie
const { data, error, count } = await supabase
  .from('plans')
  .select('id, user_id, state, start_date, end_date, created_at, updated_at', 
          { count: 'exact' })  // Select tylko potrzebne kolumny
  .eq('state', state)  // Indexed filter
  .order('created_at', { ascending: false })  // Indexed sort
  .range(offset, offset + limit - 1)  // Limit rows
```

#### 5. Monitoring

Metryki do śledzenia:
- **Response time**: p50, p95, p99
- **Query duration**: czas wykonania zapytania DB
- **Error rate**: % requests z kodem 500
- **Most common filters**: jakie wartości state są najczęściej używane

Narzędzia (przyszłość):
- Supabase Dashboard (built-in analytics)
- Sentry (error tracking)
- Custom logging/metrics

### Profil wydajności

**Oczekiwana latencja**:
- Zapytanie DB: 10-50ms
- Serialization: 1-5ms
- Network: 10-100ms (zależnie od lokalizacji)
- **Total**: 20-150ms

**Skalowalność**:
- Supabase PostgreSQL skaluje się pionowo i poziomo
- RLS policies są efektywne przy odpowiednich indeksach
- Offset pagination działa dobrze do ~10,000 wyników
- Dla większych zbiorów rozważ cursor-based pagination

## 9. Kroki implementacji

### Krok 1: Dodaj schemat walidacji Zod

**Plik**: `src/lib/schemas/plan.ts`

**Działanie**:
- Otwórz istniejący plik schemas/plan.ts (jeśli istnieje) lub utwórz nowy
- Dodaj schemat walidacji dla query parameters

**Kod**:
```typescript
import { z } from 'zod'

// Schemat dla query parameters GET /api/plans
export const getPlansQuerySchema = z.object({
  state: z.enum(['active', 'archived', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0)
})

export type GetPlansQuery = z.infer<typeof getPlansQuerySchema>
```

**Walidacja**:
- Uruchom `npm run dev` i sprawdź, czy nie ma błędów kompilacji

---

### Krok 2: Utwórz lub zaktualizuj service function

**Plik**: `src/lib/services/plans.service.ts`

**Działanie**:
- Otwórz istniejący plik plans.service.ts
- Dodaj nową funkcję `getPlans` (lub zaktualizuj istniejącą)

**Kod**:
```typescript
import type { SupabaseClient } from '../db/supabase.client'
import type { PlansListResponse, PaginationMeta } from '../../types'
import type { GetPlansQuery } from '../schemas/plan'

/**
 * Get paginated list of user's plans with optional filtering
 */
export async function getPlans(
  supabase: SupabaseClient,
  userId: string,
  filters: GetPlansQuery
): Promise<PlansListResponse> {
  const { state, limit, offset } = filters

  // Build query
  let query = supabase
    .from('plans')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply state filter if provided
  if (state) {
    query = query.eq('state', state)
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  // Execute query
  const { data, error, count } = await query

  if (error) {
    throw error
  }

  // Build pagination metadata
  const total = count ?? 0
  const has_more = (offset + limit) < total

  const pagination: PaginationMeta = {
    total,
    limit,
    offset,
    has_more
  }

  return {
    data: data ?? [],
    pagination
  }
}
```

**Uwagi**:
- RLS automatycznie filtruje po user_id, nie trzeba dodawać `.eq('user_id', userId)`
- Funkcja rzuca błąd jeśli zapytanie się nie powiedzie - zostanie złapany w endpoincie

---

### Krok 3: Utwórz endpoint API

**Plik**: `src/pages/api/plans/index.ts`

**Działanie**:
- Utwórz nowy plik (jeśli nie istnieje)
- Zaimplementuj handler GET

**Kod**:
```typescript
import type { APIRoute } from 'astro'
import { getPlansQuerySchema } from '../../../lib/schemas/plan'
import { getPlans } from '../../../lib/services/plans.service'

export const prerender = false

export const GET: APIRoute = async (context) => {
  try {
    // 1. Parse query parameters
    const url = new URL(context.request.url)
    const queryParams = {
      state: url.searchParams.get('state'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset')
    }

    // 2. Validate query parameters
    const validationResult = getPlansQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          details: validationResult.error.issues
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const filters = validationResult.data

    // 3. Authenticate user
    const supabase = context.locals.supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 4. Call service to get plans
    const result = await getPlans(supabase, user.id, filters)

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    // Log error details server-side
    console.error('[GET /api/plans] Error:', error)

    // Return generic error to client
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
```

**Uwagi**:
- `export const prerender = false` - wymagane dla dynamic API routes w Astro
- `context.locals.supabase` - ustawione przez middleware Astro
- Szczegóły błędów logowane tylko server-side (bezpieczeństwo)

---

### Krok 4: Testowanie manualne

**4.1. Test bez parametrów (domyślne wartości)**

```bash
curl -X GET "http://localhost:4321/api/plans" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Oczekiwany rezultat**: 200 OK, limit=10, offset=0

---

**4.2. Test z filtrem state**

```bash
curl -X GET "http://localhost:4321/api/plans?state=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Oczekiwany rezultat**: 200 OK, tylko plany ze statusem "active"

---

**4.3. Test z custom limit i offset**

```bash
curl -X GET "http://localhost:4321/api/plans?limit=5&offset=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Oczekiwany rezultat**: 200 OK, 5 wyników zaczynając od 6-tego

---

**4.4. Test z nieprawidłowym parametrem**

```bash
curl -X GET "http://localhost:4321/api/plans?state=invalid&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Oczekiwany rezultat**: 400 Bad Request z szczegółami walidacji

---

**4.5. Test bez autoryzacji**

```bash
curl -X GET "http://localhost:4321/api/plans"
```

**Oczekiwany rezultat**: 401 Unauthorized

---

**4.6. Test paginacji (has_more flag)**

Scenariusz: Użytkownik ma 25 planów

```bash
# Pierwsza strona (0-9)
curl -X GET "http://localhost:4321/api/plans?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
# has_more: true (20 < 25)

# Druga strona (10-19)
curl -X GET "http://localhost:4321/api/plans?limit=10&offset=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
# has_more: true (20 < 25)

# Trzecia strona (20-24)
curl -X GET "http://localhost:4321/api/plans?limit=10&offset=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
# has_more: false (30 >= 25)
```

---

### Krok 5: Testowanie integracyjne (opcjonalne)

**Plik testowy**: `src/pages/api/plans/index.test.ts` (jeśli framework testowy jest skonfigurowany)

**Scenariusze testowe**:
1. ✅ Zwraca puste wyniki dla użytkownika bez planów
2. ✅ Zwraca plany z poprawną paginacją
3. ✅ Filtruje po state='active'
4. ✅ Respektuje limit i offset
5. ✅ Zwraca 400 dla nieprawidłowych parametrów
6. ✅ Zwraca 401 dla nieautoryzowanego użytkownika
7. ✅ Oblicza has_more poprawnie
8. ✅ Nie zwraca planów innych użytkowników (RLS)

---

### Krok 6: Dodaj indeksy bazodanowe (opcjonalne, jeśli nie istnieją)

**Połącz się z Supabase SQL Editor**

```sql
-- Indeks dla filtrowania i sortowania
CREATE INDEX IF NOT EXISTS idx_plans_state_created_at 
ON plans(state, created_at DESC);

-- Indeks dla RLS (prawdopodobnie już istnieje)
CREATE INDEX IF NOT EXISTS idx_plans_user_id 
ON plans(user_id);
```

**Sprawdź istniejące indeksy**:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'plans';
```

---

### Krok 7: Dokumentacja API (aktualizacja)

**Plik**: `API_TESTING.md` lub `CURL_EXAMPLES.md`

**Dodaj przykłady użycia**:
```markdown
## GET /api/plans

### Pobierz wszystkie plany (domyślna paginacja)
\`\`\`bash
curl "http://localhost:4321/api/plans" \\
  -H "Authorization: Bearer $TOKEN"
\`\`\`

### Pobierz tylko aktywne plany
\`\`\`bash
curl "http://localhost:4321/api/plans?state=active" \\
  -H "Authorization: Bearer $TOKEN"
\`\`\`

### Custom paginacja
\`\`\`bash
curl "http://localhost:4321/api/plans?limit=20&offset=10" \\
  -H "Authorization: Bearer $TOKEN"
\`\`\`
```

---

### Krok 8: Code Review Checklist

Przed mergem, sprawdź:

- [ ] ✅ Schemat walidacji Zod jest poprawny i kompletny
- [ ] ✅ Service function zwraca poprawny typ PlansListResponse
- [ ] ✅ Endpoint obsługuje wszystkie scenariusze błędów (400, 401, 500)
- [ ] ✅ `export const prerender = false` jest obecny
- [ ] ✅ Używamy `context.locals.supabase`, nie direct import
- [ ] ✅ RLS policies są włączone na tabeli plans
- [ ] ✅ Testy manualne przechodzą pomyślnie
- [ ] ✅ Błędy są logowane server-side
- [ ] ✅ Szczegóły błędów nie są eksponowane klientowi
- [ ] ✅ Kod jest zgodny z regułami projektu (early returns, guard clauses)
- [ ] ✅ TypeScript kompiluje się bez błędów
- [ ] ✅ Dokumentacja jest zaktualizowana

---

### Krok 9: Deployment

Po pomyślnym review i testach lokalnych:

1. **Commit changes**:
```bash
git add .
git commit -m "feat: implement GET /api/plans endpoint with pagination and filtering"
```

2. **Push to repository**:
```bash
git push origin feature/api-plans-endpoint
```

3. **Create Pull Request** z opisem zmian

4. **Monitor w środowisku produkcyjnym**:
   - Sprawdź logi pod kątem błędów
   - Monitoruj response times
   - Sprawdź metryki użycia (ile requestów, jakie filtry)

---

## 10. Podsumowanie

### Zaimplementowane komponenty

1. ✅ **Validation Schema** (`src/lib/schemas/plan.ts`)
   - Walidacja query parameters z Zod
   - Type safety dla TypeScript

2. ✅ **Service Layer** (`src/lib/services/plans.service.ts`)
   - Logika biznesowa oddzielona od endpointu
   - Reużywalna funkcja getPlans

3. ✅ **API Endpoint** (`src/pages/api/plans/index.ts`)
   - Handler GET z pełną obsługą błędów
   - Integracja z Supabase Auth i RLS

4. ✅ **Database Indexes** (opcjonalne)
   - Optymalizacja wydajności queries

### Kluczowe cechy implementacji

- **Bezpieczeństwo**: RLS + uwierzytelnianie + walidacja
- **Wydajność**: Indeksy + limit max 50 + efektywne queries
- **Maintainability**: Separation of concerns (schema/service/endpoint)
- **Type Safety**: Pełne typowanie TypeScript + Zod
- **Error Handling**: Kompletna obsługa wszystkich scenariuszy błędów

### Następne kroki

Po wdrożeniu tego endpointu, rozważ:
- Implementację innych endpointów plans (POST /api/plans/generate, GET /api/plans/{id})
- Dodanie rate limiting na poziomie infrastruktury
- Monitoring i alerty dla błędów 500
- Performance testing dla większych zbiorów danych

