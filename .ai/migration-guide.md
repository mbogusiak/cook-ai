# Migration Guide — Schemat Bazy Danych v1 → v2

**Data**: 2025-10-20
**Status**: Instrukcja dla deploymentu migracji

---

## 📋 Scenario: Który plik migracji użyć?

### Scenariusz A: Nowa baza danych (fresh start) ✅

Jeśli baza **nigdy nie została wdrożona w produkcji**, użyj:

```
supabase/migrations/20251015144149_create_initial_schema.sql
```

**Co robić:**
1. Usuń starą migrację `20251015144149_create_initial_schema.sql` z sieci
2. Wdróż poprawioną wersję (z `portions_to_cook`, nowymi wyzwalaczami itp.)
3. Reset bazy: `supabase db reset`

**Status**: ✅ Zawiera wszystkie poprawki z v2


### Scenariusz B: Istniejąca baza (już w produkcji) ⚠️

Jeśli baza **już jest w produkcji lub staging**, użyj:

```
supabase/migrations/20251020_fix_multi_portion_schema.sql
```

**Co robić:**
1. Przygotujesz na staging: `supabase migration up`
2. Zweryfikujesz dane: SELECT * FROM plan_meals WHERE portions_to_cook IS NOT NULL
3. Backupujesz produkcję
4. Deployujesz do produkcji: `supabase push`

**Status**: ✅ Zawiera ALTER TABLE i migrację danych

---

## 🔄 Co się zmienia w schemacie?

### Nowe pole: `portions_to_cook`

```sql
-- Dodane w migracji 20251020
ALTER TABLE plan_meals ADD COLUMN portions_to_cook INTEGER NULL;
```

**Przykład**:
```
Przepis: Gulasz 6-porcjowy (recipes.portions = 6)

Dzień 1 (gotowanie):
  portion_multiplier = 3.0       → zjemy 3 porcje
  portions_to_cook = 6           → przygotuj całą receptę
  is_leftover = FALSE            → dzień gotowania

Dzień 2 (resztki):
  portion_multiplier = 3.0       → zjemy 3 porcje
  portions_to_cook = NULL        → nie gotuj (resztki!)
  is_leftover = TRUE             → dzień restek
```

### Nowe constrainty

```sql
-- Only day 1 can have portions_to_cook set
CHECK (portions_to_cook IS NULL OR is_leftover = FALSE)

-- In multi-portion group, only one meal cooks
CHECK (multi_portion_group_id IS NULL OR portions_to_cook IS NULL OR is_leftover = FALSE)
```

### Nowy indeks

```sql
CREATE INDEX plan_meals_portions_to_cook_idx
ON plan_meals (portions_to_cook)
WHERE portions_to_cook IS NOT NULL;
```

**Użycie**: Szybkie znalezienie posiłków "do ugotowania"

---

## 🧪 Nowe wyzwalacze

### 1️⃣ `fn_calculate_plan_meal_calories()`

**Cel**: Automatyczne obliczanie kalorii

```sql
-- Zamiast tego (aplikacja):
calories_planned = recipe.calories_kcal * portion_multiplier;
INSERT INTO plan_meals (..., calories_planned, ...)

-- Teraz to robi wyzwalacz:
INSERT INTO plan_meals (..., portion_multiplier, ...)
-- ✅ Wyzwalacz oblicza: calories_planned = 250 * 2.0 = 500
```

**Kiedy uruchamia się**: BEFORE INSERT/UPDATE na `recipe_id` lub `portion_multiplier`

**Rezultat**: Niemożliwe wysłanie błędnych danych z aplikacji


### 2️⃣ `fn_validate_portion_multiplier()`

**Cel**: Walidacja że portion_multiplier ≤ recipes.portions

```sql
-- Przykład: Przepis 2-porcjowy
-- ❌ Błąd: portion_multiplier = 3.0 > recipes.portions = 2
INSERT INTO plan_meals (recipe_id=1, portion_multiplier=3.0, ...)
-- EXCEPTION: portion_multiplier (3) cannot exceed recipe portions (2)

-- ✅ OK:
INSERT INTO plan_meals (recipe_id=1, portion_multiplier=2.0, ...)
```

