# Schemat Bazy Danych - Planer Żywieniowy (v2 - POPRAWIONY)

**Wersja**: 2.0
**Data**: 2025-10-20
**Status**: Poprawiona semantyka `portion_multiplier` i logika wieloporcjowości

---

## 0. Zmany względem v1

### 🔴 Główne problemy v1:
1. **`portion_multiplier` definiowany jako ułamek do 1.0** - sprzeczne z logiką wieloporcjowości
2. **`calories_planned` rozcieńczany ułamkami** - powodował niedostatek kalorii w planie
3. **Brak pola `portions_to_cook`** - niemożliwe odróżnienie dnia "gotowania" od "restek"
4. **Niejasna semantyka** - algorytm nie miał jasnych reguł działania

### ✅ Poprawki v2:
1. **`portion_multiplier` = liczba porcji do zjedzenia** (nie ułamek)
2. **`calories_planned` = `calories_kcal * portion_multiplier`** (zawsze pełne kalorie)
3. **Dodane pole `portions_to_cook`** - eksplicytnie określa liczbę porcji do przygotowania
4. **Jasne reguły algorytmu** - opisane w sekcji 5

---

## 1. Lista tabel z kolumnami, typami i ograniczeniami

### 1.1. Typy i rozszerzenia
- **Rozszerzenia**:
  - `pg_trgm` (do indeksu podobieństwa nazw przepisów)
- **Enumy**:
  - `meal_slot`: `'breakfast' | 'lunch' | 'dinner' | 'snack'`
  - `meal_status`: `'planned' | 'completed' | 'skipped'`
  - `plan_state`: `'active' | 'archived' | 'cancelled'`

### 1.2. `recipes`
- `id` BIGSERIAL PRIMARY KEY
- `slug` TEXT NOT NULL UNIQUE
- `name` TEXT NOT NULL
- **`portions` INTEGER NOT NULL DEFAULT 1 CHECK (portions >= 1)** — liczba porcji w całym przepisie
- `prep_minutes` INTEGER NULL CHECK (prep_minutes IS NULL OR prep_minutes > 0)
- `cook_minutes` INTEGER NULL CHECK (cook_minutes IS NULL OR cook_minutes > 0)
- `image_url` TEXT NULL
- `source_url` TEXT NULL -- link do Cookido
- `rating_avg` NUMERIC(3,2) NULL CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5))
- `reviews_count` INTEGER NOT NULL DEFAULT 0 CHECK (reviews_count >= 0)
- `ingredients` TEXT[] NOT NULL DEFAULT '{}'::TEXT[]
- **`calories_kcal` INTEGER NOT NULL CHECK (calories_kcal > 0)** — kaloryczność JEDNEJ PORCJI
- `protein_g` NUMERIC(6,2) NULL CHECK (protein_g IS NULL OR protein_g >= 0)
- `fat_g` NUMERIC(6,2) NULL CHECK (fat_g IS NULL OR fat_g >= 0)
- `carbs_g` NUMERIC(6,2) NULL CHECK (carbs_g IS NULL OR carbs_g >= 0)
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

**Ograniczenia/uwagi**:
- Brak twardych usunięć – dezaktywacja przez `is_active=false`.
- Dopuszczalne modyfikacje metadanych; referencje z `plan_meals` są RESTRICT.
- ⚠️ **WAŻNE**: `calories_kcal` to kaloryczność JEDNEJ porcji, nie całego przepisu!

### 1.2a. `recipe_slots`
- `recipe_id` BIGINT NOT NULL REFERENCES `recipes`(id) ON DELETE CASCADE
- `slot` `meal_slot` NOT NULL

**Ograniczenia/uwagi**:
- UNIQUE (`recipe_id`, `slot`) — jeden przepis może mieć wiele slotów, ale bez duplikatów.

