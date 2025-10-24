## Plan implementacji widoku Dashboard (Lista planów)

## 1. Przegląd
Widok prezentuje listę planów użytkownika z podziałem na aktywne i historyczne oraz umożliwia wejście w proces tworzenia nowego planu. Zawiera paginację, skeleton loading, stany błędów/pustki i CTA „Generuj plan” z nawigacją do `/onboarding` (blokada/wyjaśnienie przy istniejącym aktywnym planie). Widok korzysta z endpointu `GET /api/plans` oraz typów `PlanDTO`, `PlansListResponse`.

## 2. Routing widoku
- Ścieżka: `/dashboard`
- Implementacja strony: `src/pages/dashboard.astro` (Astro, wyspa React dla części dynamicznej)
- Wymagania: dostęp tylko po zalogowaniu (sesja Supabase, weryfikowana globalnie w `src/middleware/index.ts`); w przypadku braku sesji – przekierowanie na ekran startowy/login.

## 3. Struktura komponentów
- `DashboardPage` (Astro)
  - `LeftSidebar` (desktop ≥ md)
  - `PlansList` (React)
    - `PlansToolbar` (filtry stanu, licznik wyników)
    - `PlansListContent`
      - `PlanCard` (powtarzalny)
      - `SkeletonList` (loading)
      - `EmptyState` (brak danych)
    - `PaginationControls`
  - `BottomCTA` (mobile ≤ md)

## 4. Szczegóły komponentów
### DashboardPage (Astro)
- Opis: Layout strony i osadzenie wyspy Reacta, responsywne rozmieszczenie sidebara/CTA.
- Elementy: kontener, grid (Tailwind), sloty na sidebar, główną listę, stałe CTA mobilne.
- Interakcje: brak (rola layoutu), nawigacja linkami do dzieci.
- Walidacja: brak.
- Typy: brak (warstwa Astro), przekazuje propsy statyczne lub nic; dane pobierane w React.
- Propsy: brak.

### LeftSidebar
- Opis: Nawigacja/CTA w układzie desktop – przycisk „Generuj plan”, opcjonalne linki pomocnicze.
- Elementy: `Card`, `Button` (shadcn/ui), sekcje informacyjne.
- Interakcje: kliknięcie „Generuj plan” -> nawigacja do `/onboarding`.
- Walidacja: disable/przypięcie komunikatu, jeśli istnieje aktywny plan (informacja pobrana z `usePlansQuery` lub dedykowanego guardu).
- Typy: `ActivePlanPresence` (boolean), opcjonalny `onGenerateClick?: () => void`.
- Propsy: `{ hasActivePlan: boolean }`.

### PlansList (kontener danych)
- Opis: Zarządza stanem zapytań, filtrami i paginacją; renderuje toolbar, listę, paginację.
- Elementy: wrapper, `PlansToolbar`, `PlansListContent`, `PaginationControls`.
- Interakcje: zmiana filtra stanu, zmiana strony, klik na kartę planu -> nawigacja do szczegółów (np. `/plans/[id]`).
- Walidacja: `limit` 1..50, `offset` ≥ 0; `state` ∈ {`active`, `archived`, `cancelled`} lub brak.
- Typy: `PlansQueryParams`, `PlansListVM`, `FetchState<PlansListVM>`.
- Propsy: opcjonalnie initialParams z URL (SSR/rehydracja): `{ initialState?: PlanStateFilter; initialPage?: number; pageSize?: number }`.

### PlansToolbar
- Opis: Pasek filtrów i informacji o liczbie wyników.
- Elementy: select/segmented control dla stanu, licznik „total”, opcjonalnie przycisk „Resetuj”.
- Interakcje: `onStateChange(state)`, `onReset()`.
- Walidacja: filtr tylko po dozwolonych stanach.
- Typy: `PlanStateFilter`, zdarzenia callbacków.
- Propsy: `{ state: PlanStateFilter; total: number; onStateChange: (s: PlanStateFilter) => void; }`.

### PlansListContent
- Opis: Renderuje listę kart planów, lub skeleton/empty/error.
- Elementy: `PlanCard[]`, `SkeletonList`, `EmptyState`, blok błędu.
- Interakcje: klik karty -> przejście do szczegółów planu.
- Walidacja: brak – rely on upstream.
- Typy: `PlanListItemVM[]`, `ViewStatus`.
- Propsy: `{ items: PlanListItemVM[]; status: ViewStatus; error?: string }`.