**Kiedy uruchamia się**: BEFORE INSERT/UPDATE na `recipe_id` lub `portion_multiplier`

**Rezultat**: Niemożliwe logiczne błędy


### 3️⃣ `fn_enforce_multi_portion_group()` — NAPRAWIONY

**Stare reguły (❌)**:
```sql
-- Suma portion_multiplier musi = 1.0
IF SUM(portion_multiplier) != 1.0:
    RAISE EXCEPTION
```

**Problem**: To było całkowicie błędne! `portion_multiplier` to liczba porcji, nie ułamek.

**Nowe reguły (✅)**:
```sql
-- Reguła 1: Grupa musi mieć dokładnie 2 posiłki
COUNT(*) = 2

-- Reguła 2: Dokładnie 1 z is_leftover = FALSE (dzień 1)
COUNT(*) FILTER (WHERE is_leftover = FALSE) = 1

-- Reguła 3: Dokładnie 1 z portions_to_cook SET (dzień 1)
COUNT(*) FILTER (WHERE portions_to_cook IS NOT NULL) = 1

-- Reguła 4: Obie wartości portion_multiplier identyczne
MIN(portion_multiplier) ≈ MAX(portion_multiplier)
```

---

## 📊 Porównanie v1 vs v2

| Aspekt | v1 (❌ Błąd) | v2 (✅ Poprawka) | Migracja |
|--------|----------|------------|----------|
| `portion_multiplier` semantyka | Ułamek (0.5 + 0.5) | Liczba porcji (2.0) | Brak zmian (data ok) |
| `calories_planned` obliczanie | Aplikacja | Wyzwalacz | `fn_calculate_plan_meal_calories()` |
| `portions_to_cook` | Brak | Explicit pole | ALTER TABLE + UPDATE |
| Walidacja `portion_multiplier` | Brak | Wyzwalacz | `fn_validate_portion_multiplier()` |
| Constraint na parach | suma=1.0 (❌) | identyczne (✅) | `fn_enforce_multi_portion_group()` |
| Indeks na cooking | Brak | Jest | `plan_meals_portions_to_cook_idx` |

---

## 🚀 Instrukcje Deploymentu

### Dla Scenariusza A (Fresh Start)

```bash
# 1. Backupuj starą migrację (jeśli potrzebna)
cp supabase/migrations/20251015144149_create_initial_schema.sql \
   supabase/migrations/20251015144149_create_initial_schema.sql.backup

# 2. Użyj poprawionej migracji
# (Już zastąpiona w pliku 20251015144149_create_initial_schema.sql)

# 3. Reset bazy na staging
supabase db reset

# 4. Testuj
npm run dev
```


### Dla Scenariusza B (Istniejąca Baza)

```bash
# 1. Na staging
supabase link --project-ref <your-project>
supabase migration list  # Sprawdź że 20251015144149 jest deployed

# 2. Push migracji
supabase migration up

# 3. Weryfikacja danych
supabase db execute < - << 'EOF'
SELECT COUNT(*) as total_meals,
       COUNT(*) FILTER (WHERE portions_to_cook IS NOT NULL) as meals_to_cook,
       COUNT(*) FILTER (WHERE is_leftover = TRUE) as leftover_meals
FROM plan_meals;
EOF

# 4. Testuj na staging
npm run dev

# 5. Backupuj produkcję
supabase db download  # Jeśli używasz Supabase CLI

# 6. Deploy do produkcji
supabase push
```

---

## ⚠️ Potencjalne Problemy i Rozwiązania

### Problem 1: Istniejące multi-portion grupy z "suma=1.0"

**Symptom**: Po wdrożeniu, wyzwalacz odrzuca UPDATE na istniejące grupy

**Przyczyna**: Stare dane mają portion_multiplier jak 0.5 + 0.5, nowy wyzwalacz wymaga 2.0 + 2.0

**Rozwiązanie** (już w migracji 20251020):
```sql
-- Migracja automatycznie przelicza dla istniejących grup
-- Ale jeśli będzie problem, możesz ręcznie:
UPDATE plan_meals pm
SET portion_multiplier = portion_multiplier * 2
WHERE multi_portion_group_id IS NOT NULL
  AND is_leftover = FALSE;  -- Tylko dzień 1
```