### 1.3. `user_settings`
- `user_id` UUID PRIMARY KEY REFERENCES `auth`.`users`(id) ON DELETE RESTRICT
- `default_daily_calories` INTEGER NOT NULL CHECK (default_daily_calories > 0)
- `default_plan_length_days` INTEGER NOT NULL DEFAULT 7 CHECK (default_plan_length_days BETWEEN 1 AND 31)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### 1.4. `plans`
- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID NOT NULL REFERENCES `auth`.`users`(id) ON DELETE RESTRICT
- `state` `plan_state` NOT NULL DEFAULT 'active'
- `start_date` DATE NOT NULL
- `end_date` DATE NOT NULL CHECK (end_date >= start_date)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

**Ograniczenia/uwagi**:
- Jeden aktywny plan na użytkownika (indeks częściowy w sekcji 3).
- Plany koncepcyjnie niezmienne; aktualizacje ograniczone do `state` (egzekwowalne aplikacyjnie/RLS).

### 1.5. `plan_days`
- `id` BIGSERIAL PRIMARY KEY
- `plan_id` BIGINT NOT NULL REFERENCES `plans`(id) ON DELETE CASCADE
- `date` DATE NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

**Ograniczenia/uwagi**:
- UNIQUE (`plan_id`, `date`).

### 1.6. `plan_day_slot_targets`
- `id` BIGSERIAL PRIMARY KEY
- `plan_day_id` BIGINT NOT NULL REFERENCES `plan_days`(id) ON DELETE CASCADE
- `slot` `meal_slot` NOT NULL
- `calories_target` INTEGER NOT NULL CHECK (calories_target > 0)

**Ograniczenia/uwagi**:
- UNIQUE (`plan_day_id`, `slot`).
- ⚠️ **WAŻNE**: `calories_target` to cel dla całego posiłku (wszystkich porcji razem), nie dla pojedynczej porcji!

### 1.7. `plan_meals` — POPRAWIONY

- `id` BIGSERIAL PRIMARY KEY
- `plan_day_id` BIGINT NOT NULL REFERENCES `plan_days`(id) ON DELETE CASCADE
- `plan_id` BIGINT NOT NULL -- denormalizacja dla wydajności
- `user_id` UUID NOT NULL -- denormalizacja dla RLS/przefiltrowań
- `slot` `meal_slot` NOT NULL
- `status` `meal_status` NOT NULL DEFAULT 'planned'
- `recipe_id` BIGINT NOT NULL REFERENCES `recipes`(id) ON DELETE RESTRICT

**🔴 ZMIENIONE**:
- **`portion_multiplier` NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (portion_multiplier > 0)**
  - ✅ **NOWA SEMANTYKA**: Liczba porcji do zjedzenia (np. 1.0, 2.0, 0.5)
  - Wzór na kalorie: `calories_planned = recipes.calories_kcal * portion_multiplier`
  - Dla pary wieloporcjowej: oba dni mają taką samą `portion_multiplier`
  - **Więz**: `portion_multiplier <= recipes.portions` (nie możesz zjeść więcej niż receptura zawiera)

- **`calories_planned` INTEGER NOT NULL CHECK (calories_planned > 0)**
  - ✅ Zawsze obliczane jako: `calories_kcal * portion_multiplier`
  - Denormalizacja dla szybkich zapytań (weryfikacja ±20% targetu)
  - Wyzwalacz `fn_calculate_plan_meal_calories()` automatycznie ustawia tę wartość

