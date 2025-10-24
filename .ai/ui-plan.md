# Architektura UI dla Planer Żywieniowy

## 1. Przegląd struktury UI

Aplikacja webowa (mobile-first) oparta o Astro + React; UI zbudowany z Tailwind + shadcn/ui. Zarządzanie danymi i synchronizacją przez React Query (QueryClient). Autoryzacja przez Supabase OAuth (Google, Facebook) realizowana w centralnym `AuthProvider`. Główne zasady:

- Single active plan per user (409 conflict -> modal).  
- Synchroniczne, blokujące generowanie planu: POST `/api/plans/generate` z full-screen loaderem.  
- Optimistic updates dla statusów posiłków i autosave; rollback on error.  
- Prefetching i TTL: krótkie TTL dla `planDay`, dłuższe dla katalogu przepisów; prefetch next day on view.  
- Accessibility (WCAG AA): semantyczne HTML, focus management, aria-labels, accessible modals, keyboard navigation.

## 2. Lista widoków

- **Onboarding**
  - Ścieżka: `/onboarding`
  - Główny cel: Zebrać docelowe dzienne kalorie i długość planu; uruchomić synchroniczne generowanie planu.
  - Kluczowe informacje: pola `daily_calories`, `plan_length_days`, wybór daty startu (dzisiaj/jutro/najbliższy poniedziałek), walidacja.
  - Kluczowe komponenty: `PlanGeneratorForm`, full-screen `BlockingLoader`, `AuthGuard` (jeśli wymagane), `Toast`.
  - UX / dostępność / bezpieczeństwo: jasne walidacje, pomyślne potwierdzenia, focus na pierwszym polu, CSRF i token w nagłówkach (Supabase).

- **Dashboard (Lista planów)**
  - Ścieżka: `/dashboard`
  - Główny cel: Pokazać aktywne i historyczne plany oraz CTA "Generuj plan".
  - Kluczowe informacje: lista planów (start_date, end_date, state), CTA do `/onboarding` lub blokowanie przy istniejącym aktywnym planie (409).
  - Kluczowe komponenty: `PlansList`, `PlanCard`, `EmptyState`, `BottomCTA` (mobile) / `LeftSidebar` (desktop).
  - UX/dostępność/bezpieczeństwo: paginacja/limit, skeleton loading, RLS zabezpieczenia po stronie API.

- **Plan Overview**
  - Ścieżka: `/plans/{id}`
  - Główny cel: Meta widok planu z zakresem dat, statusem i linkami do dni.
  - Kluczowe informacje: plan metadata (start/end/state), procent ukończenia, dni (miniatury), przyciski: przejrzyj dzień, archivuj/ anuluj.
  - Kluczowe komponenty: `PlanHeader`, `PlanCalendarStrip`, `DayList`, `ActionMenu`.
  - UX/dostępność/bezpieczeństwo: potwierdzenia przy archive/cancel; obsługa 403/404.

- **Plan Day (Widok dnia)**
  - Ścieżka: `/plans/{plan_id}/days/{date}`
  - Główny cel: Pokazać cztery sloty dnia (śniadanie, obiad, kolacja, przekąska) i umożliwić interakcje (status, swap, preview).
  - Kluczowe informacje: slot targets (kalorie per slot), lista `MealCard` per slot: nazwa, zdjęcie, kcal/per porcja, time_minutes, servings, multi-portion flags (`Ugotuj na 2 dni` / `Resztki z wczoraj`).
  - Kluczowe komponenty: `DayNavigator` (prev/next + date picker), `MealCard`, `RecipePreviewModal`, `SwapModal`, `LeftoverBadge`, `MultiPortionConnector` (wizualne powiązanie dwóch dni).
  - UX/dostępność/bezpieczeństwo: keyboard navigation (przejście między slotami), aria-live dla zmian statusów, accessible modals (trap focus), optymistyczne updatey dla PATCH `/api/plan-meals/{id}` z rollback.

- **Settings (Ustawienia użytkownika)**
  - Ścieżka: `/settings`
  - Główny cel: GET/PATCH user settings (default calories, default plan length).
  - Kluczowe informacje: default_daily_calories, default_plan_length_days, metadata.
  - Kluczowe komponenty: `UserSettingsForm`, `SaveButton`, validation errors.
  - UX/dostępność/bezpieczeństwo: walidacja inputów, komunikaty serwera (401/403), autosave debounce.

- **Global / Cross-cutting Views**
  - `RecipePreviewModal` (szybki podgląd, źródło link): używa GET `/api/recipes/{id}` z cache.  
  - `SwapModal`: GET `/api/plan-meals/{id}/alternatives` → pokaż max 3; confirm → POST `/api/plan-meals/{id}/swap`.  
  - `Auth` flows: login via Supabase OAuth (zewnętrzne okno lub redirect), `AuthProvider`, `ProtectedRoute` wrapper.
  - `ErrorBoundary` + global `Toasts` i `ConfirmDialog`.

