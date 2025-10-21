# Jak Uruchomić Migracje Supabase

**Data**: 2025-10-20

---

## 1️⃣ LOKALNIE — Supabase Local Development

### Krok 1: Uruchom Supabase lokalne

```bash
supabase start
```

**Wyjście**:
```
Started supabase local development server.

API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:5432/postgres
```

> ℹ️ Po raz pierwszy pobierze Docker image (~5 min)

### Krok 2: Uruchom migracje na lokalnej bazie

```bash
supabase migration list
```

**Wyjście**:
```
        Version        │                  Name                   │          Inserted At           │ Execution Time
──────────────────────┼─────────────────────────────────────────┼────────────────────────────────┼────────────────
 20251015144149       │ create_initial_schema                   │ 2025-10-15 14:45:00.123+00    │ 1200 ms
 20251016            │ fix_rls_for_data_loading                │ 2025-10-16 07:38:00.456+00    │ 150 ms
```

### Krok 3a: Jeśli baza CZYSTA (fresh start)

```bash
# Opcja 1: Reset całej bazy (wymaża wszystko + reruns migracje)
supabase db reset

# Opcja 2: Uruchom tylko nowe migracje
supabase db pull          # Pobiera latest schema z Supabase
supabase migration list   # Sprawdzić które są pending
supabase db push          # Pushuje nowe migracje
```

### Krok 3b: Jeśli baza MA DANE (production-like)

```bash
# Tylko uruchom nowe migracje (bez czyszczenia)
supabase migration up

# Sprawdź status
supabase migration list
```

### Krok 4: Zweryfikuj że migracje działają

```bash
# Połącz się z lokalną bazą
psql postgresql://postgres:postgres@localhost:5432/postgres

-- W psql:
\dt                                    -- Lista tabel
SELECT * FROM information_schema.columns WHERE table_name = 'plan_meals';
```

Albo przez CLI:

```bash
supabase db execute < - << 'EOF'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plan_meals'
ORDER BY ordinal_position;
EOF
```

---

## 2️⃣ STAGING/PRODUKCJA — Supabase Cloud

### Krok 1: Zaloguj się do Supabase

```bash
# Jeśli pierwszy raz:
supabase login

# Wpisze prompt: wklejasz token z https://app.supabase.com/account/tokens
```

### Krok 2: Link projekt

```bash
# Znajdujesz project ID z: https://app.supabase.com/projects
supabase link --project-ref <PROJECT_ID>
```

**Przykład**:
```bash
supabase link --project-ref abcdefghijklmnop
```

**Wyjście**:
```
Linked supabase project ref: abcdefghijklmnop
```

### Krok 3: Sprawdź status migracji

```bash
supabase migration list
```

### Krok 4a: Jeśli to NOWY projekt (baza pusta)

```bash
# Push wszystko (schema + migracje)
supabase push
```

**Wyjście**:
```
Applying migration 20251015144149_create_initial_schema.sql...
Applying migration 20251016_fix_rls_for_data_loading.sql...
Applying migration 20251020_fix_multi_portion_schema.sql...
✓ Done
```

### Krok 4b: Jeśli projekt MA DANE (prod update)

```bash
# Sprawdź które migracje jeszcze nie ran:
supabase migration list

# Uruchom TYLKO nowe migracje (bez push'owania schema):
supabase db push

# Lub jeśli chcesz wszystko:
supabase push --dry-run              # Podgląd co będzie zrobione
supabase push                        # Faktycznie push
```

### Krok 5: Zweryfikuj migracje na produkcji

```bash
# Z CLI:
supabase migration list

# Lub z aplikacji (SQL):
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'plan_meals';
```

---

## 3️⃣ WORKFLOW — Pełny Cykl Deploymentu

### Scenariusz: Wdróż v2 schematu

#### Phase 1: Lokalne testowanie

```bash
cd /Users/marcin.bogusiak/10xdevs/cookido-ai

# 1. Start Supabase local
supabase start

# 2. Reset fresh (usuwa wszystko, reruns migracje)
supabase db reset

# 3. Testuj aplikację
npm run dev

# 4. Zweryfikuj dane
supabase db execute < - << 'EOF'
SELECT COUNT(*) as plan_meals_count,
       COUNT(*) FILTER (WHERE portions_to_cook IS NOT NULL) as with_portions_to_cook
FROM plan_meals;
EOF

# 5. Jeśli OK, stop local
supabase stop
```

#### Phase 2: Staging deployment