### PlanCard
- Opis: Pojedyncza karta planu: `start_date`, `end_date`, `state`, metadane.
- Elementy: `Card`, `Badge` (state), daty sformatowane, przycisk „Otwórz”.
- Interakcje: klik całej karty/CTA -> `/plans/[id]`.
- Walidacja: formaty dat ISO -> locale; stan wyświetlany jako badge.
- Typy: `PlanListItemVM`.
- Propsy: `{ plan: PlanListItemVM; onOpen?: (id: number) => void }`.

### SkeletonList
- Opis: Lista placeholderów na czas ładowania.
- Elementy: 6–10 skeletonów kart.
- Interakcje: brak.
- Walidacja: brak.
- Typy: brak.
- Propsy: `{ count?: number }`.

### EmptyState
- Opis: Komunikat, gdy brak planów; CTA „Generuj plan”.
- Elementy: ikona/ilustracja, tekst, `Button`.
- Interakcje: klik „Generuj plan” -> `/onboarding`.
- Walidacja: jeśli istnieje aktywny plan, CTA prezentuje komunikat zamiast linku.
- Typy: `{ hasActivePlan: boolean }`.
- Propsy: `{ hasActivePlan: boolean }`.

### PaginationControls
- Opis: Nawigacja stronami (prev/next, numery, info „x–y z total”).
- Elementy: `Button`, `Select` rozmiaru strony (opcjonalnie), etykiety.
- Interakcje: `onPageChange`, `onPageSizeChange`.
- Walidacja: nie wyjść poza zakres; `limit` ≤ 50.
- Typy: `PaginationState`.
- Propsy: `{ pagination: PaginationState; onChange: (next: PaginationState) => void }`.

### BottomCTA (mobile)
- Opis: Przyklejony u dołu przycisk „Generuj plan”.
- Elementy: `Button` pełnej szerokości.
- Interakcje: klik -> `/onboarding` (lub komunikat, jeśli aktywny plan).
- Walidacja: disable/przypięty komunikat przy aktywnym planie.
- Typy: `{ hasActivePlan: boolean }`.
- Propsy: `{ hasActivePlan: boolean }`.

## 5. Typy
- Reużywane z backendu (`src/types.ts`):
  - `PlanDTO`: id, user_id, state, start_date, end_date, created_at, updated_at.
  - `PlansListResponse`: `{ data: PlanDTO[]; pagination: PaginationMeta }`.
- Nowe typy UI:
  - `type PlanStateFilter = 'all' | 'active' | 'archived' | 'cancelled'`
  - `type PlansQueryParams = { state?: Exclude<PlanStateFilter, 'all'>; limit: number; offset: number }`
  - `type PlanListItemVM = { id: number; startDateLabel: string; endDateLabel: string; state: PlanDTO['state']; isActive: boolean }`
  - `type ViewStatus = 'idle' | 'loading' | 'success' | 'error'`
  - `type PaginationState = { total: number; limit: number; offset: number; hasMore: boolean; currentPage: number; totalPages: number }`
  - `type PlansListVM = { items: PlanListItemVM[]; pagination: PaginationState; hasActivePlan: boolean; total: number }`
  - `type FetchState<T> = { status: ViewStatus; data?: T; error?: string }`
  - `type ActivePlanPresence = boolean`

Uwagi: VM formatuje daty z ISO na krótkie etykiety locale i dodaje flagę `hasActivePlan` do sterowania CTA.

## 6. Zarządzanie stanem
- Custom hook: `usePlansQuery(params)`
  - Odpowiedzialność: budowa URL z `limit/offset/state`, fetch, mapowanie `PlansListResponse` → `PlansListVM`, obsługa `status/error`, memoizacja.
  - API: zwraca `{ state: FetchState<PlansListVM>; params: PlansQueryParams; setParams: (p) => void }`.
- Custom hook: `useActivePlanGuard(state)`
  - Odpowiedzialność: szybka detekcja aktywnego planu (na bazie `PlansListVM.hasActivePlan` lub osobnego lekkiego zapytania, jeśli dostępne w przyszłości).
  - API: `{ hasActivePlan: boolean; getBlockedCtaMessage(): string }`.
- Synchronizacja z URL: opcjonalna (query `?state=active&page=2`), przez `useEffect` i `history.replaceState` w Astro/React.

