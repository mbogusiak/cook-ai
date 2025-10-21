# API Endpoint Implementation Plan: GET /api/recipes/{id}

## 1. Przegląd punktu końcowego

Endpoint `GET /api/recipes/{id}` umożliwia pobranie szczegółowych informacji o konkretnym przepisie z bazy danych. Zwraca kompletne dane przepisu wraz z:
- Podstawowymi informacjami (ID, nazwa, slug, informacje kaloryczne)
- Lista dostępnych slotów posiłków (breakfast, lunch, dinner, snack)
- Metadane przepisu (czas przygotowania, liczba porcji, linki do obrazów i źródła)
- Znaczniki czasowe (created_at, updated_at)

Endpoint obsługuje publiczny dostęp do katalogu przepisów dostępnych w aplikacji.

---

## 2. Szczegóły żądania

**Metoda HTTP**: `GET`

**Struktura URL**: `/api/recipes/{id}`

**Parametry**:
- **Wymagane**:
  - `id` (path parameter, type: `number`/`bigint`) - identyfikator przepisu, musi być dodatnią liczbą całkowitą
  
- **Opcjonalne**: brak

**Query Parameters**: brak

**Request Body**: brak

**Nagłówki**: 
- Standard HTTP headers (Accept, User-Agent, itp.)
- Brak wymaganych nagłówków autoryzacyjnych (endpoint publiczny)

**Przykład żądania**:
```bash
GET /api/recipes/1 HTTP/1.1
Host: example.com
Accept: application/json
```

---

## 3. Wykorzystywane typy

### Typy DTO

Z `src/types.ts`:

```typescript
// Odpowiedź na endpoint
RecipeDetailsDTO = RecipeDTO & {
  created_at: string
  updated_at: string
}

// Podstawowa struktura przepisu
RecipeDTO = {
  id: number
  slug: string
  name: string
  available_slots: Enums<'meal_slot'>[]  // ['breakfast', 'lunch', 'dinner', 'snack']
  calories_per_serving: number
  servings: number
  time_minutes: number | null
  image_url: string | null
  source_url: string | null
}
```

### Typy bazy danych

Ze schematu bazy (`recipes` i `recipe_slots` tabele):

```typescript
// Tabela recipes
recipes {
  id: bigint (PRIMARY KEY)
  slug: string (UNIQUE)
  name: string
  portions: integer (domyślnie 1)
  prep_minutes: integer | null
  cook_minutes: integer | null
  image_url: string | null
  source_url: string | null
  rating_avg: numeric(3,2) | null
  reviews_count: integer
  ingredients: string[]
  calories_kcal: integer (mapuje do calories_per_serving)
  protein_g: numeric | null
  fat_g: numeric | null
  carbs_g: numeric | null
  is_active: boolean (DEFAULT true)
  created_at: timestamptz
  updated_at: timestamptz
}

// Tabela recipe_slots - relacja many-to-many
recipe_slots {
  recipe_id: bigint (FOREIGN KEY -> recipes.id)
  slot: meal_slot enum ('breakfast', 'lunch', 'dinner', 'snack')
}
```

### Zod Schema do walidacji

```typescript
// src/lib/schemas/recipe.ts
import { z } from 'zod'

export const GetRecipeParamsSchema = z.object({
  id: z.string().transform(Number).pipe(
    z.number().int().positive('Recipe ID must be a positive integer')
  )
})
```

---

## 4. Szczegóły odpowiedzi

### Pomyślna odpowiedź (200 OK)

