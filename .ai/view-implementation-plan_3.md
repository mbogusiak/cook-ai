# Plan Wdrożenia Punktu Końcowego API: POST /api/user-settings

## 1. Przegląd Punktu Końcowego

### Cel i Funkcjonalność
Endpoint `POST /api/user-settings` odpowiada za **utworzenie ustawień użytkownika podczas pierwszej konfiguracji**. Jest to punkt krytyczny w procesie onboardingu, gdzie nowy zalogowany użytkownik definiuje swoje preferencje dotyczące dziennego limitu kalorii i długości planów żywieniowych. Endpoint:
- Akceptuje preferencje użytkownika
- Weryfikuje poprawność danych
- Zapisuje ustawienia w bazie danych
- Zwraca utworzone ustawienia z metadanymi (timestamps, user_id)
- Zapobiega duplikatom (ustawienia mogą być utworzone tylko raz na użytkownika)

### Typ Operacji
- **CRUD**: CREATE (zapis nowego rekordu)
- **Scenariusz**: First-time setup / Initial user preferences
- **Autentykacja**: Wymagana (JWT token)
- **Autoryzacja**: Użytkownik może tworzyć ustawienia tylko dla siebie (RLS)

---

## 2. Szczegóły Żądania

### Metoda HTTP
```
POST /api/user-settings
```

### Struktura URL
```
Protocol: https
Domain: [application-domain]
Port: [standard]
Path: /api/user-settings
Query Parameters: none
Path Parameters: none
```

### Nagłówki Wymagane
```
Content-Type: application/json
Authorization: Bearer [JWT_TOKEN]
```

### Parametry

#### Wymagane:
- **`default_daily_calories`** (number, integer)
  - Opis: Domyślny dzienny limit kalorii dla planów
  - Typ: Dodatnia liczba całkowita
  - Walidacja: > 0 (enforced w bazie danych via CHECK constraint)
  - Przykład: 2000, 2500, 1800

#### Opcjonalne:
- **`default_plan_length_days`** (number, integer)
  - Opis: Domyślna długość planu w dniach
  - Typ: Liczba całkowita
  - Zakres: 1-31 (enforced w bazie danych via CHECK constraint)
  - Domyślna wartość: 7 (jeśli nie podano)
  - Przykład: 7, 14, 30

### Request Body Struktura

```json
{
  "default_daily_calories": 2000,
  "default_plan_length_days": 7
}
```

### Minimalna Request (z opcjonalnym polem):

```json
{
  "default_daily_calories": 2000
}
```

---

## 3. Wykorzystywane Typy

### DTO (Data Transfer Objects)

#### CreateUserSettingsCommand
```typescript
export type CreateUserSettingsCommand = {
  default_daily_calories: number
  default_plan_length_days?: number
}
```
**Zastosowanie**: Walidacja i typowanie żądania przychodzącego
**Źródło**: `src/types.ts` (już zdefiniowany)

#### UserSettingsDTO
```typescript
export type UserSettingsDTO = Pick<
  Tables<'user_settings'>,
  'user_id' | 'default_daily_calories' | 'default_plan_length_days' | 'created_at' | 'updated_at'
>
```
**Zastosowanie**: Typowanie odpowiedzi
**Pola**: user_id, default_daily_calories, default_plan_length_days, created_at, updated_at
**Źródło**: `src/types.ts` (już zdefiniowany)

### Zod Schema (walidacja)

Nowy schema do utworzenia w serwisie walidacji:

```typescript
import { z } from 'zod'

export const createUserSettingsSchema = z.object({
  default_daily_calories: z.number()
    .int('default_daily_calories musi być liczbą całkowitą')
    .positive('default_daily_calories musi być większe od 0'),
  default_plan_length_days: z.number()
    .int('default_plan_length_days musi być liczbą całkowitą')
    .min(1, 'Minimum 1 dzień')
    .max(31, 'Maksimum 31 dni')
    .optional()
})
```

### Typy Odpowiedzi

#### Success Response (201 Created)
```typescript
{
  data: UserSettingsDTO
}
```

---

## 4. Szczegóły Odpowiedzi

### Success Response (201 Created)

