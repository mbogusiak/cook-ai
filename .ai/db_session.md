<conversation_summary>
<decisions>
1. Użytkownicy mapowani do `auth.users` (UUID); `user_id` w każdej tabeli domenowej; RLS odroczone.
2. `recipes` importowane lokalnie (bez połączenia z Cookido); brak twardych usunięć, `is_active`; unikalny `slug`; pełnotekst/trgm na nazwie.
3. Model: `plans` → `plan_days` → `plan_meals`; `meal_slot enum ['breakfast','lunch','dinner','snack']`, `meal_status enum ['planned','completed','skipped']`; unikalność `(plan_day_id, slot)`; denormalizacja `plan_id` i `user_id` w `plan_meals`.
4. Wieloporcjowość tylko dla obiadu/kolacji: `multi_portion_group_id`, `is_leftover`; para na 2 dni; nie rozciągamy 3–4 dni; CHECK/trigger: suma `portion_multiplier = 1.0`; brak ograniczenia do wyliczonych wartości (np. 0.5/1.0).
5. Jeden aktywny plan na użytkownika (partial unique index); plany niezmienne; `plan_state enum ['active','archived','cancelled']`.
6. Ignorujemy strefy czasowe; `plan_days.date` jako `date`; znaczniki czasu wg potrzeb.
7. Snapshot w `plan_meals`: `calories_planned int`, `portion_multiplier numeric(4,2)`.
8. Wymiana posiłku przez transakcyjne RPC; generator realizuje podział kalorii i próg ±20%; targety per slot w `plan_day_slot_targets`.
9. Indeksy: `recipes(slot, calories_per_serving)`, GIN trigram na `recipes(name)`, `plan_days(plan_id, date)`, `plan_meals(plan_id, slot, status)`, `plan_meals(multi_portion_group_id)`, partial na `plan_meals(status='planned')`.
10. Brak: tokenu idem dla generatora, tabeli zdarzeń analitycznych, widoku ukończenia planu, partycjonowania; brak kaskady przy usunięciu użytkownika (na MVP nie wymagane).
</decisions>

<matched_recommendations>
1. Mapowanie na `auth.users` + `user_id` w domenie (przyjęte).
2. Lokalna tabela `recipes` z indeksami kalorii/slotu i trgm na nazwie (przyjęte).
3. Hierarchia `plans`/`plan_days`/`plan_meals` z unikalnością slotów (przyjęte).
4. Model par wieloporcjowych z `multi_portion_group_id` i walidacją triggerami (przyjęte).
5. Snapshot wartości żywieniowych w `plan_meals` (przyjęte).
6. Jedyny aktywny plan per user + niezmienność planu (przyjęte).
7. Sloty jako enum; statusy jako enum (przyjęte).
8. RPC `swap_meal` w transakcji; generator po stronie serwera (przyjęte).
9. Denormalizacja `plan_id`/`user_id` w `plan_meals` + spójność slotu z przepisem (przyjęte).
10. Indeksy operacyjne na `plan_days`/`plan_meals` i partial na planned (przyjęte).
</matched_recommendations>

<database_planning_summary>
a. Główne wymagania:
- Jedno aktywne `plan` na użytkownika; plany niezmienne, wersjonowanie przez nowe plany.
- Dni planu w `date`; cztery sloty/dzień; status posiłku planned/completed/skipped; autosave bez blokad współbieżności na MVP.
- Wieloporcjowość: para (dzień 1 gotuj, dzień 2 resztki), tylko lunch/dinner, łączona `multi_portion_group_id`, bilans kalorii rozłożony przez `portion_multiplier`, suma = 1.0.

b. Kluczowe encje i relacje:
- `user_settings(1:1 -> auth.users)` (domyślne kcal i długość planu).
- `recipes` (N:1 do `plan_meals`), lokalne dane, `is_active`, `slug unique`, indeksy slot/kalorie, trgm(name).
- `plans(1:N -> plan_days)` z `plan_state` i partial unique na aktywny.
- `plan_days(1:N -> plan_meals)`; dodatkowo `plan_day_slot_targets(plan_day_id, slot, calories_target)`.
- `plan_meals(N:1 -> recipes)`, z `plan_id`, `user_id`, `slot`, `status`, `calories_planned`, `portion_multiplier`, `multi_portion_group_id`, `is_leftover`.

c. Bezpieczeństwo i skalowalność:
- RLS odroczone; docelowo polityki `user_id = auth.uid()` na wszystkich tabelach domenowych.
- Spójność: FK z `ON DELETE CASCADE` dla `plans -> plan_days -> plan_meals`; `recipes` z `ON DELETE RESTRICT`.
- Wydajność: selekcja alternatyw po `(slot, calories_per_serving)` + trgm po nazwie; indeksy na najczęstsze filtry; partial index na planned; brak partycjonowania na MVP.
- Brak wymagań idem/retry i analityki na MVP.

d. Otwarte elementy algorytmiczne/operacyjne:
- Walidacja braku duplikatów przepisu w tym samym slocie w obrębie planu egzekwowana w generatorze/RPC (bez dodatkowych ograniczeń twardych).
- Brak twardego wymagania “dokładnie 4 posiłki/dzień” w DB (pilnowane aplikacyjnie).
</database_planning_summary>

<unresolved_issues>
1. Definicje i wdrożenie RLS (polityki per tabela, ewentualne funkcje `security definer`) – do ustalenia później.
2. Zachowanie przy usunięciu użytkownika w `auth.users` (kaskada vs restrykcja) – na MVP niewymagane, do doprecyzowania.
3. Czy potrzebny `external_id` dla `recipes` (jeśli kiedykolwiek zajdzie re-import/migracje) – obecnie brak, do rozważenia w przyszłości.
4. Sposób raportowania metryki ukończenia (≥90%) bez dedykowanego widoku/materializowanego widoku – do decyzji przy implementacji UI/raportów.
</unresolved_issues>
</conversation_summary>