- **`portions_to_cook` INTEGER NULL CHECK (portions_to_cook IS NULL OR portions_to_cook > 0)`**
  - ✅ **NOWE POLE**: Liczba porcji do przygotowania w całości
  - NULL dla dnia 2 (resztki) — resztki nie wymagają gotowania
  - Dzień 1 (gotowanie): `portions_to_cook = 6` (cała receptura)
  - Dzień 2 (resztki): `portions_to_cook = NULL`
  - **Ograniczenie**: `portions_to_cook = recipes.portions` (zawsze cała receptura, lub NULL)

- **`is_leftover` BOOLEAN NOT NULL DEFAULT FALSE**
  - TRUE = to są resztki (dzień 2 w grupie wieloporcjowej)
  - FALSE = dzień 1 (gotowanie) lub zwykły posiłek

- `multi_portion_group_id` UUID NULL
  - Łączy parę posiłków (dzień 1 i dzień 2)
  - Oba rekordy mają tę samą wartość

- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

**Ograniczenia/uwagi**:
- UNIQUE (`plan_day_id`, `slot`) — jeden posiłek per slot dziennie
- CHECK: `multi_portion_group_id` IS NULL OR `slot` IN ('lunch','dinner') — wieloporcje tylko lunch/dinner
- CHECK: `is_leftover` = FALSE OR `multi_portion_group_id` IS NOT NULL — resztki muszą mieć grupę
- CHECK: `portions_to_cook` IS NULL OR `is_leftover` = FALSE — tylko dzień 1 gotuje
- CHECK: `multi_portion_group_id` IS NULL OR `portions_to_cook` IS NULL OR `is_leftover` = FALSE — w grupie tylko dzień 1 gotuje
- ✅ **USUNIĘTY**: Stary constraint "suma `portion_multiplier` = 1.0" — to było błędem
- Spójność `plan_id`/`user_id` z rodzicem egzekwowana wyzwalaczem (sekcja 4.3)
- Spójność par wieloporcjowych egzekwowana wyzwalaczem (sekcja 4.2) — oba dni w grupie muszą mieć tę samą `portion_multiplier`
- Zgodność `slot` z dozwolonymi slotami przepisu egzekwowana wyzwalaczem (sekcja 4.5)

### 1.8. `auth.users` (Supabase)
- Tabela systemowa Supabase używana do uwierzytelniania i w RLS.
- Kluczowe kolumny (wykorzystywane przez nasz schemat):
  - `id` UUID PRIMARY KEY — identyfikator użytkownika.
  - `email` TEXT NULL — informacyjnie (nieużywane w FK/RLS).
  - `created_at` TIMESTAMPTZ — metadane.
- Zastosowanie w naszym schemacie:
  - FK: `user_settings.user_id` → `auth.users(id)`, `plans.user_id` → `auth.users(id)`.
  - Polityki RLS odwołują się do `auth.uid()` (zwraca `auth.users.id`).

---

## 2. Relacje między tabelami
- `auth.users (1) — (1) user_settings.user_id` (jeden-do-jednego)
- `auth.users (1) — (N) plans.user_id` (jeden-do-wielu)
- `plans (1) — (N) plan_days.plan_id` (jeden-do-wielu)
- `plan_days (1) — (N) plan_day_slot_targets.plan_day_id` (jeden-do-wielu)
- `plan_days (1) — (N) plan_meals.plan_day_id` (jeden-do-wielu)
- `recipes (1) — (N) plan_meals.recipe_id` (jeden-do-wielu)

**Kardynalność wieloporcjowości**: Logiczna para w `plan_meals` łączona przez `multi_portion_group_id` (dokładnie 2 rekordy: dzień 1 z `portions_to_cook=receptura` oraz dzień 2 z `is_leftover=true`).

---

## 3. Indeksy
- `recipes`
  - UNIQUE (`slug`)
  - BTREE (`calories_kcal`)
  - GIN (`name` gin_trgm_ops) — wymaga `pg_trgm`
  - GIN (`ingredients`) — wyszukiwanie po składnikach (opcjonalnie)

- `plans`
  - PARTIAL UNIQUE (`user_id`) WHERE `state` = 'active' — jeden aktywny plan na użytkownika

- `plan_days`
  - BTREE (`plan_id`, `date`)

- `plan_meals`
  - BTREE (`plan_id`, `slot`, `status`)
  - BTREE (`multi_portion_group_id`)
  - PARTIAL (`plan_id`, `slot`) WHERE `status` = 'planned' — częste filtrowanie operacyjne
  - BTREE (`portions_to_cook`) WHERE `portions_to_cook` IS NOT NULL — szybkie znalezienie dni "gotowania"

---

## 4. Wyzwalacze PostgreSQL i logika biznesowa

### 4.1. RLS (Row Level Security)
- Włączone na tabelach: `plans`, `plan_days`, `plan_day_slot_targets`, `plan_meals`.
- Wyłączone na `recipes` (tylko PUBLIC SELECT) lub alternatywnie RLS z polityką tylko do odczytu dla wszystkich.

Polityki (z wykorzystaniem `auth.uid()` w Supabase):
- `plans`
  - SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`
  - Dodatkowo można ograniczyć UPDATE do kolumny `state` (reguły/kolumny dozwolone na poziomie polityki w Supabase).
