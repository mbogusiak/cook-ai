# Weryfikacja Logiki Algorytmu — Plan Generation v2

**Data**: 2025-10-20
**Status**: Analiza spójności pomiędzy PRD, db-plan-v2.md i logiką algorytmu

---

## 1. Weryfikacja założeń z PRD

### 1.1. Rozkład kalorii — ✅ SPÓJNE

**Z PRD (5.4)**:
> Dzienne zapotrzebowanie kaloryczne jest rozdzielane procentowo:
> - Śniadanie: 20%
> - Obiad: 30%
> - Kolacja: 30%
> - Przekąska: 20%

**W algorytmie v2 (5.1-5.2)**:
```
target[breakfast] = daily_calories * 0.20 ✅
target[lunch] = daily_calories * 0.30 ✅
target[dinner] = daily_calories * 0.30 ✅
target[snack] = daily_calories * 0.20 ✅
```

**Przechowywanie w DB**: `plan_day_slot_targets.calories_target` ✅

---

### 1.2. Wieloporcjowość — ✅ SPÓJNE (NAPRAWIONE)

**Z PRD (5.4)**:
> - Jeśli wybrany przez algorytm przepis na obiad lub kolację ma więcej niż 1 porcję, ten sam posiłek jest automatycznie planowany w tym samym slocie na następny dzień.

**W algorytmie v2 (5.3 Krok 4)**:
```
IF slot IN ('lunch', 'dinner') AND recipes.portions > 1:
  INSERT plan_meals (next_day, is_leftover=TRUE, multi_portion_group_id=UUID)
  UPDATE plan_meals (current_day, portions_to_cook=recipes.portions)
```

✅ Logika zgadza się z PRD
✅ Baza obsługuje poprzez `multi_portion_group_id` i `is_leftover`

---

### 1.3. Wieloporćje — logika obliczania — ⚠️ WYMAGA SPRAWDZENIA

**Z PRD (5.4)**:
> - Użytkownik może zjeść więcej niż jedna porcja przepisu na raz. Np: porcja przepisu to 250kcal, a według planu powininen zjeść 500kcal, to algorytm może zasugerować 2 porcje przepisu.

**Przypadek z algorytmu v2**:
```
portions_needed = CEIL(target_calories / calories_kcal)
```

**Przykład**:
- `recipes.calories_kcal = 250`
- `target = 600 kcal` (lunch)
- `portions_needed = CEIL(600 / 250) = CEIL(2.4) = 3`
- `calories_total = 250 * 3 = 750 kcal`
- `Czy 750 mieści się w [600 * 0.8, 600 * 1.2] = [480, 720]?`
  - ❌ **750 > 720** — przerywa się!

**Problem**: Zaokrąglanie do góry powoduje przekroczenie limitu ±20%!

**Rozwiązanie**:

```typescript
// Zamiast CEIL, spróbuj oba zaokrąglenia
portions_candidates = [FLOOR(target / calories_kcal), CEIL(target / calories_kcal)];

best_match = null;
for (portions of portions_candidates) {
  if (portions > recipes.portions) continue; // za wiele porcji

  calories_total = calories_kcal * portions;
  if (calories_total BETWEEN target * 0.8 AND target * 1.2) {
    // Weź ten, który jest bliżej targetu
    if (!best_match || ABS(calories_total - target) < ABS(best_match.calories - target)) {
      best_match = { portions, calories_total };
    }
  }
}

if (!best_match) {
  // Fallback: weź FLOOR (możliwe niedokarnienie)
  portions = FLOOR(target / calories_kcal);
  if (portions > 0 && portions <= recipes.portions) {
    calories_total = calories_kcal * portions;
    best_match = { portions, calories_total };
  }
}

if (!best_match) {
  // Przepis pasuje, ale wymaga podania ułamkowej liczby porcji
  portions = target / calories_kcal; // może być 2.5, 0.7 itd.
  if (portions <= recipes.portions) {
    best_match = { portions, calories_total: target };
  }
}
```

