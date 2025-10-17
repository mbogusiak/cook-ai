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
- `portions` INTEGER NOT NULL DEFAULT 1 CHECK (portions >= 1)
- `prep_minutes` INTEGER NULL CHECK (prep_minutes IS NULL OR prep_minutes > 0)
- `cook_minutes` INTEGER NULL CHECK (cook_minutes IS NULL OR cook_minutes > 0)
- `image_url` TEXT NULL
- `source_url` TEXT NULL -- link do Cookido
- `rating_avg` NUMERIC(3,2) NULL CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5))
- `reviews_count` INTEGER NOT NULL DEFAULT 0 CHECK (reviews_count >= 0)
- `ingredients` TEXT[] NOT NULL DEFAULT '{}'::TEXT[]
- `calories_kcal` INTEGER NOT NULL CHECK (calories_kcal > 0)
- `protein_g` NUMERIC(6,2) NULL CHECK (protein_g IS NULL OR protein_g >= 0)
- `fat_g` NUMERIC(6,2) NULL CHECK (fat_g IS NULL OR fat_g >= 0)
- `carbs_g` NUMERIC(6,2) NULL CHECK (carbs_g IS NULL OR carbs_g >= 0)
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

Ograniczenia/uwagi:
- Brak twardych usunięć – dezaktywacja przez `is_active=false`.
- Dopuszczalne modyfikacje metadanych; referencje z `plan_meals` są RESTRICT.

### 1.2a. `recipe_slots`
- `recipe_id` BIGINT NOT NULL REFERENCES `recipes`(id) ON DELETE CASCADE
- `slot` `meal_slot` NOT NULL

Ograniczenia/uwagi:
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

Ograniczenia/uwagi:
- Jeden aktywny plan na użytkownika (indeks częściowy w sekcji 3).
- Plany koncepcyjnie niezmienne; aktualizacje ograniczone do `state` (egzekwowalne aplikacyjnie/RLS).

### 1.5. `plan_days`
- `id` BIGSERIAL PRIMARY KEY
- `plan_id` BIGINT NOT NULL REFERENCES `plans`(id) ON DELETE CASCADE
- `date` DATE NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

Ograniczenia/uwagi:
- UNIQUE (`plan_id`, `date`).

### 1.6. `plan_day_slot_targets`
- `id` BIGSERIAL PRIMARY KEY
- `plan_day_id` BIGINT NOT NULL REFERENCES `plan_days`(id) ON DELETE CASCADE
- `slot` `meal_slot` NOT NULL
- `calories_target` INTEGER NOT NULL CHECK (calories_target > 0)

Ograniczenia/uwagi:
- UNIQUE (`plan_day_id`, `slot`).

### 1.7. `plan_meals`
- `id` BIGSERIAL PRIMARY KEY
- `plan_day_id` BIGINT NOT NULL REFERENCES `plan_days`(id) ON DELETE CASCADE
- `plan_id` BIGINT NOT NULL -- denormalizacja dla wydajności
- `user_id` UUID NOT NULL -- denormalizacja dla RLS/przefiltrowań
- `slot` `meal_slot` NOT NULL
- `status` `meal_status` NOT NULL DEFAULT 'planned'
- `recipe_id` BIGINT NOT NULL REFERENCES `recipes`(id) ON DELETE RESTRICT
- `calories_planned` INTEGER NOT NULL CHECK (calories_planned > 0)
- `portion_multiplier` NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (portion_multiplier > 0)
- `multi_portion_group_id` UUID NULL
- `is_leftover` BOOLEAN NOT NULL DEFAULT FALSE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

Ograniczenia/uwagi:
- UNIQUE (`plan_day_id`, `slot`).
- CHECK: `multi_portion_group_id` IS NULL OR `slot` IN ('lunch','dinner').
- CHECK: `is_leftover` = FALSE OR `multi_portion_group_id` IS NOT NULL.
- Spójność `plan_id`/`user_id` z rodzicem egzekwowana wyzwalaczem (sekcja 4.3).
- Spójność par wieloporcjowych (suma `portion_multiplier` = 1.0, maks. 2 rekordy) egzekwowana wyzwalaczem (sekcja 4.2).
- Zgodność `slot` z dozwolonymi slotami przepisu egzekwowana wyzwalaczem (sekcja 4.5).