- `plan_days`
  - SELECT/INSERT/UPDATE/DELETE: `EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_days.plan_id AND p.user_id = auth.uid())`
- `plan_day_slot_targets`
  - SELECT/INSERT/UPDATE/DELETE: `EXISTS (SELECT 1 FROM plan_days d JOIN plans p ON p.id = d.plan_id WHERE d.id = plan_day_slot_targets.plan_day_id AND p.user_id = auth.uid())`
- `plan_meals`
  - SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`

### 4.2. 🆕 Wyzwalacz obliczania `calories_planned`

**Funkcja**: `fn_calculate_plan_meal_calories()`

Wywoływana: `BEFORE INSERT OR UPDATE` na `plan_meals`

Logika:
```sql
NEW.calories_planned := (
  SELECT calories_kcal FROM recipes WHERE id = NEW.recipe_id
) * EXTRACT(EPOCH FROM NEW.portion_multiplier)::INTEGER;
```

Gwarancje:
- `calories_planned` zawsze = `calories_kcal * portion_multiplier`
- Nie trzeba przekazywać `calories_planned` z aplikacji — wyzwalacz oblicza

### 4.3. 🔴 POPRAWIONY - Wyzwalacz spójności par wieloporcjowych

**Funkcja**: `fn_enforce_multi_portion_group()`

Wywoływana: `AFTER INSERT OR UPDATE OR DELETE` na `plan_meals`

Logika (gdy `multi_portion_group_id` ≠ NULL):
- ✅ Sprawdza, że liczba rekordów w grupie = 2 (nie 1, nie 3)
- ✅ Sprawdza, że dokładnie jeden rekord ma `is_leftover=FALSE` (dzień 1)
- ✅ Sprawdz, że dokładnie jeden rekord ma `is_leftover=TRUE` (dzień 2)
- ✅ Sprawdza, że oba rekordy mają identyczną `portion_multiplier` (tę samą liczbę porcji)
- ✅ Sprawdza, że slot jest taki sam w obu dniach
- ✅ Sprawdza, że oba rekordy mają `slot` w ('lunch', 'dinner')
- ✅ Sprawdza, że `portions_to_cook` = `recipes.portions` tylko na dniu 1
- ✅ Sprawdza, że `portions_to_cook` = NULL tylko na dniu 2
- ❌ **USUNIĘTY**: Stary constraint "suma `portion_multiplier` = 1.0"

W przypadku naruszenia — RAISE EXCEPTION.

### 4.4. Wyzwalacz denormalizacji `plan_id` i `user_id`

**Funkcja**: `fn_set_plan_meals_denorm()`

Wywoływana: `BEFORE INSERT OR UPDATE` na `plan_meals`

Logika:
- Ustawia `plan_id` = (SELECT `plan_id` FROM `plan_days` WHERE `id` = NEW.`plan_day_id`)
- Ustawia `user_id` = (SELECT `user_id` FROM `plans` WHERE `id` = NEW.`plan_id`)

### 4.5. (Opcjonalnie) Funkcja RPC do wymiany posiłku

**Funkcja**: `rpc_swap_meal(plan_meal_id BIGINT, new_recipe_id BIGINT, new_portion_multiplier NUMERIC)`

Transakcyjna operacja:
- Waliduje spójność slotu i kalorii (±20% targetu z `plan_day_slot_targets`)
- Obsługuje pary wieloporcjowe:
  - Zamiana dnia 1 (np. `is_leftover=FALSE`): usuwa dzień 2 z tej grupy, generuje nowy dzień 2
  - Zamiana dnia 2 (np. `is_leftover=TRUE`): nie wpływa na dzień 1
- Zwraca zaktualizowane rekordy `plan_meals` dla odświeżenia widoku

### 4.6. Wyzwalacz zgodności slotu przepisu

**Funkcja**: `fn_validate_plan_meal_slot()`

Wywoływana: `BEFORE INSERT OR UPDATE` na `plan_meals`

Logika:
- Wymusza istnienie mapowania w `recipe_slots`: `EXISTS (SELECT 1 FROM recipe_slots WHERE recipe_id = NEW.recipe_id AND slot = NEW.slot)`
- W przypadku naruszenia — RAISE EXCEPTION

---

## 5. Algorytm generowania planu — Logika biznesowa

### 5.1. Wejście
```
User Input:
- daily_calories: INT (np. 2000)
- plan_length_days: INT (np. 7)
- start_date: DATE