✅ **Rekomendacja**: Aktualizuję sekcję 5.3 algorytmu z tą logiką

---

### 1.4. Wizualne oznaczenie posiłków wieloporcjowych — ✅ SPÓJNE Z DB

**Z PRD (5.5)**:
> Wizualne oznaczenie posiłków wieloporcjowych:
> - Posiłek, który jest przygotowywany pierwszego dnia, powinien mieć oznaczenie, np. **"Ugotuj na 2 dni"**.
> - Posiłek w dniu następnym powinien mieć wyraźne oznaczenie, np. **"Resztki z wczoraj"** lub ikona odgrzewania.

**W DB v2**:
- `is_leftover = FALSE` → "Ugotuj na 2 dni" (bo `portions_to_cook = recipes.portions`)
- `is_leftover = TRUE` → "Resztki z wczoraj"

✅ Logika zgadza się z PRD i DB go obsługuje

---

### 1.5. Status posiłku — ✅ SPÓJNE

**Z PRD (5.6)**:
> Zmiana statusu posiłku: zaplanowany (domyślny), ukończony, pominięty.

**W DB v2**: Enum `meal_status: 'planned' | 'completed' | 'skipped'` ✅

---

### 1.6. Wymiana posiłków — ✅ SPÓJNE

**Z PRD (5.6)**:
> System prezentuje do 3 alternatywnych posiłków z tego samego slotu, spełniających kryteria kaloryczne.

**W algorytmie v2 (6.2)**:
```sql
SELECT recipes WHERE:
  - slot taki sam
  - calories w ±20% targetu
  - recipe_id != current
  - nie użyte w planie
LIMIT 3
```

✅ Zgadza się

---

### 1.7. Logika wymiany par wieloporcjowych — ✅ SPÓJNE

**Z PRD (5.6)**:
> - Jeśli użytkownik wymienia posiłek z dnia pierwszego (tego "do ugotowania"), posiłek z dnia drugiego ("resztki") jest również automatycznie usuwany, a w jego miejsce algorytm generuje nowy, unikalny posiłek.
> - Jeśli użytkownik wymienia posiłek z dnia drugiego ("resztki"), nie ma to wpływu na posiłek z dnia pierwszego.

**W algorytmie v2 (6.2)**:
- **Scenariusz 2** (dzień 1): DELETE dzień 2, INSERT nowy dzień 2 ✅
- **Scenariusz 3** (dzień 2): UPDATE tylko dzień 2, dzień 1 bez zmian ✅

---

### 1.8. Deficyt ukończenia planu — ✅ SPÓJNE

**Z PRD (5.7)**:
> Plan jest uznawany za ukończony, gdy co najmniej 90% posiłków zostanie oznaczonych jako **"ukończone"**.

**W DB v2**: Brak formalnego pola, ale łatwe do obliczenia:
```sql
SELECT COUNT(*) FILTER (WHERE status='completed') / COUNT(*) * 100 >= 90
```

✅ Logika jest prosta

---

## 2. Potencjalne problemy

### 2.1. ⚠️ KRYTYCZNE — Unikanie powtórzeń przepisów

**Z PRD (5.4)**:
> Algorytm dąży do braku powtórzeń tych samych przepisów w pozostałych slotach w ramach jednego planu.

**Pytanie**: Czy to oznacza:
- ❓ Ten sam przepis nie może się pojawić na lunch ani na dinner w żadnym dniu? (globalnie)
- ❓ Ten sam przepis nie może się pojawić na lunch w dwóch różnych dniach?
- ❓ Ten sam przepis może być na lunch i dinner (różne sloty)?

**Interpretacja v2**: "w ramach jednego planu" = globalnie dla wszystkich slotów

**Problematyczne**: W 7-dniowym planie z 4 slotami = 28 posiłków, a Cookido ma 6000 przepisów. Nie powinno być problemu ze znalezieniem unikalnych.

