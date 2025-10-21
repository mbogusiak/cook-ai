# API Endpoint Implementation Plan: GET /api/recipes

## 1. Przegląd punktu końcowego

Endpoint `GET /api/recipes` jest odpowiedzialny za wyszukiwanie i filtrowanie przepisów dla planowania posiłków. Zwraca paginowaną listę przepisów spełniających kryteria filtrowania (typ posiłku, zakres kalorii, wyszukiwanie tekstu). Endpoint umożliwia użytkownikom przeglądanie i wyszukiwanie dostępnych przepisów z możliwością ograniczenia wyników do przepisów odpowiednich dla określonych typów posiłków.

**Cel**: Wspierać funkcjonalność wyszukiwania i filtrowania przepisów w interfejsie planowania posiłków, umożliwiając użytkownikom efektywne znalezienie odpowiednich przepisów na podstawie preferencji żywieniowych i czasowych.

## 2. Szczegóły żądania

### Metoda HTTP
**GET**

### Struktura URL
```
GET /api/recipes
```

### Parametry zapytania (Query Parameters)

#### Wymagane
Brak - wszystkie parametry są opcjonalne

#### Opcjonalne
| Parametr | Typ | Domyślnie | Ograniczenia | Opis |
|----------|-----|----------|--------------|------|
| `slot` | string (enum) | - | `breakfast`, `lunch`, `dinner`, `snack` | Filtruj przepisy dostępne dla konkretnego typu posiłku |
| `min_calories` | number | - | > 0 | Minimalna liczba kalorii na porcję |
| `max_calories` | number | - | > 0 | Maksymalna liczba kalorii na porcję |
| `search` | string | - | 1-255 znaków | Wyszukaj po nazwie przepisu (case-insensitive, obsługuje fuzzy matching) |
| `limit` | number | 20 | 1-100 | Liczba wyników na stronę |
| `offset` | number | 0 | >= 0 | Przesunięcie dla paginacji |

### Request Body
Brak - parametry przekazywane w query string

### Nagłówki żądania
- `Content-Type`: nie wymagany (GET request)
- `Authorization`: opcjonalny (jeśli endpoint nie jest publiczny)

### Przykłady zapytań

```
GET /api/recipes?slot=breakfast&limit=10&offset=0
GET /api/recipes?search=salad&min_calories=200&max_calories=500
GET /api/recipes?slot=lunch&search=chicken&limit=25
GET /api/recipes?limit=50&offset=100
```

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

#### `RecipeDTO`
```typescript
type RecipeDTO = {
  id: number
  slug: string
  name: string
  available_slots: Enums<'meal_slot'>[]
  calories_per_serving: number
  servings: number
  time_minutes: number | null
  image_url: string | null
  source_url: string | null
}
```

**Notatka**: `available_slots` jest tablicą zawierającą wszystkie słoty, dla których dany przepis jest dostępny. Dane pochodzą z joinowania tabeli `recipes` z tabelą `recipe_slots`.

#### `PaginationMeta`
```typescript
type PaginationMeta = {
  total: number       // Całkowita liczba wyników spełniających filtry
  limit: number       // Liczba wyników zwróconych w tej stronie
  offset: number      // Przesunięcie zapytania
  has_more: boolean   // Czy są jeszcze wyniki do załadowania
}
```

#### `RecipesListResponse`
```typescript
type RecipesListResponse = {
  data: RecipeDTO[]
  pagination: PaginationMeta
}
```

### Zod Validation Schemas