## 7. Integracja API
- Endpoint: `GET /api/plans`
- Query params: `state?`, `limit` (domyślnie 10, max 50), `offset` (domyślnie 0).
- Typy: request budowane z `PlansQueryParams`; response: `PlansListResponse`.
- Mapowanie:
  - `items = data.map(dto => ({ id: dto.id, startDateLabel: fmt(dto.start_date), endDateLabel: fmt(dto.end_date), state: dto.state, isActive: dto.state === 'active' }))`
  - `hasActivePlan = data.some(d => d.state === 'active')`
  - `pagination` z `pagination` + obliczenie `currentPage = offset/limit + 1`, `totalPages = ceil(total/limit)`.
- Błędy: 401 (brak sesji) → przekierowanie do loginu/startu; 500 → komunikat w UI + retry.

## 8. Interakcje użytkownika
- Zmiana filtra stanu → odświeżenie listy (reset `offset` do 0).
- Zmiana strony → aktualizacja `offset = (page-1)*limit` i refetch.
- Klik karty planu → przejście do `/plans/[id]` (szczegóły planu dziennego).
- Klik „Generuj plan” → `/onboarding`; jeśli `hasActivePlan === true`, pokazujemy tooltip/alert wyjaśniający (unikamy wywołania, które może skończyć 409 na generacji).

## 9. Warunki i walidacja
- `limit` w [1, 50]; jeśli z UI wybrano większy – przyciąć do 50.
- `offset` ≥ 0; dla zmiany strony wyliczany deterministycznie.
- `state` tylko z dozwolonego zbioru; dla „Wszystkie” pomijamy parametr.
- Dla braku danych: EmptyState; dla błędu: blok błędu i przycisk „Spróbuj ponownie”.
- Dostępność: focus-ring dla interaktywnych elementów, etykiety ARIA dla paginacji, skeleton ma atrybuty `aria-busy`.

## 10. Obsługa błędów
- 401 Unauthorized: przekierowanie (middleware) lub w komponencie – soft redirect do strony startowej; komunikat „Sesja wygasła”.
- 500 Internal Server Error: komunikat inline, możliwość retry; log do konsoli tylko w dev.
- Sieć/offline: wykrycie `navigator.onLine`, komunikat offline i retry po odzyskaniu.
- Brak danych: `EmptyState` z CTA; jeśli `hasActivePlan`, CTA z informacją o blokadzie utworzenia nowego planu (edukacja użytkownika).

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/dashboard.astro` z layoutem (`src/layouts/Layout.astro`) i kontenerem na wyspę React.
2. Struktura UI: dodaj folder `src/components/dashboard/` i puste pliki: `PlansList.tsx`, `PlansToolbar.tsx`, `PlansListContent.tsx`, `PlanCard.tsx`, `SkeletonList.tsx`, `EmptyState.tsx`, `PaginationControls.tsx`, `LeftSidebar.tsx`, `BottomCTA.tsx`.
3. Typy: dodaj `src/types.ts` uzupełnienie (tylko typy UI lokalne w komponentach/`src/components/dashboard/types.ts`), nie modyfikuj kontraktów API.
4. Hooki: zaimplementuj `usePlansQuery.ts` i `useActivePlanGuard.ts` w `src/components/dashboard/` lub `src/lib/hooks/`.
5. Integracja API: w `usePlansQuery` zaimplementuj `fetch('/api/plans?state=...&limit=...&offset=...')`, mapowanie do VM, skeleton i stany błędów.
6. Toolbar: dodaj filtr stanu i podłącz do `setParams`; reset `offset` po zmianie filtra.
7. Lista: render `SkeletonList` podczas ładowania; `PlanCard` dla wyników; `EmptyState` przy braku danych.
8. Paginacja: `PaginationControls` z przeliczeniem `offset` i aktualizacją stanu; zablokuj przyciski na krańcach.
9. CTA: `LeftSidebar` (desktop) i `BottomCTA` (mobile) – odczyt `hasActivePlan` z hooka i odpowiednie zachowanie CTA.
10. Responsywność i dostępność: klasy Tailwind, ARIA dla paginacji, focus-visible.
11. Testy manualne: scenariusze – brak planów, 1 aktywny, wiele historycznych, błąd 500, brak sesji.
12. Telemetria (opcjonalnie): zdarzenia widoku (zmiana filtra, klik karty, klik CTA) – przygotuj miejsca pod integrację.