**Rekomendacja**: Przechowuj `used_recipes` w aktualnym planie i sprawdzaj przy każdym wyborze.

---

### 2.2. ⚠️ — Wieloporcje dla breakfast/snack

**Z PRD (5.4)**:
> - Śniadania i przekąski domyślnie pozostają unikalne każdego dnia, chyba że analiza danych wykaże inaczej.

**W algorytmie v2 (5.3 Krok 4)**:
```
IF slot IN ('lunch', 'dinner') AND recipes.portions > 1:
  [wieloporcje]
```

✅ Breakfast i snack są ZAWSZE unikalne, niezależnie od `recipes.portions` — zgadza się z PRD

---

### 2.3. ⚠️ UWAGA — Przepisy z >2 porcjami

**Z PRD (5.4 i 9)**:
> Pytanie: Przepisy z 3-4 porcjami
> Decyzja (MVP): Akceptujemy takie przepisy. Zakładamy, że użytkownik zje 2 porcje

**W algorytmie v2**: Traktujemy `recipes.portions` jako górny limit. Jeśli przepis ma 6 porcji, użytkownik może zjeść 1, 2, 3, 4, 5 lub 6 (jeśli kalorie się zgadzają).

**Pytanie**: Czy to się zgadza z decyzją MVP?

**Interpretacja**: Przykład z PRD mówi "jeśli przepis ma >1 porcję, zaplanuj na 2 dni", ale nie precyzuje liczby porcji. Zakładam, że:
- Przepis 3-porcjowy → może być zaplanowany na 2 dni (np. 1.5 porcji na dzień)
- Przepis 6-porcjowy → może być zaplanowany na 2 dni (np. 3 porcje na dzień)

✅ Algorytm v2 to obsługuje poprzez `portion_multiplier = [0.5..N]`

---

### 2.4. ⚠️ — Logika "skip_next_day" przy wieloporcjach

**W algorytmie v2 (5.3 Krok 4)**:
```
IF skip_next_day[current_slot] == TRUE:
  continue; // pomiń ten slot na następnym dniu (już ma wieloporcje)
```

**Problem**: Jeśli dzień 1 ma wieloporcje (lunch), to dzień 2 lunch jest już zaplanowany. Ale co ze śniadaniem, kolacją i przekąską?

**Rozwiązanie**: `skip_next_day` powinna być mapa `(dzień, slot)` → `bool`, nie globalnie dla slogu.

```typescript
const skipNextDay = new Set<`${day}-${slot}`>();

for (const slot of SLOTS) {
  if (skipNextDay.has(`${day}-${slot}`)) continue;

  // ... wybierz przepis ...

  if (slot IN ['lunch', 'dinner'] && recipes.portions > 1 && next_day_exists) {
    skipNextDay.add(`${day + 1}-${slot}`);
  }
}
```

✅ **Rekomendacja**: Wyjaśnić w dokumencie

---

### 2.5. ⚠️ — Fallback gdy brak pasujących przepisów

**Pytanie**: Co się dzieje, jeśli brakuje przepisu pasującego do ±20% targetu?

**Opcje**:
1. Poszerzamy tolerancję (np. ±30%)
2. Losujemy dowolny przepis
3. Zwracamy błąd
4. Zostawiamy slot pusty (status "skipped")

**v2**: Nie precyzuje.

**Rekomendacja**: Dodać logikę fallback do dokumentu.

---

### 2.6. ⚠️ — Denormalizacja w plan_meals

**W DB v2**: `plan_meals.plan_id` i `plan_meals.user_id` są denormalizowane

**Wyzwalacz**: `fn_set_plan_meals_denorm()` ustawia je automatycznie

**Sprawdzenie**:
```sql
INSERT INTO plan_meals (plan_day_id, slot, recipe_id, portion_multiplier, calories_planned)
VALUES (?, 'breakfast', 123, 1.0, 350);

-- Wyzwalacz automatycznie ustawia:
-- plan_id = (SELECT plan_id FROM plan_days WHERE id = ?)
-- user_id = (SELECT user_id FROM plans WHERE id = plan_id)
```