Konfiguracja (stała):
- breakfast: 20% = 400 kcal
- lunch: 30% = 600 kcal
- dinner: 30% = 600 kcal
- snack: 20% = 400 kcal
```

### 5.2. Przygotowanie danych

1. **Oblicz target dla każdego slotu:**
   ```
   target[breakfast] = 2000 * 0.20 = 400 kcal
   target[lunch] = 2000 * 0.30 = 600 kcal
   target[dinner] = 2000 * 0.30 = 600 kcal
   target[snack] = 2000 * 0.20 = 400 kcal
   ```

2. **Utwórz `plan_days` i `plan_day_slot_targets` dla każdego dnia:**
   ```sql
   FOR each_day IN 1..plan_length_days:
     INSERT INTO plan_days (plan_id, date) VALUES (..., start_date + (each_day - 1) days)
     FOR each_slot IN [breakfast, lunch, dinner, snack]:
       INSERT INTO plan_day_slot_targets (plan_day_id, slot, calories_target)
       VALUES (..., each_slot, target[each_slot])
   ```

### 5.3. Wybór przepisów dla każdego slotu każdego dnia

**Dla każdego dnia i każdego slotu:**

#### Krok 1: Znajdź dostępne przepisy
```sql
SELECT recipes WHERE:
  - recipe_slots.slot = current_slot
  - is_active = TRUE
  - recipe_id NOT IN (przepisy już użyte w tym planie)  -- unikanie powtórzeń
```

#### Krok 2: Filtruj po kaloriach
```
Dla каждого dostępnego przepisu:
  -- Oblicz ile porcji należy zjeść
  portions_needed = CEIL(target_calories / calories_kcal)

  -- Sprawdź, czy przepis ma tyle porcji
  IF portions_needed <= recipes.portions:
    -- Oblicz rzeczywiste kalorie
    calories_total = calories_kcal * portions_needed

    -- Sprawdź, czy mieści się w ±20% targetu
    IF calories_total BETWEEN target_calories * 0.8 AND target_calories * 1.2:
      ✅ Przepis pasuje!
      portion_multiplier = portions_needed