#### `GetRecipesQuerySchema`
```typescript
const GetRecipesQuerySchema = z.object({
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  min_calories: z.number().int().positive().optional(),
  max_calories: z.number().int().positive().optional(),
  search: z.string().trim().min(1).max(255).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
}).refine(
  (data) => !data.min_calories || !data.max_calories || data.min_calories <= data.max_calories,
  { message: 'min_calories must be less than or equal to max_calories', path: ['min_calories'] }
)
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "data": [
    {
      "id": 1,
      "slug": "healthy-breakfast-bowl",
      "name": "Healthy Breakfast Bowl",
      "available_slots": ["breakfast", "lunch"],
      "calories_per_serving": 350,
      "servings": 1,
      "time_minutes": 15,
      "image_url": "https://example.com/image.jpg",
      "source_url": "https://cookido.com/recipe/123"
    },
    {
      "id": 2,
      "slug": "protein-smoothie",
      "name": "Protein Smoothie",
      "available_slots": ["breakfast", "snack"],
      "calories_per_serving": 280,
      "servings": 1,
      "time_minutes": 5,
      "image_url": "https://example.com/smoothie.jpg",
      "source_url": "https://cookido.com/recipe/456"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Kod statusu**: `200 OK`

### Błąd: Nieprawidłowe parametry (400 Bad Request)

```json
{
  "error": "Bad Request",
  "message": "Invalid query parameters",
  "details": {
    "limit": "Number must be less than or equal to 100",
    "min_calories": "Number must be greater than 0"
  }
}
```

**Kod statusu**: `400 Bad Request`

**Możliwe przyczyny**:
- `limit` poza zakresem 1-100
- `offset` ujemny
- `min_calories` lub `max_calories` <= 0
- `slot` nie jest jedną z dozwolonych wartości
- `min_calories` > `max_calories`
- `search` pusty (tylko białe znaki)
- Nieznany parametr zapytania

### Błąd: Błąd serwera (500 Internal Server Error)

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred while fetching recipes"
}
```

**Kod statusu**: `500 Internal Server Error`

**Możliwe przyczyny**:
- Błąd połączenia z bazą danych
- Błąd w zapytaniu do bazy danych
- Nieoczekiwany wyjątek w kodzie

## 5. Przepływ danych

### Architektura zapytania

```
Client (GET /api/recipes?...)
    ↓
[API Route Handler: src/pages/api/recipes/index.ts]
    ↓
[Query Validation: Zod Schema]
    ↓
[Service Layer: src/lib/services/recipes.ts]
    ↓
[Database Query: Supabase]
    ├─ recipes table (SELECT)
    ├─ recipe_slots table (JOIN)
    └─ Aggregation (GROUP BY, COUNT)
    ↓
[Data Transformation: mapRecipesToDTOs()]
    ↓
[Response Formatting: RecipesListResponse]
    ↓
Client (JSON Response + Pagination)
```

### Szczegółowy przepływ

1. **Odebranie żądania**: Astro API route odbiera GET request z parametrami query
2. **Walidacja parametrów**: Zod schema weryfikuje i normalizuje parametry
3. **Wywołanie serwisu**: `searchRecipes()` z walidowanymi parametrami
4. **Konstruowanie zapytania SQL**:
   - Łączenie `recipes` z `recipe_slots` (left join)
   - Filtrowanie po `is_active = true`
   - Aplikowanie filtrów (slot, calories, search)
   - Grupowanie po recipe ID i agregacja slotów
   - Paginacja (limit, offset)
5. **Wykonanie zapytania**: Supabase zwraca wyniki
6. **Transformacja danych**: Mapowanie rekordów na DTO
7. **Formatowanie odpowiedzi**: Konstruowanie `RecipesListResponse`
8. **Wysłanie odpowiedzi**: Zwrócenie JSON z kodem 200

### Zapytanie SQL (pseudo-kod)