✅ Logika jest wbudowana w wyzwalacz

---

## 3. Nowe szacunki i granice bezpieczeństwa

### 3.1. Zakres `portion_multiplier`

**Min**: 0.01 (jedna stysięczna porcji — realistycznie 0.5 minimum)
**Max**: 10.0 (całej receptury + 4x więcej — realistycznie ograniczone do `recipes.portions`)

**Constraint v2**:
```sql
CHECK (portion_multiplier > 0)
CHECK (portion_multiplier <= recipes.portions)  -- Dodać wyzwalaczem
```

✅ Spójne

---

### 3.2. Zakres `calories_planned`

**Min**: 1 kcal (teoretycznie, ale realistycznie 50+)
**Max**: ~5000 kcal (całe przepisy)

**Constraint v2**:
```sql
CHECK (calories_planned > 0)
```

✅ Wystarczające

---

### 3.3. Zakres `calories_target`

**Min**: Realistycznie ~50 kcal (np. snack)
**Max**: Realistycznie ~1500 kcal (np. lunch przy 5000 dziennie)

**Constraint v2**:
```sql
CHECK (calories_target > 0)
```

✅ Wystarczające

---

## 4. Mapowanie PRD → DB v2 — Checklist

| Wymaganie PRD | Realizacja w DB v2 | Status |
|---|---|---|
| 4 sloty dziennie | `meal_slot` enum + `plan_day_slot_targets` | ✅ |
| Rozkład 20-30-30-20% | `plan_day_slot_targets.calories_target` | ✅ |
| Wieloporcje lunch/dinner | `is_leftover`, `portions_to_cook`, `multi_portion_group_id` | ✅ |
| Brak wieloporcji breakfast/snack | Constraint: `slot IN ('lunch','dinner')` | ✅ |
| Wymiana posiłków | RPC `rpc_swap_meal()` | ✅ |
| Status posiłku | `meal_status` enum | ✅ |
| Unikanie powtórzeń | Aplikacyjnie (nie w DB) | ⚠️ Implementuj |
| Wizualne oznaczenia | `is_leftover` + `portions_to_cook` | ✅ |
| 90% ukończenia = plan complete | Aplikacyjnie | ⚠️ Implementuj |

---

## 5. Rekomendacje do implementacji

### 5.1. Algorytm wyboru `portion_multiplier`

```typescript
// Pseudo-kod
function selectPortions(target: number, recipe: Recipe): number | null {
  const candidates = [
    Math.floor(target / recipe.calories_kcal),
    Math.ceil(target / recipe.calories_kcal),
  ];

  let best = null;
  let bestDiff = Infinity;

  for (const portions of candidates) {
    if (portions <= 0 || portions > recipe.portions) continue;

    const calories = recipe.calories_kcal * portions;
    const diff = Math.abs(calories - target);

    // Tolerancja ±20% z PRD
    if (calories >= target * 0.8 && calories <= target * 1.2 && diff < bestDiff) {
      best = portions;
      bestDiff = diff;
    }
  }

  // Fallback: ułamkowe porcje jeśli dokładnie pasują
  if (!best) {
    const portions = target / recipe.calories_kcal;
    if (portions > 0 && portions <= recipe.portions) {
      best = portions;
    }
  }

  return best;
}
```

### 5.2. Wyzwalacz do walidacji `portion_multiplier <= recipes.portions`

```sql
CREATE OR REPLACE FUNCTION fn_validate_portion_multiplier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.portion_multiplier > (SELECT portions FROM recipes WHERE id = NEW.recipe_id) THEN
    RAISE EXCEPTION 'portion_multiplier cannot exceed recipe portions';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.3. Obsługa `skip_next_day` we wszystkich slotach

```typescript
type SkipKey = `${number}-${MealSlot}`;
const skipNextDay = new Set<SkipKey>();