```json
{
  "data": {
    "id": 1,
    "slug": "healthy-breakfast-bowl",
    "name": "Healthy Breakfast Bowl",
    "available_slots": ["breakfast", "lunch"],
    "calories_per_serving": 350,
    "servings": 1,
    "time_minutes": 15,
    "image_url": "https://example.com/image.jpg",
    "source_url": "https://cookido.com/recipe/123",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Nagłówki odpowiedzi**:
- `Content-Type: application/json`
- `Cache-Control: public, max-age=3600` (1 godzina cache'owania)

### Błędy

#### 404 Not Found
```json
{
  "error": "Recipe not found"
}
```

#### 400 Bad Request (nieprawidłowy ID)
```json
{
  "error": "Invalid recipe ID format"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## 5. Przepływ danych

```
┌─────────────────┐
│   HTTP Request  │
│ GET /api/...{id}│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Astro API Route Handler │
│ /api/recipes/[id].ts    │
└────────┬────────────────┘
         │
         ▼ (parse + validate)
┌─────────────────────────┐
│ Zod Schema Validation   │
│ GetRecipeParamsSchema   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Service Method          │
│ getRecipeById()         │
└────────┬────────────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
    ┌─────────────┐    ┌─────────────────┐
    │ Query recipes   │    │ Query recipe_slots │
    │ WHERE id = ?    │    │ WHERE recipe_id = ?│
    └────────┬────────┘    └────────┬────────────┘
             │                      │
             └──────────┬───────────┘
                        │ (merge data)
                        ▼
            ┌──────────────────────┐
            │ Map to RecipeDetailsDTO │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Format JSON Response │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ HTTP 200 + JSON Body │
            └──────────────────────┘
```

### Kroki przetwarzania danych

1. **Parsing**: Wyodrębnienie ID z URL path i konwersja na liczbę
2. **Walidacja**: Sprawdzenie czy ID jest poprawną dodatnią liczbą całkowitą
3. **Query bazy danych**: 
   - Pobranie rekordu z tabeli `recipes` WHERE `id = ?`
   - Pobranie dostępnych slotów z `recipe_slots` WHERE `recipe_id = ?`
4. **Mapowanie**: Transformacja danych z bazy na struktura `RecipeDetailsDTO`
5. **Serializacja**: Konwersja do JSON z proper timestamp formatting
6. **Response**: Odesłanie z nagłówkami cache'owania

---

## 6. Względy bezpieczeństwa

### Autentykacja i Autoryzacja

- **Status**: Endpoint PUBLICZNY (dostęp bez autentykacji)
- **Uzasadnienie**: Katalog przepisów powinien być dostępny dla wszystkich użytkowników (uwierzytelnionych i gości)
- **Przyszłe uwagi**: Jeśli będą prywatne przepisy, dodać RLS policies w Supabase

### Walidacja danych wejściowych

- ✅ Zod schema walidacja na path parameter
- ✅ Type safety dzięki TypeScript
- ✅ Supabase parameterized queries (zapobieganie SQL injection)
- ✅ Sprawdzenie czy ID jest pozytywnym integer'em

### Ochrona danych

- ✅ Brak wrażliwych danych w odpowiedzi
- ✅ Timestampy w ISO 8601 formacie (standardowy)
- ✅ Brak informacji o błędach bazy danych w response'ie

### Inne zagrożenia

- **Enumeration attacks**: Endpoint może być wywoływany z iteracyjnymi ID-ami. Rozwiązanie: Rate limiting (future feature)
- **DDoS**: Cache'owanie i CDN (future optimization)
- **CORS**: Upewnić się że poprawnie skonfigurowany w astro.config.mjs

### Rekomendacje

- [ ] Dodać Rate Limiting na Production (np. 100 requests/min per IP)
- [ ] Implementować CORS policy
- [ ] Dodać request logging dla monitoringu
- [ ] Implementować cache na level CDN (Cache-Control headers)

---

## 7. Obsługa błędów

### Błędy walidacji

| Scenariusz | Powód | HTTP Status | Response |
|-----------|-------|------------|----------|
| ID nie jest liczbą | Parse error | 400 Bad Request | `{ "error": "Invalid recipe ID format" }` |
| ID jest ujemny/zerowy | Validacja Zod | 400 Bad Request | `{ "error": "Recipe ID must be a positive integer" }` |
| ID jest zbyt duży | Overflow | 400 Bad Request | `{ "error": "Invalid recipe ID format" }` |

### Błędy biznesowe

| Scenariusz | Powód | HTTP Status | Response |
|-----------|-------|------------|----------|
| Przepis nie znaleziony | Brak rekordu w DB | 404 Not Found | `{ "error": "Recipe not found" }` |
| Przepis dezaktywowany | is_active = false | 404 Not Found | `{ "error": "Recipe not found" }` |

### Błędy systemu

| Scenariusz | Powód | HTTP Status | Response |
|-----------|-------|------------|----------|
| Błąd połączenia z DB | Network/DB error | 500 Internal Server Error | `{ "error": "Internal server error" }` |
| Unexpected error | Bug w kodzie | 500 Internal Server Error | `{ "error": "Internal server error" }` |

### Strategi obsługi błędów w kodzie

```typescript
// 1. Validacja parametru
if (!id) return new Response(JSON.stringify({ error: "Invalid recipe ID format" }), { status: 400 })

// 2. Query z obsługą brakujących danych
const { data: recipe, error } = await supabase
  .from('recipes')
  .select('*')
  .eq('id', id)
  .eq('is_active', true)
  .single()

if (error || !recipe) {
  return new Response(JSON.stringify({ error: "Recipe not found" }), { status: 404 })
}

// 3. Obsługa wyjątków
try {
  // ... operations
} catch (error) {
  console.error('Error fetching recipe:', error)
  return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
}
```

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Dwie osobne queries**: Recipe + recipe_slots = 2 round-trips do DB
2. **Brak indeksowania**: Jeśli `id` nie ma indeksu (powinien mieć jako PK)
3. **Brak cache'owania**: Każde żądanie trafia do DB

### Strategie optymalizacji

#### Krótkoterminowe (MVP)

- ✅ **Database indices**: 
  - `recipes.id` (PRIMARY KEY - już indeksowany)
  - `recipe_slots.recipe_id` (FOREIGN KEY - powinien być indeksowany)
  
- ✅ **Single query z JOIN** (zamiast 2 queries):
  ```sql
  SELECT r.*, 
         ARRAY_AGG(rs.slot) as available_slots
  FROM recipes r
  LEFT JOIN recipe_slots rs ON r.id = rs.recipe_id
  WHERE r.id = $1 AND r.is_active = true
  GROUP BY r.id
  ```

- ✅ **HTTP Caching Headers**:
  - `Cache-Control: public, max-age=3600` (1h)
  - Pozwala przeglądarce i CDN cache'ować responses

#### Średnioterminowe (po MVP)

- [ ] **Query optimization**: Profiling slow queries
- [ ] **Database connection pooling**: Supabase zmienia na PgBouncer
- [ ] **Response compression**: gzip na Astro
- [ ] **CDN caching**: Cloudflare/Vercel Edge Cache

#### Długoterminowe (skalowanie)

- [ ] **Read replica**: Dedykowana baza dla reads
- [ ] **Full-text search**: PostgreSQL FTS dla wyszukiwania przepisów
- [ ] **Elasticsearch**: Jeśli szukanie będzie bottleneck'iem
- [ ] **Redis cache**: Cache'owanie popular recipes

### Szacunki wydajności

- Expected response time: **50-100ms** (local SSD DB)
- Payload size: ~500 bytes (JSON)
- Concurrent users supportable: 1000+ (standardowy Astro setup)

---

## 9. Kroki implementacji

### Faza 1: Setup struktury projektu

1. ✅ **Zweryfikuj strukturę plików**:
   - `/src/pages/api/recipes/[id].ts` - Astro route
   - `/src/lib/services/recipes.ts` - Service layer
   - `/src/lib/schemas/recipe.ts` - Zod schemas

2. ✅ **Zweryfikuj typy**:
   - Upewnij się że `RecipeDetailsDTO` istnieje w `/src/types.ts`
   - Sprawdź `database.types.ts` czy zawiera `recipes` i `recipe_slots`

### Faza 2: Implementacja Zod schema

3. **Utwórz `/src/lib/schemas/recipe.ts`**:
   ```typescript
   import { z } from 'zod'
   
   export const GetRecipeParamsSchema = z.object({
     id: z.string()
       .transform(Number)
       .pipe(z.number().int().positive('Recipe ID must be a positive integer'))
   })
   ```

### Faza 3: Implementacja Service layer

4. **Utwórz `/src/lib/services/recipes.ts`**:
   - Funkcja `getRecipeById(supabase, id): Promise<RecipeDetailsDTO | null>`
   - Query z JOIN aby pobrać recipe + available_slots w jednym call'u
   - Transformacja danych na typ `RecipeDetailsDTO`
   - Obsługa błędów i null check'ów

### Faza 4: Implementacja API route

5. **Utwórz `/src/pages/api/recipes/[id].ts`**:
   - Export `GET` function handler
   - Ekstrahuj ID z `Astro.params`
   - Waliduj z Zod schema
   - Pobierz supabase client z `context.locals.supabase` (per Astro rules)
   - Wywołaj service method
   - Zwróć JSON response z prawidłowymi statusami i headers

### Faza 5: Testowanie

6. **Unit tests** (opsjonalnie):
   - Test walidacji parametru
   - Test service layer z mock'iem Supabase
   
7. **Integration tests**:
   - GET /api/recipes/1 → 200 + valid JSON
   - GET /api/recipes/999999 → 404
   - GET /api/recipes/invalid → 400
   - GET /api/recipes/-1 → 400

8. **Manual testing**:
   - Testuj z curl/Postman
   - Weryfikuj headers cache'owania
   - Sprawdź response time

### Faza 6: Deployment

9. **Pre-deployment checklist**:
   - [ ] Linter errors cleared
   - [ ] TypeScript compilation success
   - [ ] Tests passing
   - [ ] Database migrations applied
   - [ ] Environment variables set
   - [ ] Supabase RLS policies verified

10. **Deployment na Production**:
    - Wdróż na Staging environment first
    - Weryfikuj response w production-like environment
    - Monitor error logs (Sentry/Logtail)
    - Wdróż na Production

### Faza 7: Post-deployment

11. **Monitoring & Optimization**:
    - Monitor response times
    - Śledź error rate
    - Weryfikuj cache hit rate
    - Zbieraj feedback od frontend team

12. **Future improvements** (P2/P3):
    - Rate limiting
    - Advanced caching strategy
    - Full-text search integration
    - Related recipes suggestions

---

## 10. Metryki sukcesu

- ✅ Endpoint zwraca 200 z prawidłowym JSON structure'em
- ✅ Zwraca 404 gdy przepis nie istnieje
- ✅ Zwraca 400 przy nieprawidłowym ID
- ✅ Response time < 100ms
- ✅ Cache headers poprawnie ustawione
- ✅ Zero security vulnerabilities
- ✅ TypeScript type-safe
- ✅ Brak console errors/warnings

---

## 11. Referencje i linki

- Dokumentacja Astro API Routes: https://docs.astro.build/en/guides/endpoints/
- Dokumentacja Supabase JS Client: https://supabase.com/docs/reference/javascript
- Zod documentation: https://zod.dev
- HTTP Status Codes: https://httpwg.org/specs/rfc9110.html#status.codes
- PostgreSQL JOIN syntax: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