```sql
SELECT
  r.id,
  r.slug,
  r.name,
  r.portions,
  r.prep_minutes,
  r.cook_minutes,
  r.image_url,
  r.source_url,
  r.calories_kcal,
  ARRAY_AGG(rs.slot) as available_slots,
  COUNT(*) OVER () as total_count
FROM recipes r
LEFT JOIN recipe_slots rs ON r.id = rs.recipe_id
WHERE
  r.is_active = true
  AND (:slot IS NULL OR rs.slot = :slot)
  AND (:min_calories IS NULL OR r.calories_kcal >= :min_calories)
  AND (:max_calories IS NULL OR r.calories_kcal <= :max_calories)
  AND (:search IS NULL OR r.name ILIKE '%' || :search || '%')
GROUP BY r.id, r.slug, r.name, ...
ORDER BY r.id
LIMIT :limit OFFSET :offset
```

**Notatka**: Supabase PostgreSQL obsługuje GIN index na polu `name` z pg_trgm dla efektywnego fuzzy matching.

## 6. Względy bezpieczeństwa

### Uwierzytelnianie i autoryzacja
- **Publiczna dostępność**: Endpoint zwraca publiczne dane przepisów, nie wymaga autentykacji
- **RLS Policies**: Supabase RLS na tabeli `recipes` zwraca tylko przepisy z `is_active = true`
- **Brak danych wrażliwych**: Endpoint nie ujawnia danych użytkownika ani ustawień prywatnych

### Walidacja danych wejściowych
- **Zod Schema**: Wszystkie parametry query walidowane i typowane
- **Normalizacja**: Usuwanie białych znaków (`trim()`), konwersja typów
- **Whitelist wartości enum**: `slot` musi być jedną z dozwolonych wartości
- **Zakresy numeryczne**: `limit` (1-100), `offset` (>= 0), kalorie (> 0)
- **Długość stringa**: `search` maksymalnie 255 znaków

### Zapobieganie SQL Injection
- **Parameterized Queries**: Supabase SDK automatycznie parametryzuje zapytania
- **Brak dynamicznego SQL**: Nie budujemy SQL string'ów, używamy builder API

### Zapobieganie Denial of Service (DoS)
- **Limit na `limit`**: Maksymalnie 100 wyników na żądanie
- **Limit na `offset`**: Brak maksymalnego limitu, ale duże offsety są naturalnie drogie (DB optimization)
- **Rate Limiting**: Rekomendowane wdrożenie rate limitingu na poziomie middleware/Supabase

### Ochrona wydajności
- **Indeksy**: Istnieją GIN indeksy na `name` (fuzzy search) i zwykły na `calories_kcal`
- **Paginacja**: Obowiązkowa dla dużych zestawów danych
- **Caching**: Można rozważyć caching stron wyników po stronie klienta

### Bezpieczeństwo informacyjne
- **Nie ujawniaj istnienia**: Puste wyniki zwracają `total: 0`, a nie błąd 404
- **Spójne czasy odpowiedzi**: Nie różnią się w zależności od czy zapisek istnieje
- **Brak stack trace'ów**: Błędy 500 zwracają generyczną wiadomość

## 7. Obsługa błędów

### Scenariusze błędów i obsługa

| Scenariusz | Kod | Obsługa | Logowanie |
|-----------|-----|--------|-----------|
| Nieprawidłowy `limit` (poza 1-100) | 400 | Zod validation error | WARN: validation_error |
| Ujemny `offset` | 400 | Zod validation error | WARN: validation_error |
| `min_calories > max_calories` | 400 | Zod .refine() error | WARN: validation_error |
| Nieprawidłowy `slot` (nie enum) | 400 | Zod validation error | WARN: validation_error |
| Pusty `search` (tylko whitespace) | 400 | Zod trim().min(1) | WARN: validation_error |
| `search` > 255 znaków | 400 | Zod max(255) | WARN: validation_error |
| Błąd połączenia Supabase | 500 | Catch i generyczna wiadomość | ERROR: database_error, context |
| Timeout zapytania | 500 | Catch i retry logic (opcjonalne) | ERROR: query_timeout |
| Nieoczekiwany exception | 500 | Catch-all error handler | ERROR: unexpected_error, stack trace (DEV only) |
| Supabase RLS violation | 403 | Supabase error | WARN: rls_violation |