```

#### Krok 3: Wybierz przepis
- Weź pierwszy pasujący przepis (lub losowy, lub wg ratingu)
- Ustaw `portion_multiplier = portions_needed`

#### Krok 4: Obsłuż wieloporcjowość (TYLKO dla lunch/dinner)
```
IF slot IN ('lunch', 'dinner') AND recipes.portions > 1:
  -- Zaplanuj ten sam posiłek na następny dzień (jeśli istnieje)
  IF next_day_exists:
    INSERT INTO plan_meals (
      plan_day_id = next_day_id,
      slot = current_slot,
      recipe_id = selected_recipe_id,
      portion_multiplier = portions_needed,
      is_leftover = TRUE,
      portions_to_cook = NULL,
      multi_portion_group_id = unique_uuid()
    )

    -- Zaktualizuj dzień 1
    UPDATE plan_meals SET
      multi_portion_group_id = unique_uuid(),
      portions_to_cook = recipes.portions
    WHERE id = meal_id_day_1

    -- Pomiń następny dzień w głównej pętli (już ma posiłek)
    skip_next_day[current_slot] = TRUE
ELSE:
  -- Zwykły posiłek (bez wieloporcji)
  portions_to_cook = NULL
  is_leftover = FALSE
  multi_portion_group_id = NULL
```

### 5.4. Przykład wykonania

```
Parametry:
- daily_calories: 2000
- plan_length_days: 3
- start_date: 2025-10-21 (poniedziałek)

Dzień 1 (2025-10-21, poniedziałek):
┌─────────────────┬────────┬──────┬──────────────────┬──────┐
│ Slot      │ Target │ Recipe       │ portions │ portion_multiplier │ CalPlanned │ Gotuj? │
├─────────────────┼────────┼──────┼──────────────────┼──────┤
│ Breakfast │ 400    │ Owsianka     │ 1        │ 1.0                │ 350        │ Nie    │
│ Lunch     │ 600    │ Gulasz (6p)  │ 6        │ 2.0                │ 500        │ TAK    │
│ Dinner    │ 600    │ Kurczak (2p) │ 2        │ 1.5                │ 450        │ TAK    │
│ Snack     │ 400    │ Jabłko       │ 1        │ 1.0                │ 95         │ Nie    │
└─────────────────┴────────┴──────┴──────────────────┴──────┘

Dzień 2 (2025-10-22, wtorek):
┌─────────────────┬────────┬──────────────────────┬──────┬──────────────────┬──────┬────────┐
│ Slot      │ Target │ Recipe                   │ portions │ portion_multiplier │ CalPlanned │ Rodzaj │
├─────────────────┼────────┼──────────────────────┼──────┼──────────────────┼──────┼────────┤
│ Breakfast │ 400    │ Jogurt                   │ 1        │ 1.0                │ 350 │ nowy   │
│ Lunch     │ 600    │ Gulasz (resztki z dnia 1)│ 6        │ 2.0                │ 500 │ resztki│
│ Dinner    │ 600    │ Ryba (4p)                │ 4        │ 1.5                │ 450 │ nowy   │
│ Snack     │ 400    │ Batonik                  │ 1        │ 1.0                │ 95  │ nowy   │
└─────────────────┴────────┴──────────────────────┴──────┴──────────────────┴──────┴────────┘

Dzień 3 (2025-10-23, środa):
Bez powtórzeń z dni poprzednich (lunch i dinner z dnia 3 są nowe)
```

### 5.5. Walidacja planu na koniec

```sql
FOR each plan_day:
  total_calories = SUM(calories_planned for all slots in day)

  -- Łagodna walidacja (±10% od docelowych)
  expected_calories = daily_calories
  IF total_calories < expected_calories * 0.90:
    WARNING: Plan niedokarmiony dla dnia X
  IF total_calories > expected_calories * 1.10:
    WARNING: Plan nadmiarowy dla dnia X