for (let day = 0; day < planLength; day++) {
  for (const slot of SLOTS) {
    if (skipNextDay.has(`${day}-${slot}`)) continue;

    const target = calculateTarget(slot, dailyCalories);
    const recipe = selectRecipe(slot, target, usedRecipes);

    if (!recipe) {
      // Fallback logic
      continue;
    }

    if (slot IN ['lunch', 'dinner'] && recipe.portions > 1 && day + 1 < planLength) {
      skipNextDay.add(`${day + 1}-${slot}`);
      // ... insert multi-portion ...
    } else {
      // ... insert regular meal ...
    }

    usedRecipes.add(recipe.id);
  }
}
```

### 5.4. Obsługa fallback — brak pasujących przepisów

```typescript
function selectRecipeWithFallback(
  slot: MealSlot,
  target: number,
  usedRecipes: Set<number>
): Recipe | null {
  // Próba 1: ±20%
  let recipe = findRecipesInRange(slot, target * 0.8, target * 1.2, usedRecipes)[0];
  if (recipe) return recipe;

  // Próba 2: ±30%
  recipe = findRecipesInRange(slot, target * 0.7, target * 1.3, usedRecipes)[0];
  if (recipe) return recipe;

  // Próba 3: Losowy przepis z tego slotu
  recipe = findRandomRecipe(slot, usedRecipes);
  return recipe;
}
```

---

## 6. Przypadki testowe do weryfikacji

### Test 1: Wieloporcje na 2 dni

**Input**:
- daily_calories: 2000
- plan_length: 7
- start_date: 2025-10-21

**Oczekiwane**:
- Co najmniej 2 pary wieloporcji (lunch/dinner w dniach parami)
- Każda para ma identyczną `portion_multiplier`
- `portions_to_cook` tylko dla dnia 1
- `is_leftover=true` tylko dla dnia 2

### Test 2: Wymiana dnia 1 wieloporcji

**Input**:
- Zmień lunch z dnia 1 (część wieloporcji)

**Oczekiwane**:
- Lunch z dnia 1 zmieni się
- Lunch z dnia 2 będzie USUNIĘTY
- Nowy lunch na dzień 2 będzie WYGENEROWANY

### Test 3: Wymiana dnia 2 wieloporcji

**Input**:
- Zmień lunch z dnia 2 (resztki)

**Oczekiwane**:
- Lunch z dnia 2 zmieni się
- Lunch z dnia 1 POZOSTAJE BEZ ZMIAN
- Multi-portion group zostaje rozbity

### Test 4: Niedokarnienie ±20%

**Input**:
- target: 600 kcal
- recipe.calories_kcal: 250
- recipe.portions: 2

**Oczekiwane**:
- FLOOR: 2 porcje = 500 kcal (480-720 → ✅ w zasiegu)
- CEIL: 3 porcje = 750 kcal (480-720 → ❌ poza zasielem)
- **Wynik**: 2 porcje (FLOOR jest bliżej targetu)

---

## 7. Podsumowanie

### ✅ Zgadza się z PRD:
- Rozkład 20-30-30-20%
- Wieloporcje lunch/dinner na 2 dni
- Status posiłku (planned/completed/skipped)
- Wymiana posiłków (3 alternatywy)
- Logika wymiany par
- Oznaczenia wizualne

### ⚠️ Wymaga doprecyzowania:
- Liczba porcji przy zaokrągleniu (FLOOR vs CEIL)
- Unikanie powtórzeń przepisów (gdzie przechowywać historię?)
- Fallback gdy brak pasujących przepisów
- Dokładna liczba porcji dla przepisów 3-4 porcjowych

### ✅ DB v2 gotowy do implementacji:
- Schemat jest spójny
- Wyzwalacze pokrywają logikę biznesową
- Indeksy optymalne dla głównych zapytań

---

**Dokument weryfikacji**: Gotowy
**Status**: Zalecenie do implementacji z wyjaśnieniami z sekcji 5