```bash
# 1. Link staging project
supabase link --project-ref <STAGING_PROJECT_ID>

# 2. Dry run
supabase push --dry-run

# 3. Push
supabase push

# 4. Monitor logs
supabase functions list  # Jeśli masz edge functions
supabase logs:prod       # Real-time logs

# 5. Testuj na staging
npm run dev
# Testuj: create plan, multi-portion meals, swap, delete

# 6. Sprawdź dane
supabase db execute < - << 'EOF'
SELECT COUNT(*) as total_meals,
       COUNT(*) FILTER (WHERE portions_to_cook IS NOT NULL) as meals_to_cook
FROM plan_meals;
EOF
```

#### Phase 3: Production deployment

```bash
# 1. Link production project
supabase link --project-ref <PRODUCTION_PROJECT_ID>

# 2. DRY RUN (zawsze!)
supabase push --dry-run

# 3. Backup produkcji (opcjonalnie, Supabase automata backupuje)
supabase db download

# 4. Push do produkcji
supabase push

# 5. Monitor
supabase logs:prod

# 6. Verify
supabase migration list
```

---

## 🔧 COMMON COMMANDS

### Statystyki migracji

```bash
# Lista wszystkich migracji z timestamps
supabase migration list --linked

# Szczegóły konkretnej migracji
supabase migration info 20251020_fix_multi_portion_schema
```

### Debug migracji

```bash
# Jeśli migracja się nie zaaplikowała:
supabase db push --debug

# Jeśli chcesz rollback (⚠️ OSTROŻNIE!):
# Supabase nie ma automatycznego rollback!
# Musisz ręcznie napisać down migration LUB:
supabase db reset  # Tylko lokalnie!
```

### Bezpieczeństwo

```bash
# Zawsze sprawdź co się zmieni:
supabase push --dry-run

# Zawsze backup przed prod:
supabase db download > backup_$(date +%Y%m%d_%H%M%S).sql

# Zawsze testuj na staging najpierw:
supabase link --project-ref <STAGING>
supabase push
# Test... jeśli OK:
supabase link --project-ref <PRODUCTION>
supabase push
```

---

## ❌ PROBLEMY I ROZWIĄZANIA

### Problem: "Migration already applied"

```bash
supabase migration list
```

**Rozwiązanie**: Migracja już ran. Musisz:
- Albo nic nie robić (migracja OK)
- Albo napisać nową migrację (rollback + nowy SQL)

### Problem: "Cannot connect to database"

```bash
# Sprawdź czy Supabase local jest uruchomiony
supabase status

# Jeśli nie:
supabase start

# Jeśli problem trwa:
supabase stop
supabase start --debug
```

### Problem: Migracja się zawiesiła

```bash
# Sprawdź logi
supabase logs:prod  # Jeśli cloud
supabase logs       # Jeśli local

# Spróbuj ponownie:
supabase push
```

### Problem: Błąd "RLS policy constraint"

```
ERROR: new row violates row level security policy
```

**Przyczyna**: Aplikacja nie wysyła user_id, albo auth nie jest zalogowany

**Rozwiązanie**: Sprawdzić aplikacyjny kod insercji (musi mieć auth context)

---

## 📋 QUICK REFERENCE

| Zadanie | Komenda |
|---------|---------|
| Start local | `supabase start` |
| Stop local | `supabase stop` |
| Reset local | `supabase db reset` |
| Lista migracji | `supabase migration list` |
| Sprawdź pending | `supabase migration list --dry-run` |
| Link projekt | `supabase link --project-ref <ID>` |
| Push schemy | `supabase push` |
| Push tylko migracje | `supabase db push` |
| Dry run | `supabase push --dry-run` |
| Download backup | `supabase db download` |
| Execute SQL | `supabase db execute < - << 'EOF'` |

---

## 🚀 PEŁNY WORKFLOW — Dla v2 Schematu

```bash
# KROK 1: LOCAL TESTING
supabase start
supabase db reset
npm run dev
# Test aplikacji...
supabase stop

# KROK 2: STAGING
supabase link --project-ref <STAGING_ID>
supabase push --dry-run
# Sprawdzić output...
supabase push
npm run dev
# Test na staging...

# KROK 3: PRODUCTION
supabase link --project-ref <PROD_ID>
supabase push --dry-run
# Sprawdzić output...
supabase db download  # Backup
supabase push
supabase migration list

echo "✅ Deployment complete!"
```

---

**Instrukcja gotowa!** ✅