```

---

## 6. Logika wymiany posiłku

### 6.1. Użytkownik klika "Wymień" na posiłku

**Input:**
- `plan_meal_id` — który posiłek wymienić

**Proces:**

1. **Pobierz dane posiłku:**
   ```sql
   SELECT pm.*, pmst.calories_target FROM plan_meals pm
   JOIN plan_day_slot_targets pmst ON pm.plan_day_id = pmst.plan_day_id
   WHERE pm.id = plan_meal_id
   ```

2. **Znajdź alternatywy:**
   ```sql
   SELECT recipes WHERE:
     - slot musi być taki sam
     - calories_kcal * [0.5..2.0] BETWEEN calories_target * 0.8 AND calories_target * 1.2
     - recipe_id != current_recipe_id
     - recipe_id NOT IN (przepisy już użyte w planie)
     - is_active = TRUE
   LIMIT 3
   ```

3. **Wyświetl do 3 alternatyw**

### 6.2. Użytkownik wybiera nowy posiłek

**Scenariusz 1: Wymiana zwykłego posiłku (bez wieloporcji)**

```sql
UPDATE plan_meals SET
                    recipe_id = new_recipe_id,
                    portion_multiplier = new_portion_multiplier,
                    calories_planned = new_calories
WHERE id = plan_meal_id
```

**Scenariusz 2: Wymiana dnia 1 w powiązanej parze (is_leftover=FALSE)**

```sql
-- Zaktualizuj dzień 1
UPDATE plan_meals SET
                    recipe_id = new_recipe_id,
                    portion_multiplier = new_portion_multiplier,
                    calories_planned = new_calories,
                    portions_to_cook = new_recipes.portions
WHERE id = plan_meal_id

-- Usuń dzień 2 z tej grupy
DELETE FROM plan_meals
WHERE multi_portion_group_id = (
  SELECT multi_portion_group_id FROM plan_meals WHERE id = plan_meal_id
) AND is_leftover = TRUE

-- Wygeneruj nowy dzień 2 (resztki)
  INSERT INTO plan_meals (
  plan_day_id = next_plan_day_id,
  slot = current_slot,
  recipe_id = new_recipe_id,
  portion_multiplier = new_portion_multiplier,
  is_leftover = TRUE,
  portions_to_cook = NULL,
  multi_portion_group_id = new_uuid()
  )
```

**Scenariusz 3: Wymiana dnia 2 w powiązanej parze (is_leftover=TRUE)**

```sql
-- Odłącz od grupy i zastąp
UPDATE plan_meals SET
                    recipe_id = new_recipe_id,
                    portion_multiplier = new_portion_multiplier,
                    calories_planned = new_calories,
                    multi_portion_group_id = NULL,
                    is_leftover = FALSE,
                    portions_to_cook = NULL
WHERE id = plan_meal_id

-- Dzień 1 pozostaje bez zmian
```

---

## 7. Przykład SQL do tworzenia schematu

```sql
-- Rozszerzenia
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enumy
CREATE TYPE meal_slot AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE meal_status AS ENUM ('planned', 'completed', 'skipped');
CREATE TYPE plan_state AS ENUM ('active', 'archived', 'cancelled');

-- Tabele
CREATE TABLE recipes (
                       id BIGSERIAL PRIMARY KEY,
                       slug TEXT NOT NULL UNIQUE,
                       name TEXT NOT NULL,
                       portions INTEGER NOT NULL DEFAULT 1 CHECK (portions >= 1),
                       prep_minutes INTEGER NULL CHECK (prep_minutes IS NULL OR prep_minutes > 0),
                       cook_minutes INTEGER NULL CHECK (cook_minutes IS NULL OR cook_minutes > 0),
                       image_url TEXT NULL,
                       source_url TEXT NULL,
                       rating_avg NUMERIC(3,2) NULL CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5)),
                       reviews_count INTEGER NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
                       ingredients TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
                       calories_kcal INTEGER NOT NULL CHECK (calories_kcal > 0),
                       protein_g NUMERIC(6,2) NULL CHECK (protein_g IS NULL OR protein_g >= 0),
                       fat_g NUMERIC(6,2) NULL CHECK (fat_g IS NULL OR fat_g >= 0),
                       carbs_g NUMERIC(6,2) NULL CHECK (carbs_g IS NULL OR carbs_g >= 0),
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_slots (
                            recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                            slot meal_slot NOT NULL,
                            UNIQUE (recipe_id, slot)
);

