# API Endpoint Implementation Plan: POST /api/plan-meals/{id}/swap

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia użytkownikowi zamianę przepisu przypisanego do konkretnego posiłku w istniejącym planie. Operacja może aktualizować pojedynczy rekord `plan_meals` lub, w przypadku posiłków powiązanych mechaniką "wieloporcjowości", atomowo zaktualizować zestaw rekordów należących do tej samej grupy.

- Cel: zastąpić przepis w rekordzie posiłku bez naruszenia reguł biznesowych: zgodności slotów, ograniczeń porcji, celów kalorycznych oraz spójności par wieloporcjowych.
- Lokalizacja implementacji: `src/pages/api/plan-meals/[id]/swap.ts` (endpoint), serwis pomocniczy `src/lib/services/planMeals.service.ts`.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/api/plan-meals/{id}/swap` gdzie `{id}` to integer odpowiadający `plan_meals.id`.
- Parametry:
  - Wymagane:
    - `id` (ścieżka) — id posiłku do zamiany (liczba całkowita)
  - Opcjonalne:
    - brak dodatkowych parametrów ścieżki/query
- Request Body (JSON):
  - `new_recipe_id` (number) — id przepisu, który ma zastąpić obecny

Przykład:
```json
{ "new_recipe_id": 123 }
```

## 3. Wykorzystywane typy
- DTO / Commandy (z `src/types.ts`):
  - `SwapMealCommand` — { new_recipe_id: number }
  - `UpdatedMealInSwap` — { id, slot, status, calories_planned, portion_multiplier, portions_to_cook, multi_portion_group_id, is_leftover, recipe_id }
  - `SwapMealResponse` — { updated_meals: UpdatedMealInSwap[] }
- Modele/bazy (istotne kolumny z `plan_meals` i powiązane tabele):
  - `plan_meals`: `id`, `plan_day_id`, `plan_id`, `user_id`, `slot`, `status`, `recipe_id`, `portion_multiplier`, `calories_planned`, `portions_to_cook`, `multi_portion_group_id`, `is_leftover`, `created_at`, `updated_at`
  - `recipes`: `id`, `available_slots` (Enums<'meal_slot'>[]), `portions`, `calories_kcal`
  - `plan_day_slot_targets`: `plan_day_id`, `slot`, `calories_target`

## 4. Przepływ danych (high level)
1. Autoryzacja: pobierz sesję Supabase z `context.locals.supabase` (Astro) i upewnij się, że użytkownik jest zalogowany.
2. Walidacja wejścia (Zod) dla `new_recipe_id`.
3. Pobranie rekordu `plan_meals` po `id` i weryfikacja właściciela (`user_id == session.user.id`). Jeśli brak → 404.
4. Pobranie rekordu `recipes` dla `new_recipe_id`. Jeśli brak → 404.
5. Walidacja zgodności: sloty, porcji (portion_multiplier <= recipes.portions), kaloryczność vs `plan_day_slot_targets` (np. tolerancja ±20%). Jeśli niezgodne → 400 z opisem błędu.
6. Przygotowanie transakcji DB:
   - Jeśli `multi_portion_group_id` jest NULL → zaktualizuj pojedynczy `plan_meals` rekord.
   - Jeśli `multi_portion_group_id` nie jest NULL → zaktualizuj wszystkie rekordy z tą grupą tak, aby zachować reguły (portion_multiplier, portions_to_cook, is_leftover) — wszystko w jednej transakcji.
   - Przelicz `calories_planned` = `recipes.calories_kcal * portion_multiplier` i ustaw w rekordzie.
7. Zwróć zaktualizowane rekordy (200) z payloadem zgodnym z `SwapMealResponse`.

## 5. Względy bezpieczeństwa
- Uwierzytelnianie: użycie Supabase session z `context.locals.supabase` w endpointach Astro.
- Autoryzacja: sprawdzić `plan_meals.user_id` równe `session.user.id` (lub zastosować RLS/widoczną politykę). Brak prawa → 403 (lub 404 jeśli chcemy ukryć istnienie zasobu).
- SQL injection: używać Supabase SDK (parametryzowane zapytania), nie budować ręcznych stringów SQL.
- Race conditions: wykonywać aktualizacje w transakcji DB; jeśli przewidujemy częste konkurencyjne modyfikacje, stosować blokadę wiersza (SELECT ... FOR UPDATE) lub wykorzystać wersjonowanie optymistyczne (`updated_at` + check) by wykryć kolizje.
- Limitacja danych: ograniczyć, co zwracamy klientowi do niezbędnych pól.

## 6. Obsługa błędów (kody statusu i payload)
- 200 OK — udana zamiana, zwraca `SwapMealResponse` (zaktualizowane posiłki). (Możliwy też 200 zamiast 201, ponieważ to aktualizacja istniejącego zasobu.)
- 400 Bad Request — walidacja wejścia lub reguły biznesowe (np. "invalid recipe for slot/calories"). Payload: { error: string, details?: string }
- 401 Unauthorized — brak sesji / nieważny token
- 403 Forbidden — użytkownik nie jest właścicielem lub brak uprawnień
- 404 Not Found — brak `plan_meals.id` lub brak `recipes.id`
- 500 Internal Server Error — nieoczekiwany błąd serwera/DB

Dodatkowo logować szczegóły błędów do systemu obserwowalności (Sentry/Logtail). Użyć `src/lib/errors.ts` do ujednolicenia reportów.

## 7. Wydajność i skalowalność
- Zapytania DB: indeksy na `plan_meals(id)`, `plan_meals.multi_portion_group_id`, `plan_meals.user_id` i `recipes(id)` są kluczowe.
- Transakcje: minimalizować zakres transakcji do jednego połączenia; unikać długotrwałych blokad.
- Caching: jeżeli lista przepisów/kalorii jest często używana, rozważyć cache na poziomie aplikacji dla statycznych pól receptur.
- Bulk updates dla grup wieloporcjowych: aktualizować wszystkie powiązane rekordy w jednej transakcji zamiast wielu zapytań pojedynczych.

## 8. Kroki implementacji (przykładowy backlog dla deweloperów)
1. Utworzyć plik endpointu: `src/pages/api/plan-meals/[id]/swap.ts`.
2. Dodać Zod schema w tym pliku lub `src/lib/schemas/` dla `SwapMealCommand`.
3. Stworzyć serwis `src/lib/services/planMeals.service.ts` z funkcjami:
   - `getPlanMealById(planMealId, supabase)`
   - `getRecipeById(recipeId, supabase)`
   - `validateSwapCandidate(planMeal, recipe, targetSlotTargets)`
   - `performSwapTransaction(planMealId, newRecipe, supabase)` — zwracający zaktualizowane posiłki
4. Zaimplementować endpoint: pobranie sesji, walidacja Zod, pobranie planMeal i recipe, uruchomienie `validateSwapCandidate`, uruchomienie `performSwapTransaction`.
5. Testy jednostkowe i integracyjne:
   - Walidacja wejścia
   - Swap pojedynczego posiłku
   - Swap w grupie wieloporcjowej (aktualizacja obu rekordów)
   - Uprawnienia (nie właściciel)
6. Dodanie logowania i monitoringu błędów (Sentry integration).
7. Code review i merge.
8. E2E test i manualne sprawdzenie przez QA (różne scenariusze: mismatch slot, porcji, kaloryczności).

---

Uwagi końcowe:
- Utrzymuj logikę biznesową w serwisie, nie w handlerze endpointu.
- Stosuj Zod do walidacji wejścia i szczegółowych błędów 400.
- Zadbaj o atomowość operacji w DB i odpowiednie testy integracyjne.