## 3. Mapa podróży użytkownika

Główny scenariusz: Nowy użytkownik generuje plan i korzysta z widoku dnia

1. Użytkownik odwiedza aplikację → jeśli niezalogowany: przekierowanie do logowania Supabase (Google/Facebook).  
2. Po pierwszym logowaniu użytkownik trafia na `/onboarding`.  
3. Wypełnia `daily_calories` i `plan_length_days` oraz wybiera datę startu.  
4. Kliknięcie `Generuj plan` uruchamia synchroniczny POST `/api/plans/generate` z full-screen loaderem (blokuje UI).  
   - Na 201: redirect do `/plans/{id}/days/{start_date}`.  
   - Na 409: wyświetl modal z opcjami: zobacz istniejący plan / zamień (replace) (potrzebna decyzja na backend).  
5. W widoku dnia: `DayNavigator` + `MealCard`y.  
   - Użytkownik może: oznaczyć posiłek jako `completed`/`skipped` (PATCH `/api/plan-meals/{id}`) — optymistyczne updatey z rollbackem.  
   - Otworzyć `RecipePreviewModal` (GET `/api/recipes/{id}` lub z cache).  
   - Zainicjować `SwapModal` → GET `/api/plan-meals/{id}/alternatives` → wybór → POST swap → UI updates (jeśli swap day1 -> usuń leftover day2 i wygeneruj nowy).  
6. Po interakcjach autosave dokonuje się przez mutacje React Query; system pokazuje toasty o sukcesie/błędach.  
7. Użytkownik przegląda kolejne dni (prefetch next day), wraca do dashboard lub settings.

## 4. Układ i struktura nawigacji

- **Mobile (mobile-first)**
  - Dolny bar nawigacyjny z 3–4 ikonami: `Dashboard`, `Plan (today)`, `Generate / Onboarding`, `Settings`.
  - DayNavigator UI w sticky header dnia (prev/next + date picker) z gesture support.

- **Desktop**
  - Lewy panel (persistent) z: logo, `Dashboard`, `Plans`, `Generate`, `Settings`; główna strefa content.
  - Topbar: globalny search (recipe), użytkownik menu (logout), szybki dostęp do active plan.

- **Route guards / Auth**
  - `ProtectedRoute` lub layout-level guard: jeśli 401 → redirect do login; 403 → show access denied.  
  - Token Supabase w nagłówku fetch wrapper (`src/lib/api-client.ts`).

## 5. Kluczowe komponenty

- `AuthProvider` — dostarcza supabase client, user state, signIn/ signOut helpers.
- `QueryClientProvider` — centralny React Query client z ustawieniami cache/prefetch.
- `PlanGeneratorForm` — formularz onboard/generate z walidacją i blokującą mutacją.
- `BlockingLoader` — full-screen loader z accessible announcement (aria-busy, aria-live).
- `PlansList` / `PlanCard` — lista i reprezentacja planów.
- `PlanHeader` — meta informacji planu + akcje (archive/cancel).
- `DayNavigator` — prev/next + date picker, keyboard accessible.
- `MealCard` — kluczowy komponent: nazwa, obraz, kcal, time, servings, status control (toggle), swap button, preview button, leftover/multi-portion badges.
- `RecipePreviewModal` — szybki modal side-drawer z linkiem do źródła; focus trap.
- `SwapModal` — pokazuje do 3 alternatyw, each alt shows calories/time/servings, confirmation step.
- `MultiPortionConnector` — UI affordance łączący dwa dni dla posiłków wieloporcjowych.
- `Toast` / `ConfirmDialog` / `ErrorBoundary` — globalne cross-cutting komponenty.
- `ApiClient` wrapper (`src/lib/api-client.ts`) — dołączający token i centralizujący timeout/retries/429 handling.

## 6. Mapowanie endpointów API i ich przeznaczenie

- `GET /api/recipes` — katalog przepisów, filtry (slot, calories), paginacja.
- `GET /api/recipes/{id}` — szczegóły przepisu (używane w `RecipePreviewModal`).
- `GET /api/user-settings` — pobierz ustawienia użytkownika.
- `POST /api/user-settings` / `PATCH /api/user-settings` — tworzenie/aktualizacja ustawień.
- `GET /api/plans` — lista planów na dashboard.
- `POST /api/plans/generate` — synchroniczne generowanie planu (blocking flow).  
- `GET /api/plans/{id}` — szczegóły planu z dniami/posiłkami.  
- `PATCH /api/plans/{id}` — zmiana stanu planu (archive/cancel).
- `GET /api/plans/{plan_id}/days/{date}` — dane jednego dnia (slot_targets, meals) — główne źródło dla `Plan Day`.
- `PATCH /api/plan-meals/{id}` — update status posiłku (completed/skipped) — używać z optimistic updates.
- `GET /api/plan-meals/{id}/alternatives` — propozycje do swap (max 3).
- `POST /api/plan-meals/{id}/swap` — wykonanie swapu; backend zwraca listę zaktualizowanych posiłków.