CREATE TABLE user_settings (
                             user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
                             default_daily_calories INTEGER NOT NULL CHECK (default_daily_calories > 0),
                             default_plan_length_days INTEGER NOT NULL DEFAULT 7 CHECK (default_plan_length_days BETWEEN 1 AND 31),
                             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                             updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plans (
                     id BIGSERIAL PRIMARY KEY,
                     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
                     state plan_state NOT NULL DEFAULT 'active',
                     start_date DATE NOT NULL,
                     end_date DATE NOT NULL CHECK (end_date >= start_date),
                     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_plans_active_user ON plans(user_id) WHERE state = 'active';

CREATE TABLE plan_days (
                         id BIGSERIAL PRIMARY KEY,
                         plan_id BIGINT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                         date DATE NOT NULL,
                         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                         UNIQUE (plan_id, date)
);

CREATE TABLE plan_day_slot_targets (
                                     id BIGSERIAL PRIMARY KEY,
                                     plan_day_id BIGINT NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
                                     slot meal_slot NOT NULL,
                                     calories_target INTEGER NOT NULL CHECK (calories_target > 0),
                                     UNIQUE (plan_day_id, slot)
);

CREATE TABLE plan_meals (
                          id BIGSERIAL PRIMARY KEY,
                          plan_day_id BIGINT NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
                          plan_id BIGINT NOT NULL,
                          user_id UUID NOT NULL,
                          slot meal_slot NOT NULL,
                          status meal_status NOT NULL DEFAULT 'planned',
                          recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
                          portion_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (portion_multiplier > 0),
                          calories_planned INTEGER NOT NULL CHECK (calories_planned > 0),
                          portions_to_cook INTEGER NULL CHECK (portions_to_cook IS NULL OR portions_to_cook > 0),
                          is_leftover BOOLEAN NOT NULL DEFAULT FALSE,
                          multi_portion_group_id UUID NULL,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                          UNIQUE (plan_day_id, slot),
                          CHECK (multi_portion_group_id IS NULL OR slot IN ('lunch', 'dinner')),
                          CHECK (is_leftover = FALSE OR multi_portion_group_id IS NOT NULL),
                          CHECK (portions_to_cook IS NULL OR is_leftover = FALSE),
                          CHECK (multi_portion_group_id IS NULL OR portions_to_cook IS NULL OR is_leftover = FALSE)
);

-- Indeksy
CREATE INDEX idx_recipes_calories ON recipes(calories_kcal);
CREATE INDEX idx_recipes_name_trgm ON recipes USING GIN(name gin_trgm_ops);
CREATE INDEX idx_plan_days_plan_date ON plan_days(plan_id, date);
CREATE INDEX idx_plan_meals_plan_slot_status ON plan_meals(plan_id, slot, status);
CREATE INDEX idx_plan_meals_multi_portion_group ON plan_meals(multi_portion_group_id);
CREATE INDEX idx_plan_meals_portions_to_cook ON plan_meals(portions_to_cook) WHERE portions_to_cook IS NOT NULL;
```



## 8. Otwarte pytania do ustalenia

1. **Losowość vs Rating**: Czy algorytm wybiera przepis losowo, czy po ratingu/popularności?
2. **Tolerancja kalorii**: Czy ±20% to sztywny wymóg, czy można go konfigurować?
3. **Limit powtórzeń**: Ile razy ten sam przepis może się pojawić w planie?
4. **Wieloporcje dla breakfast/snack**: Czy zawsze breakfast i snack to pojedyncze porcje, czy mogą być wieloporcjowe?
5. **Fallback**: Co się dzieje, jeśli brakuje pasujących przepisów?

---

**Dokument przygotowany**: 2025-10-20
**Status**: Gotowy do implementacji na poziomie DB
