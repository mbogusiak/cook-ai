# API Endpoint Implementation Plan: `PATCH /api/plans/{id}`

## 1. Przegląd punktu końcowego
Punkt końcowy aktualizuje stan istniejącego planu (`plans`) identyfikowanego przez `id` na ścieżce. Służy do zmiany stanu planu (np. przejście w `archived`, `cancelled` itd.) i zwraca zaktualizowany obiekt planu.

## 2. Szczegóły żądania
- Metoda HTTP: PATCH
- Struktura URL: `/api/plans/{id}`
- Parametry:
  - Wymagane:
    - `id` (path) — identyfikator planu, typ: integer
    - Autoryzacja: aktywna sesja użytkownika (token/session)
  - Opcjonalne: brak
- Request Body (JSON):
  - `state`: string — nowy stan planu. Przykład:

```json
{
  "state": "archived"
}
```

Walidacja: `state` musi być jedną z wartości dozwolonych przez enum `plan_state` w schemacie bazy danych.

## 3. Wykorzystywane typy
- Wejściowe/komenda:
  - `UpdatePlanCommand` (z `src/types.ts`) — { state: Enums<'plan_state'> }
- Zwracane:
  - `PlanDTO` (z `src/types.ts`) — reprezentacja zaktualizowanego planu

## 4. Szczegóły odpowiedzi
- 200 OK — zwraca obiekt zawierający zaktualizowany plan:
  - Body: `{ "data": PlanDTO }`
- 400 Bad Request — nieprawidłowy body lub `state` poza dozwolonymi wartościami
- 401 Unauthorized — brak aktywnej sesji lub tokenu
- 403 Forbidden — użytkownik nie jest właścicielem planu (autoryzacja)
- 404 Not Found — plan o podanym `id` nie istnieje
- 500 Internal Server Error — błąd serwera / błąd bazy danych

Przykład odpowiedzi 200:

```json
{
  "data": {
    "id": 1,
    "user_id": "uuid-here",
    "state": "archived",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

## 5. Przepływ danych
1. Endpoint odbiera PATCH `/api/plans/{id}` w `src/pages/api/plans/[id].ts` (Astro server endpoint).
2. Middleware/auth: pobierz `supabase` oraz `session` z `context.locals` (zgodnie z zasadami projektu).
3. Walidacja wejścia za pomocą Zod (`UpdatePlanCommand`):
   - sprawdź, że `state` jest stringiem i należy do dozwolonych wartości enumu `plan_state`.
4. Pobierz plan z bazy (`plans`) po `id` i sprawdź, że `plan.user_id === session.user.id` (autoryzacja).
5. Wykonaj aktualizację w ramach pojedynczej transakcji (jeśli potrzeba) lub pojedynczego zapytania: ustaw `state` i `updated_at`.
6. Opcjonalnie: emituj event/wywołaj serwis cache/inwaliduj cache.
7. Zwróć zaktualizowany `PlanDTO`.

Rekomendacje implementacyjne:
- Wyodrębnić logikę aktualizacji do serwisu `plans.service.ts` (metoda `updatePlanState(planId, userId, newState)`), jeśli jeszcze nie istnieje; serwis powinien wykonywać walidacje bazy i transakcję.
- Endpoint powinien jedynie walidować request, sprawdzić uprawnienia i wywołać serwis.

## 6. Względy bezpieczeństwa
- Uwierzytelnienie: wymagaj aktywnej sesji Supabase (pobieranej z `context.locals.supabase`).
- Autoryzacja: upewnij się, że użytkownik jest właścicielem planu (`plan.user_id === session.user.id`) lub ma uprawnienia administracyjne.
- Walidacja: użyj Zod, db enum (`plan_state`) jako źródła prawdy (lub zsynchronizowanego zestawu wartości).
- RLS: preferować row-level security w Supabase; serwerowe sprawdzenie właściciela jest dodatkowym zabezpieczeniem.
- Nie ujawniać szczegółów błędów (stack trace) w odpowiedzi — logować je wewnętrznie.

## 7. Obsługa błędów
- 400 — błędna/pusta treść requestu lub `state` poza enumem; zwrócić strukturę błędu z czytelnym komunikatem.
- 401 — brak sesji/autoryzacji; zwrócić komunikat "Unauthorized".
- 403 — użytkownik nie jest właścicielem planu; zwrócić komunikat "Forbidden".
- 404 — brak planu o podanym `id`.
- 409 (opcjonalnie) — konflikt stanu (jeśli logika wymaga reguł przejść stanów).
- 500 — błąd serwera; logować szczegóły błędu w systemie logów i (opcjonalnie) w `src/lib/errors.ts`.

Logowanie:
- Użyj `src/lib/errors.ts` (jeśli dostępne) do rejestrowania błędów i metadanych (user_id, plan_id, request body).
- Nie zapisywać w logach wrażliwych danych użytkownika.

## 8. Wydajność
- Operacja to pojedynczy UPDATE na tabeli `plans` — oczekiwany niski koszt.
- Zadbaj o indeks na `id` (primary key) i `user_id`.
- Dla dużej liczby równoległych aktualizacji rozważyć prostą kolejkę / ograniczanie częstotliwości (rate limiting) na endpoint.

## 9. Kroki implementacji
1. Utworzyć/zweryfikować `UpdatePlanCommand` Zod schema w `src/lib/schemas/` (np. `plan.ts`) i mapować do `UpdatePlanCommand` z `src/types.ts`.
2. Dodać/upewnić się, że istnieje metoda w `src/lib/services/plans.service.ts`: `updatePlanState(planId: number, userId: string, newState: string): Promise<PlanDTO>`.
3. Zaimplementować endpoint `src/pages/api/plans/[id].ts` (Astro) z:
   - odczytem `supabase` i `session` z `context.locals`,
   - walidacją Zod, autoryzacją właściciela,
   - wywołaniem serwisu,
   - mapowaniem błędów na odpowiednie kody HTTP.
4. Napisać testy jednostkowe dla serwisu i testy integracyjne dla endpointu (mock Supabase lub test DB).
5. Dodać logowanie błędów do `src/lib/errors.ts` z minimalnymi metadanymi.
6. Dodać dokumentację (OpenAPI / README) opisującą użycie endpointu i przykłady odpowiedzi.
7. Przejrzeć reguły RLS w Supabase i upewnić się, że nie blokują operacji serwerowych.
8. Code review i wdrożenie.

---