### 1.8. `auth.users` (Supabase)
- Tabela systemowa Supabase używana do uwierzytelniania i w RLS.
- Kluczowe kolumny (wykorzystywane przez nasz schemat):
  - `id` UUID PRIMARY KEY — identyfikator użytkownika.
  - `email` TEXT NULL — informacyjnie (nieużywane w FK/RLS).
  - `created_at` TIMESTAMPTZ — metadane.
- Zastosowanie w naszym schemacie:
  - FK: `user_settings.user_id` → `auth.users(id)`, `plans.user_id` → `auth.users(id)`.
  - Polityki RLS odwołują się do `auth.uid()` (zwraca `auth.users.id`).


## 2. Relacje między tabelami
- `auth.users (1) — (1) user_settings.user_id` (jeden-do-jednego)
- `auth.users (1) — (N) plans.user_id` (jeden-do-wielu)
- `plans (1) — (N) plan_days.plan_id` (jeden-do-wielu)
- `plan_days (1) — (N) plan_day_slot_targets.plan_day_id` (jeden-do-wielu)
- `plan_days (1) — (N) plan_meals.plan_day_id` (jeden-do-wielu)
- `recipes (1) — (N) plan_meals.recipe_id` (jeden-do-wielu)

Kardynalność wieloporcjowości: logiczna para w `plan_meals` łączona przez `multi_portion_group_id` (maks. 2 rekordy: dzień 1 gotowanie, dzień 2 resztki).


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


## 4. Zasady PostgreSQL i logika (RLS, wyzwalacze, funkcje)

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

### 4.2. Wyzwalacz spójności par wieloporcjowych
- Funkcja `fn_enforce_multi_portion_group()` (PL/pgSQL) wywoływana `AFTER INSERT OR UPDATE OR DELETE` na `plan_meals`, która:
  - Jeśli `multi_portion_group_id` nie jest NULL:
    - Sprawdza, że liczba rekordów w grupie ≤ 2.
    - Sprawdza, że suma `portion_multiplier` w grupie równa się 1.0 (z tolerancją np. 0.001).
    - Sprawdza, że wszystkie rekordy w grupie mają `slot` w (`'lunch'`, `'dinner'`).
  - W przypadku naruszenia — RAISE EXCEPTION.

### 4.3. Wyzwalacz denormalizacji `plan_id` i `user_id`
- Funkcja `fn_set_plan_meals_denorm()` (PL/pgSQL) wywoływana `BEFORE INSERT OR UPDATE` na `plan_meals`, która:
  - Ustawia `plan_id` = (SELECT `plan_id` FROM `plan_days` WHERE `id` = NEW.`plan_day_id`).
  - Ustawia `user_id` = (SELECT `user_id` FROM `plans` WHERE `id` = NEW.`plan_id`).

### 4.4. (Opcjonalnie) Funkcja RPC do wymiany posiłku
- `rpc_swap_meal(plan_meal_id BIGINT, new_recipe_id BIGINT)` — transakcyjnie:
  - Waliduje spójność slotu i kalorii (±20% targetu z `plan_day_slot_targets`).
  - Obsługuje pary wieloporcjowe zgodnie z zasadami (zamiana dnia 1 usuwa dzień 2 w grupie; zamiana dnia 2 nie wpływa na dzień 1).
  - Zwraca zaktualizowane rekordy `plan_meals` dla odświeżenia widoku.

### 4.5. Wyzwalacz zgodności slotu przepisu
- Funkcja `fn_validate_plan_meal_slot()` (PL/pgSQL) wywoływana `BEFORE INSERT OR UPDATE` na `plan_meals`, która:
  - Wymusza istnienie mapowania `recipe_slots`