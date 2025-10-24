<conversation_summary>
<decisions>
Używamy synchronicznego (blokującego) generowania planu: POST /api/plans/generate z pełnoekranowym loaderem.
Zarządzanie stanem: używamy React Query (QueryClient) do fetch/mutations, cache i optimistic updates.
Uwierzytelnianie: Supabase OAuth (Google i Facebook) jako jedyny sposób logowania w MVP.
Ograniczenie aktywnych planów: jeden aktywny plan na użytkownika (409 = konflikt; domyślnie blokuj tworzenie nowego).
Podgląd przepisu: szybki modal/side-drawer zamiast dedykowanej strony.
Nawigacja dni: strzałki (prev/next) + picker daty w widoku dnia (mobile-first).
Mobile-first nawigacja: dolny bar na mobile, lewy panel na desktop.
UI kit / design system: shadcn/ui + Tailwind (atomic components w src/components/ui/).
Wyświetlanie alternatyw przy swap: maksymalnie 3 alternatywy z widocznymi kaloriami, czasem, porcjami; potwierdzenie przed wykonaniem swap.
Autosave i optymistyczne aktualizacje: natychmiastowe mutacje statusów posiłków z rollback przy błędach; konflikt 409 obsługiwany przez modal z opcjami.
</decisions>
<matched_recommendations>
Implementować prostą mapę routów odpowiadającą endpointom: /onboarding, /dashboard, /plans/{id}, /plans/{plan_id}/days/{date}, /settings.
Wykonać generowanie planu po stronie serwera jako synchroniczny POST i po sukcesie przekierować do widoku planu/dnia.
Użyć React Query do fetch/cache/mutations oraz do optimistic updates dla statusów i swapów.
Stosować Supabase Auth + centralny AuthProvider i route guards dla chronionych widoków.
Zaimplementować modal szybkiego podglądu przepisu (GET /api/recipes/{id} lub z cache).
Projektować mobile-first z dolnym paskiem na mobile i lewym panelem na desktop; DayNavigator z prev/next + date picker.
Wyraźne oznaczenia wieloporcjowości: etykiety „Ugotuj na 2 dni” / „Resztki z wczoraj” i wizualne powiązanie między dniami.
Prezentować do 3 alternatyw przy swap (GET /api/plan-meals/{id}/alternatives) i wykonać POST /api/plan-meals/{id}/swap po potwierdzeniu.
Dodać globalny ErrorBoundary i Toast system, per-component skeletony/loadingy oraz obsługę 401/403/409/500 z przyjaznymi komunikatami.
Prefetch następnego dnia planu przy przeglądaniu dnia, krótkie TTL dla plan/day cache, dłuższe cache dla katalogu przepisów; paginacja i filtrowanie po stronie API.
</matched_recommendations>
<ui_architecture_planning_summary>
Główne wymagania architektury UI
Szybkie, mobile-first UI z chronionymi widokami wymagającymi Supabase OAuth.
Synchroniczne generowanie planu (blokujący request) z natychmiastowym przejściem do widoku planu po sukcesie.
Obsługa logiki wieloporcjowości i swapów zgodnie z PRD (oznaczenia wizualne, powiązania między dniami).
Responsywność, dostępność (WCAG AA) i prosty design system (shadcn/ui + Tailwind).
Optymistyczne aktualizacje i autosave dla statusów posiłków z rollbackiem w razie błędów.
Kluczowe widoki, ekrany i przepływy użytkownika
/onboarding — formularz celu kalorycznego i długości planu; po submit wykonuje synchroniczny POST /api/plans/generate; full-screen loader → redirect do planu.
/dashboard — lista planów użytkownika (GET /api/plans) + CTA „Generuj plan”.
/plans/{id} — przegląd planu (metadane, zakres dat), linki do poszczególnych dni.
/plans/{plan_id}/days/{date} — widok dnia z 4 slotami (śniadanie, obiad, kolacja, przekąska), MealCardy, DayNavigator (prev/next + picker).
Recipe preview — modal/side-drawer z szybkim info i linkiem do źródła.
Swap flow — SwapModal pokazujący do 3 alternatyw, potwierdzenie → POST swap → aktualizacja widoku (i ewentualne usunięcie leftoveru day2).
/settings — GET/PATCH user settings (default calories, plan length).
Strategia integracji z API i zarządzania stanem
Centralny AuthProvider (Supabase client) dostarcza token do wrappera fetch (src/lib/api-client.ts).
React Query jako źródło prawdy: QueryClient, pattern keyów (e.g., ['plans'], ['plan', id], ['planDay', planId, date], ['recipe', id]).
Synchronous plan generation: mutation która blokuje UI; na sukces invaliduje/prefetchuje ['plans'] i ['plan', id].
Optimistic updates dla: zmiany statusu posiłku, lokalnego UI przy swap (z rollback na error).
Prefetch: po wejściu na dzień prefetch następnego dnia i detali recept z tej listy.
Błędy HTTP: 401 → wyloguj/redirect, 403 → komunikat dostępowy, 409 (active plan) → modal z opcjami (view existing / replace), 500 → toast + retry.
Responsywność, dostępność i bezpieczeństwo
Mobile-first Tailwind breakpoints; komponenty adaptujące layout (MealCard grid → lista na mobile).
Accessibility: semantyczne HTML, aria-labels, skip-links, focus-visible, accessible modals (trap focus), keyboard navigation dla DayNavigator, kontrast WCAG AA.
Bezpieczeństwo: token Supabase do autoryzacji API; route guards; minimalny kontekst wysyłany do serwera; RLS po stronie Supabase (zakładane w API Plan).
UX bezpieczeństwa: potwierdzenia przy operacjach modyfikujących (swap, replace plan), czytelne komunikaty przy 401/403/409.
Zasoby/Pliki rekomendowane do implementacji (skrót)
src/lib/supabase.client.ts, src/lib/api-client.ts, src/lib/react-query.ts
src/components/ui/MealCard.tsx, DayNavigator.tsx, SwapModal.tsx, PlanGeneratorForm.tsx, RecipePreviewModal.tsx
Strony: src/pages/onboarding.astro, src/pages/dashboard.astro, src/pages/plans/[id].astro, src/pages/plans/[plan_id]/days/[date].astro, src/pages/settings.astro
Operacyjne UX rules wypracowane podczas konwersacji
Domyślnie jedna aktywna sesja/planu per user.
Maks. 3 alternatywy w swap.
Ścisłe etykiety i wizualne łączenia dla posiłków wieloporcjowych.
Synchronous generation = prostszy flow dla MVP (łatwiejsza obsługa UI i komunikacja błędów).
</ui_architecture_planning_summary>
<unresolved_issues>
Szczegółowa polityka dla przepisów z 3–4 porcjami (MVP decyzja: akceptujemy, ale brak UI reguł dla >2 dni planowania szczegółów). Wymaga doprecyzowania: czy automatycznie planować 3–4 dni, czy sugerować użytkownikowi ile porcji zje.
Brak dokładnych komunikatów/tekstów UX dla błędów (401/403/409/500) — potrzebne copy/ton komunikatów.
TTL cache i polityka prefetch — wymagane konkretne wartości TTL (np. 30s/5min/1h) dla różnych zasobów.
Mechanika „replace existing plan” przy 409 — czy replace usuwa dane historyczne, czy archiwizuje plan? Potrzebna decyzja.
Obsługa offline/połączeń niestabilnych (retry/backoff) — do ustalenia, priorytet niskiego/średniego dla MVP.
Międzynarodowość (i18n) i formaty dat/kalorii — wymagane jeśli planowana wielojęzyczność.
Metryki/telemetria (analytics, error logging) — które eventy logujemy i gdzie (Sentry/Logtail)?
Dokładne wymagania wizualne/design tokens (kolory, typografia, spacing) do spójnej implementacji shadcn/ui z Tailwind.
</unresolved_issues>
</conversation_summary>