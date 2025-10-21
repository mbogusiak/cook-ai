# API Endpoint Implementation Plan: GET /api/plan-meals/{id}/alternatives

## 1. Przegląd punktu końcowego
Krótki opis: Zwraca listę alternatywnych przepisów (maksymalnie 3) dla konkretnego zaplanowanego posiłku (`plan_meal`). Alternatywy muszą należeć do tego samego slotu (np. `breakfast`, `lunch`, `dinner`, `snack`) i spełniać kryterium kaloryczne (±20% docelowej kaloryczności dla slotu / planowanego posiłku). Punkt końcowy służy UI do umożliwienia wymiany posiłku.

## 2. Szczegóły żądania
- Metoda HTTP: `GET`
- Struktura URL: `/api/plan-meals/{id}/alternatives`
- Parametry:
  - Wymagane:
    - `id` (ścieżka): identyfikator zaplanowanego posiłku (`plan_meals.id`), musi być liczba całkowita.
  - Opcjonalne:
    - `limit` (query): liczba alternatyw do zwrócenia (domyślnie 3, max 10) — implementacja powinna narzucać limit maksymalny.
- Request Body: brak (GET)

## 3. Wykorzystywane typy (DTO / Command)
- `RecipeDTO` (z `src/types.ts`): minimalny zestaw pól zwracanych dla przepisu: `id`, `slug`, `name`, `available_slots`, `calories_per_serving`, `servings`, `time_minutes`, `image_url`, `source_url`.
- `AlternativesResponse` (z `src/types.ts`): `{ data: RecipeDTO[] }`
- Wewnątrz serwisu: `PlanMeal` model (reprezentujący rekord z `plan_meals`), `PlanDaySlotTarget` (rekord z `plan_day_slot_targets`) jeśli potrzebne do obliczeń.

## 4. Szczegóły odpowiedzi
- 200 OK — sukces, zwraca JSON: `AlternativesResponse` z 0..N elementami (N ≤ limit).
- 400 Bad Request — niepoprawny `id` (np. nie liczba) lub niepoprawne query params.
- 401 Unauthorized — brak sesji / użytkownik niezalogowany.
- 403 Forbidden — użytkownik próbuje uzyskać dostęp do `plan_meal` należącego do innego użytkownika.
- 404 Not Found — brak `plan_meal` o podanym `id`.
- 500 Internal Server Error — nieoczekiwany błąd serwera.

Przykład odpowiedzi 200:
```json
{
  "data": [
    { /* RecipeDTO */ }
  ]
}
```

## 5. Przepływ danych
1. Autoryzacja: odczytaj kontekst sesji z `context.locals` (Supabase session). Jeśli brak sesji -> 401.
2. Walidacja `id` (ścieżka) i `limit` (query) za pomocą Zod.
3. Pobierz `plan_meal` po `id` (z `plan_meals`), weryfikując, że `user_id` z rekordu równa się `session.user.id` (lub innemu mechanizmowi RLS).
4. Jeśli `plan_meal` nie istnieje -> 404.
5. Wyznacz docelową kaloryczność porcji do porównania:
   - Preferowane: użyć `plan_meal.calories_planned` i `plan_meal.portion_multiplier` do wyliczenia `target_calories_per_serving = plan_meal.calories_planned / plan_meal.portion_multiplier` jeśli `portion_multiplier` > 0.
   - Alternatywnie (fallback): pobierz `plan_day_slot_targets.calories_target` dla odpowiedniego `plan_day` i `slot` i użyj go / domyślnie podziel na 1 porcji.
6. Zapytanie do `recipes` (lub widoku zoptymalizowanego):
   - Filtr `available_slots` zawiera `slot` (tylko przepisy dopuszczone do tego slotu).
   - Wyklucz aktualny `recipe_id` powiązany z `plan_meal`.
   - Warunek kaloryczny: `recipes.calories_per_serving BETWEEN target*0.8 AND target*1.2`.
   - ORDER BY losowość (lub popularność, czas przygotowania — biznesowo) i LIMIT `limit`.
7. Mapowanie wyników na `RecipeDTO` i zwrócenie `AlternativesResponse`.

Zalecenie: wyodrębnij logikę zapytań do serwisu np. `src/lib/services/planMeals.service.ts` jako metoda `getAlternativesForMeal(mealId: number, userId: string, limit?: number): Promise<RecipeDTO[]>`.

## 6. Walidacja danych wejściowych
- Użyć Zod dla:
  - `params`: `{ id: z.string().regex(/^[0-9]+$/).transform(Number) }`.
  - `query`: `{ limit: z.string().optional().transform(s => s ? Number(s) : 3) }` z ograniczeniami `1 <= limit <= 10`.
- Po stronie serwisu dodatkowe sprawdzenia: `portion_multiplier > 0`, `calories_planned > 0`. W przypadku niezgodności — 400.