## 7. Mapowanie historyjek użytkownika (PRD) do widoków / komponentów

- US-001 / US-002 / US-003 (Logowanie/wylogowanie): `AuthProvider`, Login redirect, `UserMenu`.
- US-004 / US-005 / US-006 (Onboarding i generowanie planu): `Onboarding` (`PlanGeneratorForm`) → POST `/api/plans/generate` + `BlockingLoader`.
- US-007 / US-008 (Przeglądanie planu i nawigacja dni): `PlanOverview`, `Plan Day`, `DayNavigator`.
- US-009 / US-010 (Oznaczanie ukończony/pominięty): `MealCard` status control → PATCH `/api/plan-meals/{id}`.
- US-011 / US-012 (Wymiana posiłku i wybór alternatyw): `SwapModal` (GET alternatives + POST swap) + confirmation.
- US-013 (Autosave): Wszystkie mutacje są zapisywane automatycznie; React Query mutations z retry/rollback.
- US-014 (Multi-portion): `MealCard` badge `Ugotuj na 2 dni`, `MultiPortionConnector` i automatyczne planowanie leftoveru.

## 8. Wymagania → elementy UI (wyciąg)

- Walidacja i formularz onboarding → `PlanGeneratorForm` z client-side validation.
- Blokujące generowanie planu → `BlockingLoader` + disabled controls.
- Oznaczenia wieloporcjowości → `LeftoverBadge`, `MultiPortionConnector` i dodatkowy label na `MealCard`.
- Swap → `SwapModal` (max 3 alts) + confirm step + post-swap reconciliation in UI.
- Autosave & optimistic updates → Mutation hooks z rollback i toasty błędów.
- Prefetch → prefetch next day on mount of day view (`queryClient.prefetchQuery(['planDay', planId, nextDate])`).
- Error handling → `ErrorBoundary`, per-request handling for 401/403/409/500 (toasty/modal flows).

## 9. Stany błędów i przypadki brzegowe

- **401 Unauthorized**: global handler → signOut + redirect do login + toast "Sesja wygasła".
- **403 Forbidden**: show inline error + do not expose controls; log event.
- **404 Not Found**: plan/day not found → user-friendly page z CTA do `Dashboard`.
- **409 Conflict (active plan exists)**: show `ActivePlanConflictModal` z opcjami: przejrzyj istniejący / replace (confirm). Implementacja replace wymaga decyzji backend.
- **500 Server Error / Network**: toast + retry option; for generation show full-screen error with retry.
- **Swap edge cases**: brak alternatyw → informacja i CTA "Szukaj ręcznie"; swap day1 (multi-portions) → ensure leftover day2 is removed.
- **Multi-serving >2**: MVP: akceptujemy, oznaczamy jako multi-portion; UI nie automatycznie planuje 3–4 dni (needs product decision).
- **Slow generation**: provide progress indicator + cancel? MVP: blocking loader with timeout + helpful message.
- **Offline**: optimistic UI may fail; show offline toast and retry queue (low priority for MVP).

## 10. Zgodność z API (kontrola)

- Wszystkie operacje CRUD są mapowane do endpointów w API Plan; komponenty korzystają z query keys: `['plans']`, `['plan', id]`, `['planDay', planId, date]`, `['recipe', id]`, `['planMealAlternatives', mealId]`.
- Mutations:
  - Generate: mutation -> onSuccess invalidate `['plans']` and prefetch `['plan', id]` and `['planDay', planId, startDate]`.
  - Status update: PATCH `/api/plan-meals/{id}` optimistic update and invalidate `['planDay', planId, date]` on settled.
  - Swap: POST `/api/plan-meals/{id}/swap` -> update affected queries and handle leftover logic returned from backend.

## 11. Potencjalne punkty bólu użytkownika i jak UI je rozwiązuje

- Czas generowania planu (frustracja): blokujący loader z jasnym komunikatem i retry/FAQ; ewentualne progresyjne komunikaty.
- Niezrozumiałe multi-portion behavior: jasne etykiety (`Ugotuj na 2 dni` / `Resztki z wczoraj`) i tooltipy wyjaśniające rozkład porcji.
- Konflikt aktywnego planu (409): modal z jasnymi opcjami (przejrzyj/replace) zamiast cichego błędu.
- Utrata sesji: globalny handler 401 → szybkie ponowne logowanie, informacja dla użytkownika.
- Nieprzystępne modale / keyboard navigation: focus trap, aria labels, testy keyboard-only flows.