### Implementacja error handlera

```typescript
try {
  // Walidacja
  const validatedParams = GetRecipesQuerySchema.parse(query)
  
  // Service
  const result = await searchRecipes(supabase, validatedParams)
  
  // Sukces
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
} catch (error) {
  // Zod validation error
  if (error instanceof z.ZodError) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Invalid query parameters',
      details: error.flatten().fieldErrors
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Database error
  if (error instanceof Error && error.message.includes('database')) {
    logger.error('Database error in recipes search', { error })
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Unexpected error
  logger.error('Unexpected error in recipes search', { error })
  return new Response(JSON.stringify({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### Logowanie

Logować następujące zdarzenia:
- **WARN**: Błędy walidacji (z parametrami, ale bez PII)
- **INFO**: Liczba zwróconych wyników (dla monitorowania)
- **ERROR**: Błędy bazy danych z kontekstem (bez wrażliwych danych)
- **ERROR**: Nieoczekiwane wyjątki ze stack trace (DEV only)

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

| Problem | Przyczyna | Rozwiązanie | Priorytet |
|---------|-----------|------------|-----------|
| Fuzzy search na dużym zbiorze | GIN index może być powolny dla niskich limitów | Zmiana trigram settings lub materialized view | MEDIUM |
| Duplikaty przy JOIN recipe_slots | Jeden przepis → wiele wierszy (jeden na slot) | GROUP BY + ARRAY_AGG | HIGH ✓ |
| COUNT(*) OVER() dla wszystkich | Liczy wszystkie wiersze dla total | Oddzielne COUNT query lub estimate | LOW (za MVP) |
| Duży offset | Offset 1000000 skanuje wszystkie rzędy | Keyset pagination (do przyszłości) | LOW |
| Brak cache'u | Każde zapytanie idzie do DB | Redis cache na wyniki | MEDIUM |

### Optymalizacje aktualnie wdrożone

✓ **GIN Index na `recipes.name`**: Efektywny fuzzy matching  
✓ **Index na `recipes.calories_kcal`**: Szybkie filtrowanie po kaloriach  
✓ **Index na `recipe_slots(slot, recipe_id)`**: Szybkie joiny  
✓ **Paginacja limit/offset**: Ogranicza rozmiar rezultatu  
✓ **is_active filter**: Wyeliminuj nieaktywne przepisy na poziomie DB  

### Rekomendacje optymalizacyjne (Future)

1. **Redis Caching**: Cache'uj popularne zapytania (np. limit=20, offset=0)
   - TTL: 1 godzina
   - Invalidation: Po update receptury

2. **Keyset Pagination**: Zamiast offset/limit, używaj ID cursora
   - Wyraźnie szybsze dla dużych offsetów
   - Wymaga UI changes

3. **Materialized View**: Pre-compute aggregate data
   - Dla popularnych kombinacji (slot + cal range)

4. **Search Improvements**: 
   - Full-text search zamiast LIKE/trigram
   - Relevance scoring

### Load Testing Thresholds

- **Wygeneruj plany dla 10k+ użytkowników**: 
  - Single endpoint powinien wytrzymać 100+ req/s z cache
  - Bez cache: 10-50 req/s depending na DB size

- **Rekomendacje**:
  - Monitoruj P95 latency (powinno być < 500ms)
  - Ustaw alerts na > 1000ms

## 9. Kroki implementacji

### Faza 1: Przygotowanie (0.5h)

1. **Weryfikacja schematu bazy danych**
   - [ ] Potwierdzić istnienie tabel `recipes` i `recipe_slots`
   - [ ] Potwierdzić indeksy (calories_kcal, name GIN, recipe_slots)
   - [ ] Potwierdzić enum `meal_slot`
   - [ ] Sprawdzić RLS policies na `recipes`

2. **Przegląd istniejącego kodu**
   - [ ] Przejrzeć `src/lib/services/recipes.ts` (dla `getRecipeById` pattern)
   - [ ] Przejrzeć `src/lib/schemas/recipe.ts` (dla walidacji pattern)
   - [ ] Przejrzeć `src/pages/api/recipes/[id].ts` (jeśli istnieje)

3. **Setup planu**
   - [ ] Utworzyć todo listy dla każdej fazy

### Faza 2: Implementacja Service Layer (1.5h)

1. **Aktualizacja `src/lib/services/recipes.ts`**
   - [ ] Dodać funkcję `searchRecipes()`
   - [ ] Dodać helper `buildRecipesQuery()`
   - [ ] Dodać helper `mapRecipesToDTOs()`
   - [ ] Obsługa transformacji pól: `calories_kcal → calories_per_serving`, `portions → servings`, etc.
   - [ ] Agregacja `available_slots` z `recipe_slots`

   ```typescript
   export async function searchRecipes(
     supabase: SupabaseClient<Database>,
     params: SearchRecipesParams
   ): Promise<RecipesListResponse>
   ```

2. **Testy unit service'u** (opcjonalne dla MVP)
   - [ ] Mock Supabase client
   - [ ] Test mapowania DTO
   - [ ] Test transformacji pól

### Faza 3: Walidacja (1h)

1. **Dodanie Zod schema do `src/lib/schemas/recipe.ts`**
   - [ ] Stworzyć `GetRecipesQuerySchema`
   - [ ] Walidować `limit` (1-100), `offset` (>= 0)
   - [ ] Walidować `slot` enum
   - [ ] Walidować `min_calories`, `max_calories` (> 0)
   - [ ] Walidować `search` (trim, 1-255)
   - [ ] Dodać `.refine()` dla `min_calories <= max_calories`
   - [ ] Eksportować type `SearchRecipesParams = z.infer<typeof GetRecipesQuerySchema>`

2. **Testy walidacji** (opcjonalne dla MVP)
   - [ ] Test valid parameters
   - [ ] Test invalid limit/offset
   - [ ] Test min > max calories
   - [ ] Test invalid slot

### Faza 4: API Route (1h)

1. **Stworzyć/Aktualizować `src/pages/api/recipes/index.ts`**
   - [ ] GET handler
   - [ ] Parsowanie query z `Astro.url.searchParams`
   - [ ] Wczytanie Supabase client z `context.locals.supabase`
   - [ ] Walidacja parametrów (Zod)
   - [ ] Wywołanie `searchRecipes()` service
   - [ ] Formatowanie odpowiedzi
   - [ ] Error handling (try-catch)
   - [ ] Logowanie błędów
   - [ ] `export const prerender = false`

   ```typescript
   export const prerender = false
   
   export async function GET(context: APIContext) {
     try {
       const query = Object.fromEntries(context.url.searchParams)
       const params = GetRecipesQuerySchema.parse(query)
       const result = await searchRecipes(context.locals.supabase, params)
       return new Response(JSON.stringify(result), { status: 200, ... })
     } catch (error) {
       // error handling
     }
   }
   ```

2. **Middleware weryfikacja** (jeśli wymagana autentykacja)
   - [ ] Sprawdzić `context.locals.user` (opcjonalnie)

### Faza 5: Testowanie (2h)

1. **Manual Testing**
   - [ ] Test 1: `GET /api/recipes` → powinna zwrócić domyślnie 20 rezultatów
   - [ ] Test 2: `GET /api/recipes?slot=breakfast` → filtruj po slotach
   - [ ] Test 3: `GET /api/recipes?search=salad` → wyszukaj po nazwie
   - [ ] Test 4: `GET /api/recipes?min_calories=200&max_calories=500` → zakres kalorii
   - [ ] Test 5: `GET /api/recipes?limit=5&offset=10` → paginacja
   - [ ] Test 6: `GET /api/recipes?limit=150` → 400 (limit za wysoki)
   - [ ] Test 7: `GET /api/recipes?offset=-1` → 400 (ujemny offset)
   - [ ] Test 8: `GET /api/recipes?slot=invalid` → 400 (invalid enum)
   - [ ] Test 9: `GET /api/recipes?min_calories=500&max_calories=200` → 400 (min > max)
   - [ ] Test 10: Pusty wynik (no matches) → 200 z `data: []`, `total: 0`

2. **API Testing (Postman/REST Client)**
   - [ ] Import requests dla wszystkich scenariuszy
   - [ ] Sprawdzić structure odpowiedzi
   - [ ] Sprawdzić kody statusu
   - [ ] Sprawdzić performance (< 500ms)

3. **Integration Testing** (opcjonalne)
   - [ ] Test z rzeczywistą bazą danych
   - [ ] Poprawność agregacji `available_slots`
   - [ ] Poprawność mapowania pól DTO

### Faza 6: Dokumentacja i Code Review (1h)

1. **Dokumentacja kodu**
   - [ ] JSDoc komentarze na `searchRecipes()`
   - [ ] Wyjaśnić transformacje pól
   - [ ] Dokumentować błędy i edge cases

2. **Code Review Checklist**
   - [ ] Kody statusu HTTP poprawne (200, 400, 500)
   - [ ] Zod walidacja kompletna
   - [ ] Error handling robi log i zwraca user-friendly messages
   - [ ] Brak hardcodeów, values z config
   - [ ] Consistent naming conventions
   - [ ] Performance considerations uwzględnione

3. **Linting i Formatting**
   - [ ] ESLint: `npm run lint` (bez zmian, per user rules)
   - [ ] Prettier: `npm run format`

### Faza 7: Deployment i Monitoring (1h)

1. **Pre-deployment**
   - [ ] Test w staging environment
   - [ ] Sprawdzić environment variables (SUPABASE_URL, SUPABASE_KEY)
   - [ ] Verify RLS policies accessible

2. **Deployment**
   - [ ] Merge PR na main
   - [ ] Deploy na production
   - [ ] Monitoruj logs dla błędów

3. **Post-deployment**
   - [ ] Monitoruj latency (P95 < 500ms)
   - [ ] Monitoruj error rate (< 1%)
   - [ ] Sprawdzić user feedback

### Czasowe oszacowanie

| Faza | Czas |
|------|------|
| 1. Przygotowanie | 0.5h |
| 2. Service Layer | 1.5h |
| 3. Walidacja | 1h |
| 4. API Route | 1h |
| 5. Testowanie | 2h |
| 6. Dokumentacja | 1h |
| 7. Deployment | 1h |
| **Razem** | **~8h** |

### Dependencje i blokery

- [ ] Supabase project musi być ustaw z tabelami `recipes` i `recipe_slots`
- [ ] Migracje muszą być executed
- [ ] Environment variables (`SUPABASE_URL`, `SUPABASE_KEY`) muszą być dostępne
- [ ] Astro middleware musi ustawiać `context.locals.supabase`

---

## Dodatek: Checklist QA

Przed oznakowaniem jako "gotowe", upewnij się że:

- [ ] Endpoint zwraca 200 dla valid requests
- [ ] Endpoint zwraca 400 dla invalid parameters
- [ ] Pagination działa poprawnie (limit, offset, has_more)
- [ ] Filtrowanie po slot, calories, search działa
- [ ] Agregacja available_slots jest poprawna
- [ ] DTO mapowanie pól jest poprawne (calories_kcal → calories_per_serving, etc.)
- [ ] Puste wyniki zwracają prawidłową strukturę
- [ ] Response time < 500ms dla typowych zapytań
- [ ] Brak SQL injections
- [ ] Brak ujawniania wewnętrznych błędów
- [ ] Logowanie błędów działa
- [ ] Kod jest readable i maintainable