## 7. Rejestrowanie błędów i monitoring
- Użyć istniejącego helpera `src/lib/errors.ts` do strukturalnego logowania błędów (stack, message, context). W przypadku krytycznych błędów wewnętrznych zapisać rekord w systemie logów (Sentry / Logtail) oraz zwrócić 500.
- (Opcjonalnie) Dodać tabelę `api_errors` lub korzystać z istniejącego mechanizmu zapisu błędów jeżeli projekt już ma centralny logger.

## 8. Względy bezpieczeństwa
- Autoryzacja: wymagaj autoryzowanej sesji Supabase (session w `context.locals.supabase`).
- Autoryzacja zasobowa: weryfikuj, że `plan_meal.user_id` == `session.user.id` (lub że `plan_meal.plan_id` należy do planu użytkownika) — nie ufać tylko client-side.
- RLS: jeżeli aplikacja używa RLS, wykonywać zapytania w kontekście serwera z supabase klientem z kluczem serwera lub użyć funkcji backendowej użytkującej `context.locals.supabase` i sprawdzać `user_id` lokalnie.
- Sanitizacja: Zod zapewnia walidację wejścia; unikać wstrzyknięć SQL poprzez użycie parametrów zapytań w Supabase/pg client.

## 9. Scenariusze błędów i kody statusów
- Nieprawidłowy `id` (format) -> 400 Bad Request
- Brak autoryzacji (brak sesji) -> 401 Unauthorized
- `plan_meal` nie istnieje -> 404 Not Found
- `plan_meal` istnieje, ale należy do innego użytkownika -> 403 Forbidden
- Brak pasujących alternatyw -> 200 OK, `data: []` (nie traktuj jako błąd)
- Operational DB error / timeout -> 500 Internal Server Error

## 10. Wydajność i skalowalność
- Indeksy: upewnić się, że `recipes.calories_per_serving` i pola używane do filtrowania (`available_slots` — GIN index dla tablicy/enumów) są indeksowane.
- Ograniczenia: `LIMIT` (domyślnie 3) aby ograniczyć koszty i czas odpowiedzi.
- Cache: rozważyć krótkotrwały cache (in-memory lub HTTP cache) wyników zapytań dla popularnych kombinacji slot/target.
- Zapytania losowe: jeśli ORDER BY RANDOM() używane przy dużej tabeli, rozważyć wydajniejsze alternatywy (sampling, precomputed suggestions).

## 11. Kroki implementacji (szczegółowe)
1. Utworzyć testową specyfikację i przypadki użycia (unit + integration): brakujący `plan_meal`, cudzy `plan_meal`, brak alternatyw, zwraca ≤ limit.
2. Dodać Zod schema:
   - `src/pages/api/plan-meals/[id]/alternatives.ts`: params schema i query schema.
3. Dodać serwis lub metodę w `src/lib/services/planMeals.service.ts`:
   - `async getAlternativesForMeal(mealId: number, userId: string, limit = 3): Promise<RecipeDTO[]>`
   - Logika: pobranie `plan_meal`, walidacja przynależności, obliczenie `target_calories_per_serving`, zapytanie do `recipes`, mapowanie do `RecipeDTO`.
4. Dodać endpoint HTTP w `src/pages/api/plan-meals/[id]/alternatives.ts`:
   - Pobranie `supabase` i `session` z `context.locals` (zgodnie z regułami projektu).
   - Walidacja wejścia (Zod).
   - Wywołanie `planMealsService.getAlternativesForMeal`.
   - Obsługa wyjątków i mapowanie na odpowiednie kody statusu.
5. Dodać testy integracyjne (uruchamiane lokalnie) wykorzystujące testową bazę danych lub mock Supabase: weryfikacja zachowania filtrów kalorycznych i slotów.
6. Dodać linter-friendly dokumentację i changelog w PR.
7. Code review: sprawdź zabezpieczenie RLS, brak przecieków `user_id`, obsługę błędów.
8. Wdrożenie: wdrożyć na staging, uruchomić testy E2E, monitorować metryki i logi (latency, error rate).

## 12. Dodatkowe uwagi i decyzje implementacyjne
- Kryterium kaloryczne można wyliczać dwojako — preferować `plan_meal.calories_planned / portion_multiplier` dla lepszego dopasowania do porcji użytkownika; jeżeli `portion_multiplier` niepoprawne lub 0, fallback do `plan_day_slot_targets.calories_target`.
- Wykluczać `recipe_id` aktualnego `plan_meal` z wyników.
- Jeżeli mniej niż `limit` wyników, zwrócić tyle ile jest; nie komponować sztucznie brakujących wyników.
- Zastanowić się nad priorytetami sortowania (np. najmniejsza różnica kaloryczna, krótszy czas przygotowania, losowość), omówić z produktem przed implementacją.

---

Plik implementacyjny i testy powinny odwoływać się do plików (przykładowo):
- `src/pages/api/plan-meals/[id]/alternatives.ts`
- `src/lib/services/planMeals.service.ts` (metoda `getAlternativesForMeal`)
- `src/types.ts` (używane DTO)
- `src/lib/errors.ts` (centralny logger)