```json
{
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "default_daily_calories": 2000,
    "default_plan_length_days": 7,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**HTTP Status Code**: `201 Created`

**Nagłówki Odpowiedzi**:
```
Content-Type: application/json
Location: /api/user-settings (opcjonalne, wskazanie gdzie znaleźć zasób)
```

### Error Response: Bad Request (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "default_daily_calories",
        "message": "musi być większe od 0"
      },
      {
        "field": "default_plan_length_days",
        "message": "Maksimum 31 dni"
      }
    ]
  }
}
```

**HTTP Status Code**: `400 Bad Request`

### Error Response: Unauthorized (401)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token is missing or invalid"
  }
}
```

**HTTP Status Code**: `401 Unauthorized`

### Error Response: Conflict (409)

```json
{
  "error": {
    "code": "SETTINGS_ALREADY_EXIST",
    "message": "User settings already exist. Use PATCH /api/user-settings to update."
  }
}
```

**HTTP Status Code**: `409 Conflict`

### Error Response: Internal Server Error (500)

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred while creating user settings"
  }
}
```

**HTTP Status Code**: `500 Internal Server Error`

---

## 5. Przepływ Danych

### End-to-End Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (Frontend - React Component)                              │
│ - Gathers user input (default_daily_calories, plan_length)      │
│ - Sends POST /api/user-settings with JWT token                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ ASTRO SERVER - API Route Handler                                │
│ src/pages/api/user-settings.ts (POST handler)                  │
│ - Extract JWT from Authorization header                        │
│ - Parse request body as JSON                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ MIDDLEWARE / AUTH CONTEXT                                       │
│ src/middleware/index.ts                                         │
│ - Verify JWT token                                             │
│ - Extract user_id from token claims                            │
│ - Set user_id in context.locals.auth                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ VALIDATION LAYER                                                │
│ src/lib/services/user-settings.service.ts                      │
│ - Validate input against Zod schema                            │
│ - Check data types, ranges, constraints                        │
│ - Return validation errors if invalid                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ BUSINESS LOGIC LAYER                                            │
│ src/lib/services/user-settings.service.ts                      │
│ - Check if user already has settings (conflict detection)      │
│ - If exists: return 409 Conflict                               │
│ - If not: prepare data for insertion                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE LAYER (SUPABASE)                                       │
│ Table: public.user_settings                                    │
│ - Supabase RLS Policy: INSERT allowed only for authenticated    │
│   user creating own record (user_id from JWT)                  │
│ - CHECK Constraints:                                           │
│   - default_daily_calories > 0                                 │
│   - default_plan_length_days BETWEEN 1 AND 31                  │
│ - DEFAULT VALUES:                                              │
│   - default_plan_length_days = 7 (if not provided)            │
│   - created_at = NOW()                                         │
│   - updated_at = NOW()                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESPONSE CONSTRUCTION                                           │
│ - Format UserSettingsDTO from database response                │
│ - Return 201 Created with data wrapper                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT RECEIVES RESPONSE                                        │
│ - 201 with user settings data                                  │
│ - Update local state / redirect to next step                   │
└─────────────────────────────────────────────────────────────────┘
```

### Interakcje z Zewnętrznymi Usługami
- **Supabase Auth**: Weryfikacja JWT (wykonana w middleware)
- **Supabase Database**: INSERT do tabeli `user_settings`
- Brak zewnętrznych API

### Transformacje Danych

1. **Request**: JSON body → TypeScript object
2. **Validation**: CreateUserSettingsCommand → Zod validation
3. **Enrichment**: Add user_id from context.locals.auth
4. **Database**: Insert command → UserSettingsDTO from DB response
5. **Response**: UserSettingsDTO → JSON response wrapper

---

## 6. Względy Bezpieczeństwa

### Autentykacja

- **Wymagana**: Tak
- **Metoda**: JWT Token w Authorization header
- **Format**: `Authorization: Bearer <JWT_TOKEN>`
- **Weryfikacja**: 
  - Wykonana w middleware `src/middleware/index.ts`
  - Token musi być ważny i nie wygasły
  - User ID ekstrahowany z claims tokenu
- **Błąd**: 401 Unauthorized jeśli token brakuje lub jest niepoprawny

### Autoryzacja (Row-Level Security)

- **Polityka RLS**: Każdy użytkownik może tworzyć ustawienia tylko dla siebie
- **Implementacja**: Supabase RLS policy na tabeli `user_settings`
  ```sql
  -- User can insert their own settings
  CREATE POLICY user_insert_own_settings ON user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  ```
- **Enforcement**: Database-level, nie aplikacja-level
- **Scenariusz Bezpieczeństwa**: Nawet jeśli aplikacja wysle inny user_id, baza danych odrzuci INSERT

### Walidacja Danych Wejściowych

- **Frontend Validation**: Walidacja w React komponencie (UX)
- **Backend Validation**: Zod schema walidacja na API route
  - `default_daily_calories`: positive integer (> 0)
  - `default_plan_length_days`: integer 1-31
  - Type checking (musi być number)
  - Null/undefined checks
- **Database Validation**: CHECK constraints na tabelach
  - `CHECK (default_daily_calories > 0)`
  - `CHECK (default_plan_length_days BETWEEN 1 AND 31)`
- **Strategia**: Defense in depth - walidacja na wszystkich warstwach

### Zapobieganie Duplikatom

- **Constraint**: PRIMARY KEY na `user_id` w tabeli `user_settings`
- **Scenariusz**: Jeśli użytkownik spróbuje utworzyć ustawienia drugi raz
- **Obsługa**:
  1. Aplikacja sprawdza czy rekord istnieje (SELECT COUNT)
  2. Jeśli istnieje: return 409 Conflict
  3. Jeśli nie istnieje: INSERT
- **Alternatywa**: Użyć UPSERT (ON CONFLICT ... UPDATE) jeśli wymagana jest idempotencja

### Ochrona Przed SQL Injection

- **Mitigation**: Supabase JavaScript client library (prepared statements)
- **Praktyka**: Nigdy nie konkatenować SQL stringów
- **Stosowanie**: Zawsze użyć Supabase `.insert()`, `.select()` API
- **Parametryzacja**: Dane użytkownika są parametrizowane, nie konkatenowane

### Ochrona Przed CSRF

- **Mechanizm**: Token CSRF w cookies/headers
- **Status**: Zależy od konfiguracji Astro middleware
- **Rekomendacja**: Upewnić się, że środowisko ma CSRF protection

### Ochrona Przed Rate Limiting

- **Brak Current Implementation**: Endpoint może być nazy bez limitu
- **Rekomendacja**: Dodać rate limiting na tworzenie ustawień
  - 1 ustawienie na użytkownika
  - Lub max 10 prób/minuta
- **Lokacja**: Middleware lub service layer
- **Biblioteka**: `@astrojs/node` middleware lub external service

### Obsługa Sekretów

- **Database Credentials**: Trzymane w environment variables
- **JWT Secret**: Trzymane w Supabase configuration
- **Brak Exposure**: Nigdy nie logować user_id, podatne dane w responses
- **Practice**: Sanitize error messages (nie ujawniać wnętrza bazy danych)

---

## 7. Obsługa Błędów

### Mapa Scenariuszy Błędów

| Scenariusz | Cause | HTTP Code | Error Code | Działanie |
|-----------|-------|-----------|-----------|----------|
| Brak Authorization headera | Brak JWT tokenu | 401 | UNAUTHORIZED | Middleware odrzuca |
| Niepoprawny JWT | Token wygasł/invalid | 401 | UNAUTHORIZED | Middleware odrzuca |
| User ID brakuje w token claims | Malformed JWT | 401 | UNAUTHORIZED | Middleware odrzuca |
| default_daily_calories = 0 | Wartość poza zakresem | 400 | VALIDATION_ERROR | Zwróć pole + message |
| default_daily_calories = -500 | Wartość ujemna | 400 | VALIDATION_ERROR | Zwróć pole + message |
| default_daily_calories = "abc" | Wrong type | 400 | VALIDATION_ERROR | Zwróć pole + message |
| default_plan_length_days = 0 | Wartość poza zakresem | 400 | VALIDATION_ERROR | Zwróć pole + message |
| default_plan_length_days = 32 | Wartość poza zakresem | 400 | VALIDATION_ERROR | Zwróć pole + message |
| default_plan_length_days = 3.5 | Not integer | 400 | VALIDATION_ERROR | Zwróć pole + message |
| Ustawienia już istnieją | Duplicate record | 409 | SETTINGS_ALREADY_EXIST | Zwróć informacje istniejących |
| Database connection error | DB offline | 500 | INTERNAL_SERVER_ERROR | Log error, zwróć generic message |
| Database constraint violation | Other CHECK failed | 500 | INTERNAL_SERVER_ERROR | Log details, zwróć generic message |
| Request body not JSON | Malformed JSON | 400 | BAD_REQUEST | Zwróć JSON parse error |
| Request body size too large | Payload too big | 413 | PAYLOAD_TOO_LARGE | Zwróć size limit info |

### Strategie Obsługi Błędów

#### 1. Walidacja Danych Wejściowych (400)
```typescript
try {
  const validatedData = createUserSettingsSchema.parse(requestBody)
  // Proceed with validated data
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

#### 2. Autentykacja (401)
```typescript
const user = context.locals.auth?.user
if (!user || !user.id) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing or invalid'
      }
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}
```

#### 3. Konflikt Duplikatu (409)
```typescript
// Check if settings already exist
const existingSettings = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', user.id)
  .single()

if (existingSettings.data) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'SETTINGS_ALREADY_EXIST',
        message: 'User settings already exist. Use PATCH /api/user-settings to update.'
      }
    }),
    { status: 409, headers: { 'Content-Type': 'application/json' } }
  )
}
```

#### 4. Database Errors (500)
```typescript
try {
  const result = await supabase
    .from('user_settings')
    .insert([{ user_id: user.id, ...validatedData }])
    .select()
    .single()
  
  if (result.error) throw result.error
  return new Response(JSON.stringify({ data: result.data }), { status: 201 })
} catch (error) {
  console.error('Failed to create user settings:', error)
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while creating user settings'
      }
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Logowanie Błędów

- **Console Logging**: `console.error()` dla development
- **Error Tracking**: Integracja z Sentry (jeśli skonfigurowana)
- **Log Fields**: timestamp, user_id, error code, stack trace
- **Brak**: Logowania wrażliwych danych (passwords, full error internals)

---

## 8. Rozważania Dotyczące Wydajności

### Analiza Wydajności

#### 1. Operacje Bazodanowe
- **Query 1**: SELECT COUNT(*) z tabeli `user_settings` (conflict check) - **Fast** (O(1) z index na primary key)
- **Query 2**: INSERT do `user_settings` - **Fast** (single row, simple operation)
- **Razem**: ~10-20ms latency (w normalnych warunkach)

#### 2. Walidacja
- **Zod Validation**: ~1-2ms dla prostego schematu
- **JWT Verification**: ~5-10ms (wykonane w middleware)
- **Razem**: ~10ms validation overhead

#### 3. Całkowita Latency (Expected)
- Network roundtrip: ~50-100ms (zależy od client location)
- Server processing: ~30-40ms (auth + validation + DB)
- **Total**: ~100-150ms (normal conditions)

### Potencjalne Wąskie Gardła

1. **Database Latency**: Jeśli Postgres na innym regionie/niskim zasobie
   - **Mitigation**: Use Supabase regional instances, connection pooling
   
2. **JWT Verification**: Wykonane w middleware dla każdego requestu
   - **Mitigation**: Cache token verification (krótki TTL), use HS256 zamiast RS256
   
3. **Network Latency**: Zbyt dużo roundtrips
   - **Current**: 1 SELECT + 1 INSERT = 2 roundtrips
   - **Optimization**: Use database function/trigger zamiast app-level check

### Strategie Optymalizacji

#### 1. Reduce Database Roundtrips
```sql
-- Zamiast SELECT + INSERT na aplikacji,
-- użyć PL/pgSQL function:

CREATE OR REPLACE FUNCTION create_user_settings(
  p_user_id UUID,
  p_daily_calories INTEGER,
  p_plan_length_days INTEGER DEFAULT 7
)
RETURNS user_settings AS $$
BEGIN
  -- Check if exists
  IF EXISTS(SELECT 1 FROM user_settings WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Settings already exist for user' USING ERRCODE = '23505';
  END IF;
  
  -- Insert and return
  INSERT INTO user_settings(user_id, default_daily_calories, default_plan_length_days)
  VALUES(p_user_id, p_daily_calories, p_plan_length_days)
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Call from app:
const result = await supabase.rpc('create_user_settings', {
  p_user_id: user.id,
  p_daily_calories: validatedData.default_daily_calories,
  p_plan_length_days: validatedData.default_plan_length_days
})
```

#### 2. Caching Strategy
- **Not Applicable**: Tworzycie nowy rekord za każdym razem
- **Reuse**: Cache user settings po utworzeniu (w aplikacji/browser local storage)

#### 3. Index Optimization
```sql
-- Ensure primary key index on user_settings(user_id)
-- Already exists via PRIMARY KEY constraint
-- No additional indexes needed for this simple query
```

#### 4. Connection Pooling
- **Status**: Supabase handles connection pooling
- **Recommendation**: Use Supabase connection string with pooling enabled

### Metryki do Monitorowania

- `response_time_p50`: Mediana response time
- `response_time_p99`: 99th percentile (spikes)
- `db_query_time`: Database query latency
- `error_rate_409`: Conflict rate (duplicate creation attempts)
- `error_rate_400`: Validation error rate
- `error_rate_500`: Server error rate

---

## 9. Etapy Wdrożenia

### Faza 1: Przygotowanie Infrastruktury

#### Krok 1.1: Weryfikacja Schematu Bazy Danych
- [ ] Upewnić się, że tabela `user_settings` istnieje w Supabase
- [ ] Potwierdzić wszystkie kolumny: user_id, default_daily_calories, default_plan_length_days, created_at, updated_at
- [ ] Potwierdzić CHECK constraints: calories > 0, days 1-31
- [ ] Potwierdzić PRIMARY KEY na user_id
- [ ] Potwierdzić DEFAULT wartości: days=7, timestamps=NOW()

#### Krok 1.2: Setup RLS Polityk
- [ ] Upewnić się, że RLS jest enabled na `user_settings`
- [ ] Utworzyć INSERT policy: `INSERT WHERE auth.uid() = user_id`
- [ ] Testy: Sprawdzić, że INSERT z innym user_id jest odrzucony
- [ ] Testy: Sprawdzić, że INSERT z poprawnym user_id przechodzi

#### Krok 1.3: Aktualizacja Types
- [ ] Potwierdzić, że `CreateUserSettingsCommand` istnieje w `src/types.ts`
- [ ] Potwierdzić, że `UserSettingsDTO` istnieje w `src/types.ts`
- [ ] Generować aktualne types z Supabase: `npx supabase gen types typescript`

### Faza 2: Logika Biznesowa (Service Layer)

#### Krok 2.1: Utworzyć Service
- [ ] Utworzyć nowy plik: `src/lib/services/user-settings.service.ts`
- [ ] Zaimplementować funkcję `createUserSettings(userId, command)`
- [ ] Zaimplementować walidację wejścia
- [ ] Obsługa konfliktów (409)
- [ ] Error handling i logging

#### Krok 2.2: Criar Zod Schema
- [ ] Dodać `createUserSettingsSchema` w service lub osobnym pliku validacji
- [ ] Potwierdzić wszystkie walidacje: type, range, required
- [ ] Testy: Sprawdzić poprawne wiadomości błędów

#### Krok 2.3: Testowanie Serwisu
- [ ] Unit testy dla `createUserSettings()`
- [ ] Mock Supabase client
- [ ] Sprawdzić happy path (201)
- [ ] Sprawdzić conflict scenario (409)
- [ ] Sprawdzić validation errors (400)

### Faza 3: API Route Handler

#### Krok 3.1: Utworzyć API Route
- [ ] Utworzyć nowy plik: `src/pages/api/user-settings.ts`
- [ ] Eksportować `POST` handler: `export const POST = async (context) => {}`
- [ ] Dodać `export const prerender = false`
- [ ] Import service i types

#### Krok 3.2: Zaimplementować POST Handler
- [ ] Wyekstrahować Authorization header
- [ ] Weryfikować user z `context.locals.auth`
- [ ] Parsować request body (JSON)
- [ ] Wołać `userSettingsService.createUserSettings()`
- [ ] Konstruować response 201 z data wrapper
- [ ] Error handling: return 400/401/409/500

#### Krok 3.3: Error Response Formatting
- [ ] Upewnić się, że wszystkie error responses mają spójny format
- [ ] Potwierdzić HTTP status codes
- [ ] Potwierdzić error codes (VALIDATION_ERROR, UNAUTHORIZED, etc.)
- [ ] Potwierdzić wiadomości są user-friendly

### Faza 4: Integracja z Middleware

#### Krok 4.1: Verify Auth Middleware
- [ ] Potwierdzić, że `src/middleware/index.ts` weryfikuje JWT
- [ ] Potwierdzić, że user info jest ustawiany w `context.locals.auth`
- [ ] Testy: Bez tokenu → 401
- [ ] Testy: Z innym tokenem → 401

#### Krok 4.2: CORS Configuration (jeśli dotyczy)
- [ ] Upewnić się, że CORS jest prawidłowo skonfigurowany w `astro.config.mjs`
- [ ] POST z Content-Type: application/json powinien być dozwolony
- [ ] Preflight requests (OPTIONS) powinny przechodzić

### Faza 5: Testing & QA

#### Krok 5.1: Unit Testy
- [ ] Testy serwisu: `user-settings.service.test.ts`
- [ ] Coverage: happy path, walidacja, konflikty, DB errors

#### Krok 5.2: Integration Testy
- [ ] E2E testy całego endpoint
- [ ] Użyć mock/test Supabase instance
- [ ] Scenariusze: 201, 400, 401, 409, 500

#### Krok 5.3: Manual Testing
- [ ] Testować z curl/Postman:
  ```bash
  curl -X POST http://localhost:3000/api/user-settings \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"default_daily_calories": 2000, "default_plan_length_days": 7}'
  ```
- [ ] Potwierdzić 201 response ze wszystkimi polami
- [ ] Potwierdzić bez tokenu → 401
- [ ] Potwierdzić z invalid danych → 400
- [ ] Potwierdzić drugi raz → 409

#### Krok 5.4: Security Testing
- [ ] Spróbować create dla innego user_id (RLS rejection)
- [ ] Spróbować negative calories (validation failure)
- [ ] Spróbować > 31 dni (validation failure)
- [ ] SQL injection testy (niebezpieczne parametre)

### Faza 6: Deployment & Monitoring

#### Krok 6.1: Pre-Deployment Checklist
- [ ] Cały kod reviewer został
- [ ] Testy przechodzą
- [ ] Linter nie ma błędów
- [ ] Environment variables są skonfigurowane
- [ ] Database migrations są applied (RLS polityki)

#### Krok 6.2: Deploy to Staging
- [ ] Deploy na staging environment
- [ ] Testy smoke tests (basic 201 response)
- [ ] Monitoring alert setup

#### Krok 6.3: Deploy to Production
- [ ] Tag release w git
- [ ] Deploy na production
- [ ] Verify endpoint availability
- [ ] Monitor error rates

#### Krok 6.4: Setup Monitoring
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Performance monitoring (response times)
- [ ] Database query monitoring
- [ ] Alert na 409 conflict rate (może wskazywać na problem)

### Faza 7: Documentation & Handoff

#### Krok 7.1: Update API Documentation
- [ ] Dodać endpoint do README.md lub API docs
- [ ] Zaincludować request/response examples
- [ ] Zaincludować error scenarios

#### Krok 7.2: Update Cursor Rules (jeśli potrzebne)
- [ ] Dokumentować pattern używany dla tego endpointu
- [ ] Dodać przykład future implementacjom

#### Krok 7.3: Knowledge Transfer
- [ ] Code review session z zespołem
- [ ] Demo endpoint w action
- [ ] Q&A session

---

## 10. Checklist Wdrożenia

- [ ] Service layer (`src/lib/services/user-settings.service.ts`) created and tested
- [ ] Zod schema for validation created
- [ ] API route (`src/pages/api/user-settings.ts`) created
- [ ] POST handler implemented with all error handling
- [ ] Response format 201 with data wrapper
- [ ] Error responses (400, 401, 409, 500) implemented
- [ ] Auth middleware verified
- [ ] Database RLS policies verified
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual tests passing (all scenarios)
- [ ] Security tests passing (RLS enforcement)
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Deployed to production
- [ ] Monitoring configured
- [ ] Team informed and trained

---

## 11. References & Related Endpoints

### Endpoint Dependencies
- Zależy od: `src/middleware/index.ts` (auth verification)
- Zależy od: `src/db/supabase.client.ts` (Supabase client)
- Zależy od: Supabase `user_settings` table
- Zależy od: Supabase Auth (JWT tokens)

### Related Endpoints
- GET /api/user-settings (fetch user settings) - Future implementation
- PATCH /api/user-settings (update user settings) - Future implementation
- DELETE /api/user-settings (delete user settings) - Future implementation

### Additional Resources
- Supabase RLS Documentation: https://supabase.io/docs/guides/auth/row-level-security
- Zod Documentation: https://zod.dev
- Astro API Routes: https://docs.astro.build/en/core-concepts/endpoints/