### Problem 2: RLS Policy odraca INSERT/UPDATE

**Symptom**: Aplikacja nie może INSERT plan_meals

**Przyczyna**: RLS policy wymaga user_id = auth.uid(), ale wyzwalacz je denormalizuje

**Rozwiązanie**: RLS policy jest OK — wyzwalacz `fn_set_plan_meals_denorm()` ustawia `user_id` BEFORE INSERT

```sql
-- To jest w porządku:
INSERT INTO plan_meals (plan_day_id, recipe_id, portion_multiplier)
-- Wyzwalacz ustawia: plan_id, user_id (denormalizacja)
-- RLS policy sprawdza: user_id = auth.uid() ✓
```

### Problem 3: calories_planned != calories_kcal * portion_multiplier

**Symptom**: Stare dane mają błędne kalorie

**Przyczyna**: Aplikacja obliczała salnie, czasem z błędem

**Rozwiązanie** (już w migracji 20251020):
```sql
-- Migracja recalculates all:
UPDATE plan_meals pm
SET calories_planned = (r.calories_kcal * pm.portion_multiplier)::integer
FROM recipes r
WHERE pm.recipe_id = r.id;
```

---

## 🧪 Test Cases do Weryfikacji

### Test 1: Nowy multi-portion meal

```sql
-- Setup
INSERT INTO recipes (slug, name, portions, calories_kcal, is_active)
VALUES ('gulasz', 'Gulasz', 6, 250, TRUE);

INSERT INTO recipe_slots (recipe_id, slot) VALUES (1, 'lunch'), (1, 'dinner');

-- Insert day 1
INSERT INTO plan_meals (
  plan_day_id, recipe_id, portion_multiplier,
  multi_portion_group_id, is_leftover, portions_to_cook
) VALUES (1, 1, 3.0, 'uuid-1', FALSE, 6)
-- ✅ Wyzwalacz oblicza: calories_planned = 250 * 3.0 = 750

-- Insert day 2
INSERT INTO plan_meals (
  plan_day_id, recipe_id, portion_multiplier,
  multi_portion_group_id, is_leftover, portions_to_cook
) VALUES (2, 1, 3.0, 'uuid-1', TRUE, NULL)
-- ✅ Wyzwalacz sprawdza grupę — wszystkie reguły OK
```

### Test 2: Błędna portion_multiplier

```sql
-- Przepis ma 2 porcje
INSERT INTO recipes (slug, name, portions, calories_kcal)
VALUES ('omeleta', 'Omeleta', 2, 150);

-- Spróbuj wstawić 3 porcje
INSERT INTO plan_meals (plan_day_id, recipe_id, portion_multiplier)
VALUES (1, 2, 3.0)
-- ❌ EXCEPTION: portion_multiplier (3) cannot exceed recipe portions (2)
```

### Test 3: Recalculate calories

```sql
-- Update portion_multiplier
UPDATE plan_meals SET portion_multiplier = 4.0 WHERE id = 1
-- ✅ Wyzwalacz automatycznie recalculates: calories_planned = 250 * 4.0 = 1000
```

---

## 📚 Pliki Referencyjne

- **Schemat**: `.ai/db-plan-v2.md` — Pełna specyfikacja v2
- **Weryfikacja**: `.ai/algorithm-verification.md` — Logika i test cases
- **Migracja v1** (fresh start): `supabase/migrations/20251015144149_create_initial_schema.sql`
- **Migracja v2** (ALTER TABLE): `supabase/migrations/20251020_fix_multi_portion_schema.sql`

---

## ✅ Checklist Pre-Deployment

- [ ] Backupuj produkcję
- [ ] Testuj migrację na staging
- [ ] Zweryfikuj dane post-migracji (SELECT COUNT(*), portions_to_cook, etc.)
- [ ] Testuj aplikację (create/update/delete plan_meals)
- [ ] Testuj multi-portion meals (create pair, swap, delete)
- [ ] Zweryfikuj RLS policies (access control)
- [ ] Monitor errors post-deployment
- [ ] Update dokumentacji API (jeśli potrzebne)

---

**Dokument gotowy do deploymentu** ✅
