# API Endpoint Implementation Plan: GET /api/plans/{plan_id}/days/{date}

## 1. Przegląd punktu końcowego
Ten endpoint zwraca pojedynczy dzień dla istniejącego planu (plan_id) z pełnymi danymi posiłków oraz celami kalorycznymi dla slotów dnia. Służy do wyświetlania widoku dziennego planu w aplikacji.

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/api/plans/{plan_id}/days/{date}`
- Parametry:
  - Wymagane:
    - `plan_id` (path) — numer identyfikujący plan (integer / bigint)
    - `date` (path) — data w formacie ISO yyyy-mm-dd (string)
  - Opcjonalne: brak
- Request Body: brak (GET)

## 3. Wykorzystywane typy
- `PlanDayResponse` (z `src/types.ts`) — odpowiada strukturze dnia planu zwracanej przez endpoint.
- `MealResponse`, `RecipeInMealResponse`, `SlotTargetResponse` (wszystkie w `src/types.ts`) — używane do opisu zagnieżdżonych struktur w `PlanDayResponse`.

## 4. Szczegóły odpowiedzi
- Kody statusu:
  - 200 OK — znaleziono i zwrócono dzień planu
  - 400 Bad Request — niepoprawny `plan_id` lub `date` (walidacja)
  - 401 Unauthorized — brak sesji/auth (użyj `context.locals.supabase` wg zasad backendu)
  - 403 Forbidden — użytkownik próbuje uzyskać dostęp do planu, który nie należy do niego
  - 404 Not Found — plan lub dzień w planie nie istnieje
  - 500 Internal Server Error — błąd po stronie serwera
- Sukces (200) — struktura:
```json
{
  "data": {
    "id": number,
    "plan_id": number,
    "date": "YYYY-MM-DD",
    "meals": [
      {
        "id": number,
        "slot": "breakfast|lunch|dinner|snack",
        "status": "planned|completed|skipped",
        "calories_planned": number,
        "portion_multiplier": number,
        "portions_to_cook": number|null,
        "multi_portion_group_id": string|null,
        "is_leftover": boolean,
        "recipe": {
          "id": number,
          "name": string,
          "image_url": string|null,
          "time_minutes": number|null,
          "source_url": string|null,
          "available_slots": ["breakfast","lunch","dinner","snack"]
        }
      }
    ],
    "slot_targets": [
      { "slot": "breakfast|lunch|dinner|snack", "calories_target": number }
    ]
  }
}
```

## 5. Przepływ danych
1. Autoryzacja: Odczytaj sesję użytkownika z `context.locals.supabase` (wg `backend` rules). Jeśli brak sesji -> 401.
2. Walidacja wejścia: `plan_id` musi być liczbą całkowitą; `date` musi być parsowalną datą (ISO yyyy-mm-dd). Jeśli nie — 400.
3. Pobranie planu: Zapytanie do `plans` po `id`.
   - Jeśli brak planu -> 404.
   - Weryfikacja właściciela: `plan.user_id` musi odpowiadać `session.user.id` (jeśli nie -> 403).
4. Pobranie `plan_days` dla podanej `date` i `plan_id` (unikat `plan_id` + `date`).
   - Jeśli brak rekordu dnia -> 404.
5. Pobranie `plan_day_slot_targets` powiązanych z tym `plan_day_id`.
6. Pobranie `plan_meals` powiązanych z `plan_day_id` (unikat `plan_day_id` + `slot`) wraz z powiązanymi `recipes` (zależności: `recipes.calories_kcal`, `recipes.portions`, `recipes.available_slots`, `recipes.time_minutes`, `recipes.image_url`, `recipes.source_url`).
7. Mapowanie pól DB -> DTO (`MealResponse`, `RecipeInMealResponse`, `SlotTargetResponse`).
8. Zwrócenie odpowiedzi 200 z danymi.

Logika biznesowa / service:
- Wyodrębnić pobieranie i mapowanie do `planDays.service.ts` (jeśli nie istnieje — utworzyć w `src/lib/services/`) z funkcją `getPlanDay(supabaseClient, userId, planId, date)` zwracającą `PlanDayResponse | null`.
- Service będzie odpowiadać za transakcję/atomiczne zapytania i mapowanie denormalizowanych pól (`portion_multiplier`, `calories_planned`, `is_leftover`, `portions_to_cook`, `multi_portion_group_id`).

## 6. Walidacja
- Użyć Zod do walidacji parametrów: `z.object({ plan_id: z.string().regex(/^[0-9]+$/).transform(Number), date: z.string().refine(isISODate) })` w warstwie endpointu.
- Dodatkowe zabezpieczenia: po pobraniu danych sprawdzić zakresy pól:
  - `calories_planned` > 0
  - `portion_multiplier` > 0
  - `slot` w enumeracji meal_slot
- Fail-fast: zwrócić 400 przy pierwszym wykrytym błędzie walidacji.

## 7. Rejestrowanie błędów
- Błędy krytyczne serwera (500) logować za pomocą istniejącego systemu logów (np. console.error + zewnętrzne narzędzie jak Sentry, jeśli zintegrowane).
- Dodatkowo, rozważyć zapisywanie inspekcyjnych błędów/walidacji w `errors` table jeśli istnieje — jeśli nie, zaprojektować lekką tabelę `api_error_logs(id, route, user_id, payload, error_message, created_at)` i zapisywać tam tylko błędy 500 dla późniejszego śledzenia.

## 8. Względy bezpieczeństwa
- Autoryzacja: Użyć `session.user.id` z Supabase session. Nie pobierać Supabase klienta globalnego; używaj `context.locals.supabase` zgodnie z `backend` rules.
- RLS: Założyć, że tabele posiadają row-level security; jednak serwerowy endpoint nadal weryfikuje, że `plan.user_id === session.user.id`.
- Input sanitization: walidacja Zod i parametryzowane zapytania SQL (supabase query builder używa bezpiecznych zapytań).
- Rate limiting: Rozważyć limit na endpoint generujący plan (nie dotyczy tego read-only endpointu), ale warto dodać ogólne limity.

## 9. Obsługa błędów i scenariusze
- 400 Bad Request
  - Nieprawidłowy format `plan_id` lub `date`.
  - Pola nie przechodzą walidacji (np. `date` poza dopuszczalnym zakresem) — zwróć komunikat z krótką informacją.
- 401 Unauthorized
  - Brak sesji lub sesja nieważna.
- 403 Forbidden
  - Użytkownik próbuje uzyskać dane planu innego użytkownika.
- 404 Not Found
  - Brak planu o podanym `plan_id`.
  - Brak `plan_day` dla tej daty.
- 500 Internal Server Error
  - Błąd zapytania do DB, niespodziewany wyjątek w service — loguj i zwróć 500.

## 10. Wydajność
- Zapytania: pobierz `plan`, `plan_day`, `plan_day_slot_targets`, `plan_meals` + `recipes` za pomocą minimalnej liczby zapytań (preferuj pojedyncze zapytanie z joinami lub batched queries zamiast n+1).
- Indeksy i constraints: upewnij się, że istnieją indeksy na `plans.id`, `plan_days(plan_id, date)`, `plan_meals(plan_day_id)`.
- Denormalizacja: `plan_meals` już zawiera `calories_planned` i `portion_multiplier` co przyspiesza zapytania.
- Cache: rozważyć krótkie cache w warstwie CDN lub serwera dla często wyświetlanych dni.

## 11. Kroki implementacji
1. Utwórz/otwórz serwis `src/lib/services/planDays.service.ts`.
   - Dodaj funkcję `getPlanDay(supabaseClient, userId, planId, date): Promise<PlanDayResponse | null>` implementującą logikę pobierania i mapowania.
2. W `src/pages/api/plans/[id].ts` lub odpowiednim pliku routingu (wg istniejącej struktury — endpointy planów znajdują się w `src/pages/api/plans/`) dodaj handler dla GET `/api/plans/{plan_id}/days/{date}` lub utwórz nowy plik route `src/pages/api/plans/[plan_id]/days/[date].ts` jeśli konwencja folderów obsługuje to wygodnie.
3. Walidacja: Zaimplementuj Zod schema dla parametrów i weryfikuj przed wywołaniem serwisu.
4. Autoryzacja: Pobierz sesję z `context.locals.supabase`, wyciągnij `session.user.id`.
5. Wywołanie serwisu `getPlanDay(...)` i obsłuż zwrócone wyniki -> odpowiedni status (200/404).
6. Testy jednostkowe i integracyjne:
   - Testy serwisu `getPlanDay` z mockowanym supabase klientem.
   - Testy endpointu sprawdzające wszystkie kody błędów (400,401,403,404,500) i scenariusz sukcesu.
7. Linting & typy: upewnij się, że pliki są zgodne z `tsconfig` i project conventions.
8. Rejestr zmian: dodaj wpis w changelogu lub PR opisujący zmiany oraz ewentualne migracje indeksów.

## 12. Przykładowy pseudokod endpointu (schemat)
```ts
// endpoint handler
export async function GET(context) {
  const { params, locals } = context;
  const session = await locals.supabase.auth.getSession();
  if (!session) return new Response(null, { status: 401 });

  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return json({ error: 'Invalid params' }, { status: 400 });

  const planDay = await getPlanDay(locals.supabase, session.user.id, parsed.data.plan_id, parsed.data.date);
  if (!planDay) return json({ error: 'Not found' }, { status: 404 });

  return json({ data: planDay }, { status: 200 });
}
```

