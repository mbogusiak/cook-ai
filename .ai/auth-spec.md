# Specyfikacja architektury modułu autentykacji (Supabase Auth + Astro)

## Zakres i zgodność z PRD
- US-001..US-004: Rejestracja, logowanie, wylogowanie, resetowanie hasła – dedykowane strony; tylko email/hasło.
- US-005..US-007: Onboarding dostępny wyłącznie po zalogowaniu (zgodnie z PRD: "Jako nowy użytkownik, po pierwszym zalogowaniu" oraz "Brak trybu gościa"). Generowanie i persistencja planu wymaga zalogowania.
- US-008..US-015: Generowanie, przeglądanie i interakcje z planem wyłącznie po zalogowaniu.
- Nie naruszamy istniejących stron i komponentów; zmiany są dodające. Pamiętaj. 

## 1. Architektura interfejsu użytkownika
### 1.1. Strony (Astro)
- `src/pages/auth/login.astro`: logowanie; osadza `AuthLoginForm.tsx`. Jeśli zalogowany → redirect do `next` lub `/dashboard` (jeśli ma aktywny plan) lub `/onboarding` (jeśli nie ma planu). Link "Zapomniałeś hasła?" prowadzi do `/auth/reset` (US-004).
- `src/pages/auth/register.astro`: rejestracja; osadza `AuthRegisterForm.tsx`. Jeśli zalogowany → redirect `/onboarding` (US-001: przekierowanie do kreatora planu po rejestracji). Po pomyślnej rejestracji przekierowanie do `/onboarding`.
- `src/pages/auth/reset.astro`: zgłoszenie resetu hasła; osadza `AuthResetRequestForm.tsx`.
- `src/pages/auth/reset/callback.astro`: ustawienie nowego hasła po linku email; osadza `AuthResetConfirmForm.tsx`.
- `src/pages/auth/logout.astro`: opcjonalnie serwerowy sign-out (nie wymagane w MVP, realizujemy client-side z Headera).

Publiczne: `index.astro`, `auth/*`.
Chronione: `onboarding.astro` (wymaga logowania), `dashboard.astro`, `plans/*` (widok planu i dnia).

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
- Rejestracja: `auth.signUp({ email, password, options: { emailRedirectTo: AUTH_REDIRECT_URL }})` → po pomyślnej rejestracji użytkownik jest zalogowany i przekierowany do `/onboarding` (kreator planu) zgodnie z US-001. Jeśli Supabase wymaga potwierdzenia email, UI informuje użytkownika (może być zalogowany już po rejestracji w zależności od konfiguracji Supabase).
- Logowanie: `auth.signInWithPassword` → redirect do `next` lub `/dashboard` (jeśli ma aktywny plan) lub `/onboarding` (jeśli nie ma planu).
- Wylogowanie: `auth.signOut()` → `/auth/login` (zgodnie z US-003: przekierowanie na stronę logowania).
- Reset: `auth.resetPasswordForEmail(email, { redirectTo: AUTH_REDIRECT_URL })`; callback: `auth.exchangeCodeForSession()` → `auth.updateUser({ password })` → `/auth/login?reset=success`. Link resetu ważny przez 1 godzinę (zgodnie z US-004).

## 2. Logika backendowa
### 2.1. Endpointy
- Usunięto `POST /api/plans/preview` (podgląd bez logowania) - zgodnie z PRD "Brak trybu gościa", wszystkie operacje wymagają logowania.
- Istniejące endpointy planów pozostają; RLS i sesja wymuszą `user_id = auth.uid()` (po pełnej konfiguracji RLS).

### 2.2. Walidacja danych
- Zod po stronie klienta i w endpointach API planów.

### 2.3. Obsługa wyjątków
- Spójne `{ error: { code, message } }`, statusy: 400/401/409/500.

### 2.4. SSR i renderowanie (Node adapter)
- Guardy SSR w `onboarding.astro`, `dashboard.astro` oraz `plans/*`: brak `locals.user` → redirect do `/auth/login?next=...`.
- `index.astro`: zastąpiono stały `TEMP_USER_ID` sesją; redirect: zalogowany z aktywnym planem → `/dashboard`, inaczej → `/onboarding`.

## 3. System autentykacji (Supabase Auth)
### 3.1. Integracja
- Middleware tworzy per-request klienta Supabase i dołącza `locals.supabase`, `locals.session`, `locals.user` (na bazie cookie).
- Po stronie klienta: `supabase-js` z auto-refresh i eventami.

### 3.2. Reset hasła
- `resetPasswordForEmail` z `AUTH_REDIRECT_URL` wskazującym na `/auth/reset/callback` (oddzielnie dla dev/prod).
- Link resetu ważny przez 1 godzinę (zgodnie z US-004). W przypadku wygasłego linku: przyjazny komunikat i możliwość ponownego wysłania linku.

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
- Po rejestracji: redirect do `/onboarding` (US-001).
- Po logowaniu: redirect do `next` lub `/dashboard` (jeśli ma aktywny plan) lub `/onboarding` (jeśli nie ma planu).

## 6. Edge cases i ryzyka
- Potwierdzenie email: UI informuje jeśli wymagane (zależne od konfiguracji Supabase). Jeśli wymagane, użytkownik musi potwierdzić email przed pełnym dostępem; jeśli nie wymagane, użytkownik jest od razu zalogowany po rejestracji.
- Wygasły link resetu (ważność 1h): przyjazny komunikat z możliwością ponownego wysłania linku (US-004).
- SSR vs client: SSR guardy eliminują mignięcia. `onboarding.astro` wymaga guarda SSR - brak `locals.user` → redirect do `/auth/login?next=/onboarding`.
- Nowy użytkownik po rejestracji: zawsze przekierowany do `/onboarding` niezależnie od tego czy ma aktywny plan (US-001, US-005).

## 7. Konfiguracja
- Env: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `AUTH_REDIRECT_URL` (np. `http://localhost:3000/auth/reset/callback`).

## 8. Podsumowanie zgodności z PRD

### Wszystkie User Stories są realizowalne:

**US-001 (Rejestracja)**: ✅ 
- Formularz z email, hasło, potwierdzenie hasła (walidacja Zod)
- Po rejestracji → redirect do `/onboarding` (kreator planu)
- Obsługa błędów (email istnieje, słabe hasło)

**US-002 (Logowanie)**: ✅
- Formularz z email i hasło
- Po logowaniu → redirect do głównego widoku (`/dashboard` lub `/onboarding`)
- Sesja utrzymywana przez Supabase cookies

**US-003 (Wylogowanie)**: ✅
- Przycisk "Wyloguj" w Header (menu użytkownika)
- Client-side `auth.signOut()` → redirect do `/auth/login` (zgodnie z US-003)

**US-004 (Reset hasła)**: ✅
- Link "Zapomniałeś hasła?" na stronie logowania → `/auth/reset`
- Email z linkiem resetu (ważność 1h)
- Callback `/auth/reset/callback` → ustawienie nowego hasła
- Redirect do `/auth/login?reset=success` po sukcesie
- Obsługa wygasłego linku z możliwością ponownego wysłania

**US-005..US-007 (Onboarding)**: ✅
- Dostępny wyłącznie po zalogowaniu (SSR guard)
- Dwukrokowy kreator: kalorie + długość planu → data startu
- Generowanie planu wymaga zalogowania (RLS)
- Redirect po sukcesie do `/plans/{id}`

**US-008..US-015 (Plan i interakcje)**: ✅
- Wszystkie operacje wymagają logowania (RLS)
- Guardy SSR na `plans/*` i `dashboard.astro`
- Autozapis zmian przez authenticated API calls
