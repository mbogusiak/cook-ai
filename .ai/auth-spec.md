# Specyfikacja architektury modułu autentykacji (Supabase Auth + Astro)

## Zakres i zgodność z PRD
- US-001..US-004: Rejestracja, logowanie, wylogowanie, resetowanie hasła – dedykowane strony; tylko email/hasło.
- US-008..US-015: Generowanie, przeglądanie i interakcje z planem wyłącznie po zalogowaniu.
- US-005..US-007: Onboarding dostępny bez logowania (podgląd). Generowanie i persistencja planu po zalogowaniu.
- Nie naruszamy istniejących stron i komponentów; zmiany są dodające. Pamiętaj. 

## 1. Architektura interfejsu użytkownika
### 1.1. Strony (Astro)
- `src/pages/auth/login.astro`: logowanie; osadza `AuthLoginForm.tsx`. Jeśli zalogowany → redirect do `next` lub `/dashboard`.
- `src/pages/auth/register.astro`: rejestracja; osadza `AuthRegisterForm.tsx`. Jeśli zalogowany → redirect `/dashboard`.
- `src/pages/auth/reset.astro`: zgłoszenie resetu hasła; osadza `AuthResetRequestForm.tsx`.
- `src/pages/auth/reset/callback.astro`: ustawienie nowego hasła po linku email; osadza `AuthResetConfirmForm.tsx`.
- `src/pages/auth/logout.astro`: opcjonalnie serwerowy sign-out (nie wymagane w MVP, realizujemy client-side z Headera).

Publiczne: `index.astro`, `onboarding.astro`, `auth/*`, podgląd planu (`/api/plans/preview`).
Chronione: `dashboard.astro`, `plans/*` (widok planu i dnia).

### 1.2. Komponenty React (client-side)
- `src/components/auth/AuthLoginForm.tsx`
- `src/components/auth/AuthRegisterForm.tsx`
- `src/components/auth/AuthResetRequestForm.tsx`
- `src/components/auth/AuthResetConfirmForm.tsx`
- UI: shadcn/ui (`input`, `button`). Walidacja: `zod`. Komunikaty inline oraz form-level.

### 1.3. Layout i Header
- `src/layouts/Layout.astro`: bez zmian struktury; Header pozostaje wyspą React.
- `src/components/Header.tsx`:
    - Zalogowany: menu użytkownika z emailem, akcja „Wyloguj” (client-side `auth.signOut()` + redirect).
    - Niezalogowany: przyciski „Zaloguj”, „Zarejestruj”.
    - Detekcja sesji: `supabase.auth.getUser()` + `onAuthStateChange`.

### 1.4. Podział odpowiedzialności
- Astro: routing, SSR/redirecty, guardy tras, osadzanie wysp React.
- React: obsługa formularzy, walidacja, wywołania Supabase Auth, komunikaty, client-side redirecty.

### 1.5. Walidacja i błędy
- `src/lib/schemas/auth.ts`: `loginSchema`, `registerSchema`, `resetRequestSchema`, `resetConfirmSchema`.
- Mapowanie błędów Supabase na przyjazne komunikaty (np. „Nieprawidłowy email lub hasło”).

### 1.6. Scenariusze
- Rejestracja: `auth.signUp({ email, password, options: { emailRedirectTo: AUTH_REDIRECT_URL }})` → info o weryfikacji email.
- Logowanie: `auth.signInWithPassword` → redirect do `next` lub `/dashboard`.
- Wylogowanie: `auth.signOut()` → `/`.
- Reset: `auth.resetPasswordForEmail(email, { redirectTo: AUTH_REDIRECT_URL })`; callback: `auth.exchangeCodeForSession()` → `auth.updateUser({ password })` → `/auth/login?reset=success`.
- Onboarding bez logowania: używa `/api/plans/preview` (bez zapisu).

## 2. Logika backendowa
### 2.1. Endpointy
- `POST /api/plans/preview`: zwraca deterministyczny podgląd (daty + slot targets), bez zapisu do DB.
- Istniejące endpointy planów pozostają; RLS i sesja wymuszą `user_id = auth.uid()` (po pełnej konfiguracji RLS).

### 2.2. Walidacja danych
- Zod po stronie klienta i w `/api/plans/preview`.

### 2.3. Obsługa wyjątków
- Spójne `{ error: { code, message } }`, statusy: 400/401/409/500.

### 2.4. SSR i renderowanie (Node adapter)
- Guardy SSR w `dashboard.astro` oraz `plans/*`: brak `locals.user` → redirect do `/auth/login?next=...`.
- `index.astro`: zastąpiono stały `TEMP_USER_ID` sesją; redirect: zalogowany z aktywnym planem → `/dashboard`, inaczej → `/onboarding`.

## 3. System autentykacji (Supabase Auth)
### 3.1. Integracja
- Middleware tworzy per-request klienta Supabase i dołącza `locals.supabase`, `locals.session`, `locals.user` (na bazie cookie).
- Po stronie klienta: `supabase-js` z auto-refresh i eventami.

### 3.2. Reset hasła
- `resetPasswordForEmail` z `AUTH_REDIRECT_URL` wskazującym na `/auth/reset/callback` (oddzielnie dla dev/prod).

### 3.3. RLS
- Docelowo operacje zapisu planów/posiłków ograniczone przez RLS (`auth.uid()`), brak przekazywania `user_id` z klienta.

## 4. Struktura plików i modułów
- UI (React): `src/components/auth/*`
- Strony (Astro): `src/pages/auth/*`
- Schematy: `src/lib/schemas/auth.ts`
- Middleware: `src/middleware/index.ts` (locals: supabase, session, user)
- Typy: `src/types.ts` (bez zmian w ramach tej iteracji)

## 5. Kontrakty i nawigacja
- Query: `next` dla post-login redirect; `reset=success` po udanym resecie.

## 6. Edge cases i ryzyka
- Potwierdzenie email: UI informuje jeśli wymagane.
- Wygasły link resetu: przyjazny komunikat i ponowne wysłanie.
- SSR vs client: SSR guardy eliminują mignięcia.

## 7. Konfiguracja
- Env: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `AUTH_REDIRECT_URL` (np. `http://localhost:3000/auth/reset/callback`).
