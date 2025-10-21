# API Endpoint Implementation Plan: POST /api/plans/generate (v2 Schema)

**Updated**: 2025-10-20
**Schema Version**: v2 (Multi-portion meal support with portions_to_cook)

---

## 1. Endpoint Overview

The `POST /api/plans/generate` endpoint enables authenticated users to generate a new meal plan based on their dietary requirements and preferences. The endpoint accepts caloric intake targets and plan duration, then orchestrates complex business logic to:

- Create a plan record with calculated end date
- Generate meal plan days spanning the requested duration
- Select and allocate recipes to meal slots (breakfast, lunch, dinner, snacks)
- **Handle multi-portion meals with proper v2 semantics** (portions_to_cook, is_leftover, identical portion_multiplier)
- Enforce the business rule of one active plan per user
- Enforce multi-portion constraints via database triggers

**Key Characteristics:**
- **Authenticated endpoint**: Requires valid Supabase session
- **User-scoped**: Plans are created exclusively for the authenticated user
- **Atomic operation**: All plan data is created within a single transaction
- **Conflict prevention**: Enforces constraint that only one active plan can exist per user
- **v2 Schema Compliant**: All portion_multiplier calculations, portions_to_cook assignments, and multi-portion constraints follow v2 semantics

---

## 2. Request Details

### HTTP Method & URL
```
POST /api/plans/generate
```

### Authentication
- **Type**: Supabase Session-based
- **Source**: `context.locals.session` (populated by Astro middleware)
- **Requirement**: User must be authenticated; request returns 401 if missing

### Request Body

**Content-Type**: `application/json`

**Schema**:
```json
{
  "daily_calories": number,
  "plan_length_days": number,
  "start_date": string
}
```

**Parameters**:

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `daily_calories` | number | ✓ | Positive integer, 800-6000 | Target daily caloric intake for all meals combined |
| `plan_length_days` | number | ✓ | Integer, 1-365 | Number of consecutive days to plan for |
| `start_date` | string | ✓ | ISO 8601 format, not in past | First day of the meal plan (YYYY-MM-DD) |

### Example Request
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

---

## 3. Request Processing & Validation

### 1. Zod Validation Schema

Create `src/lib/schemas/plan.ts`:

```typescript
import { z } from 'zod'

export const createPlanCommandSchema = z.object({
  daily_calories: z
    .number()
    .int()
    .positive('daily_calories must be a positive number')
    .min(800, 'daily_calories must be at least 800')
    .max(6000, 'daily_calories must not exceed 6000'),

  plan_length_days: z
    .number()
    .int()
    .positive('plan_length_days must be a positive number')
    .min(1, 'plan_length_days must be at least 1 day')
    .max(365, 'plan_length_days must not exceed 365 days'),

  start_date: z
    .string()
    .refine(
      (date) => !isNaN(Date.parse(date)),
      'start_date must be a valid ISO 8601 date (YYYY-MM-DD)'
    )
    .refine(
      (date) => new Date(date) > new Date(),
      'start_date cannot be in the past or today'
    ),
})

export type CreatePlanCommand = z.infer<typeof createPlanCommandSchema>
```

### 2. Validation Flow

```
Request Received
  ↓
[Middleware] Extract user_id from session
  ↓
[Middleware] Check authentication (401 if missing)
  ↓
Parse JSON request body
  ↓
[Zod] Validate structure and constraints → 400 if invalid
  ↓
[Business Logic] Check for existing active plan → 409 if found
  ↓
[Service] Generate meal plan (v2 semantics)
```

---

## 4. Response Details

### Success Response (201 Created)

**Status Code**: `201 Created`

**Content-Type**: `application/json`

**Response Body**:
```json
{
  "id": 42,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "state": "active",
  "start_date": "2025-10-20",
  "end_date": "2025-10-26",
  "created_at": "2025-10-17T14:30:00Z",
  "updated_at": "2025-10-17T14:30:00Z"
}
```

**Response Type**: `PlanDTO`

**Field Descriptions**:
- `id`: Unique plan identifier
- `user_id`: Owner of the plan (matches authenticated user)
- `state`: Plan lifecycle state (`'active'`, `'archived'`, `'completed'`)
- `start_date`: First day of the plan
- `end_date`: Last day of the plan (calculated as start_date + plan_length_days - 1)
- `created_at`: Plan creation timestamp
- `updated_at`: Last update timestamp (same as created_at on creation)

### Error Responses

| HTTP Status | Error Code | Body | Scenario |
|------------|-----------|------|----------|
| **400** | Bad Request | `{error: "<specific validation message>"}` | Invalid input parameters |
| **401** | Unauthorized | `{error: "Authentication required"}` | No valid session |
| **409** | Conflict | `{error: "User already has an active plan"}` | Active plan exists |
| **500** | Internal Server Error | `{error: "Failed to generate meal plan"}` | Server-side failure |

**Example Error Response (400)**:
```json
{
  "error": "daily_calories must be between 800 and 6000"
}
```

**Example Error Response (409)**:
```json
{
  "error": "User already has an active plan. Archive or complete the existing plan first."
}
```

---

## 5. Data Types & DTOs

### Input DTO

**File**: `src/types.ts`

```typescript
export type CreatePlanCommand = {
  daily_calories: number
  plan_length_days: number
  start_date: string
}
```

### Output DTO

**File**: `src/types.ts`

```typescript
export type PlanDTO = Pick<
  Tables<'plans'>,
  'id' | 'user_id' | 'state' | 'start_date' | 'end_date' | 'created_at' | 'updated_at'
>
```

### Related Types Used Internally

```typescript
// From types.ts
export type PlanDayResponse = {
  id: number
  plan_id: number
  date: string
  meals: MealResponse[]
  slot_targets: SlotTargetResponse[]
}

// 🔄 UPDATED for v2 semantics
export type MealResponse = {
  id: number
  slot: Enums<'meal_slot'>
  status: Enums<'meal_status'>
  calories_planned: number
  portion_multiplier: number           // 🔄 Now: actual portions to eat (e.g., 2.4, 3.0)
  portions_to_cook: number | null      // 🆕 NEW: Set for day 1 (cooking day), NULL for day 2 (leftovers)
  multi_portion_group_id: string | null
  is_leftover: boolean                 // true = day 2 (leftovers), false = day 1 (cooking)
  recipe: RecipeInMealResponse
}

// Helper types
export type SlotTargetResponse = {
  slot: Enums<'meal_slot'>
  calories_target: number
}

export type RecipeInMealResponse = {
  id: number
  name: string
  image_url: string | null
  time_minutes: number | null
  source_url: string | null
  available_slots: Enums<'meal_slot'>[]
}
```

---

## 6. Data Flow Architecture

### High-Level Flow Diagram

```
┌─────────────────────────────────────────┐
│  Client: POST /api/plans/generate       │
│  Body: { daily_calories, plan_length_.. │
│          start_date }                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Astro API Endpoint │
        │  (plans/generate)  │
        └────────┬───────────┘
                 │
        ┌────────▼──────────────────────┐
        │ 1. Authenticate User          │
        │    (context.locals.session)   │
        │    → 401 if missing           │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ 2. Parse & Validate Input     │
        │    (Zod schema)               │
        │    → 400 if invalid           │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────────────┐
        │ 3. Service: plans.generatePlan()      │
        │    - Check existing active plan       │
        │      → 409 if exists                  │
        │    - Begin database transaction       │
        │    - Call plan generation algorithm  │
        │    - Allocate recipes to days/slots   │
        │    - Calculate portion multipliers    │
        │    - Set portions_to_cook per day     │
        │    - Create multi-portion groups      │
        │    - Validate v2 constraints (DB)     │
        │    - Commit transaction               │
        └────────┬──────────────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ 4. Return Response            │
        │    PlanDTO                    │
        │    Status: 201 Created        │
        └────────────────────────────────┘
```

### Data Persistence Flow

```
Database Transaction
├─ Create 'plans' record
│  └─ Insert: { user_id, state='active', start_date, end_date }
│
├─ Create 'plan_days' records (plan_length_days rows)
│  └─ For each day: Insert { plan_id, date }
│
├─ Create 'plan_day_slot_targets' records
│  └─ For each day and slot: Insert { plan_day_id, slot, calories_target }
│     (distribute daily_calories across breakfast/lunch/dinner/snacks)
│
└─ Create 'plan_meals' records
   └─ For each meal slot:
      ├─ Select recipe matching slot and caloric target
      ├─ Calculate portion_multiplier = target / recipe.calories_kcal
      ├─ Check if multi-portion candidate (lunch/dinner, consecutive days available)
      │
      ├─ If MULTI-PORTION meal:
      │  ├─ Create multi_portion_group_id (UUID)
      │  │
      │  ├─ Day 1 (COOKING):
      │  │  └─ INSERT { portion_multiplier, portions_to_cook: recipe.portions, is_leftover: FALSE }
      │  │
      │  └─ Day 2 (LEFTOVERS):
      │     └─ INSERT { portion_multiplier (SAME!), portions_to_cook: NULL, is_leftover: TRUE }
      │        (Skip next day in main loop)
      │
      └─ If SINGLE-PORTION meal:
         └─ INSERT { portion_multiplier, portions_to_cook: recipe.portions, is_leftover: FALSE }
```

### Service Layer Responsibilities

**File**: `src/lib/services/plans.service.ts`

```typescript
export async function generatePlan(
  supabase: SupabaseClient,
  userId: string,
  command: CreatePlanCommand,
  options?: { maxConcurrency?: number }
): Promise<PlanDTO>
```

**Responsibilities**:
1. **Validation**: Check user doesn't already have active plan
2. **Calculation**:
    - Calculate `end_date` from `start_date` and `plan_length_days`
    - Distribute daily calories across meal slots using algorithm
3. **Recipe Selection**:
    - Query recipes matching caloric targets per slot
    - Apply meal slot constraints (breakfast != dinner)
    - Apply portion constraints (multi-portion only for lunch/dinner)
4. **Multi-Portion Logic** (v2 NEW):
    - Identify consecutive days available for multi-portion meals
    - Calculate identical `portion_multiplier` for both days
    - Set `portions_to_cook = recipe.portions` for day 1, `NULL` for day 2
    - Set `is_leftover = FALSE` for day 1, `TRUE` for day 2
5. **Transaction Management**:
    - Execute atomic database transaction
    - Rollback on any failure
6. **Error Handling**:
    - Wrap Supabase errors in custom exceptions
    - Provide meaningful error messages

---

## 7. Algorithm: Plan Generation with v2 Semantics

### Phase 1: Calculate Slot Targets

```
Input: daily_calories = 2000

Output:
- breakfast_target = 2000 × 0.20 = 400 kcal
- lunch_target = 2000 × 0.30 = 600 kcal
- dinner_target = 2000 × 0.30 = 600 kcal
- snack_target = 2000 × 0.20 = 400 kcal
```

### Phase 2: Iterate Over Each Day

```
For day = 1 to plan_length_days:
  date = start_date + (day - 1) days

  For slot IN ['breakfast', 'lunch', 'dinner', 'snack']:
    target = slot_targets[slot]

    → Call: selectRecipeAndCreateMeal(day, slot, target)
```

### Phase 3: Select Recipe and Create Meal (DETAILED v2 LOGIC)

```typescript
/**
 * selectRecipeAndCreateMeal(day, slot, target_calories)
 *
 * Returns: { meal_created: boolean, recipe_used: Recipe, skip_next_day: boolean }
 */
function selectRecipeAndCreateMeal(day, slot, target) {
  // Step 1: Query suitable recipes
  // ================================
  recipes = query(`
    SELECT r.* FROM recipes r
    WHERE r.is_active = TRUE
      AND r.calories_kcal BETWEEN ${target * 0.8} AND ${target * 1.2}
      AND EXISTS (
        SELECT 1 FROM recipe_slots rs
        WHERE rs.recipe_id = r.id AND rs.slot = '${slot}'
      )
    ORDER BY ABS(r.calories_kcal - ${target}) ASC
    LIMIT 100
  `)

  if (recipes.length === 0) {
    throw new ServerError(`No suitable recipe for ${slot} with ${target} calories`)
  }

  // Step 2: Select best matching recipe
  // ====================================
  recipe = recipes[0]  // Closest match to target

  // Step 3: Calculate portion_multiplier (v2 SEMANTICS!)
  // ====================================================
  // Formula: portion_multiplier = target_calories / recipe.calories_kcal
  // This represents: "How many portions of this recipe to eat"
  // Example: 600 / 250 = 2.4 portions

  portion_multiplier = ROUND(target / recipe.calories_kcal, 1)

  // Step 4: Validate portion_multiplier
  // ====================================
  // Constraint: portion_multiplier <= recipe.portions
  // (Can't eat more portions than recipe has!)

  if (portion_multiplier > recipe.portions) {
    throw new ValidationError(
      `Portion multiplier ${portion_multiplier} exceeds recipe max ${recipe.portions}`
    )
  }

  // Step 5: Check if this is a multi-portion CANDIDATE
  // ===================================================
  // Multi-portion criteria:
  // - Slot must be lunch or dinner (breakfast/snack are single-day only)
  // - Recipe must have at least 2 portions
  // - Next day must be available (day < plan_length_days)
  // - Next day's slot must not be filled yet

  is_multi_portion_candidate = (
    slot IN ['lunch', 'dinner'] AND
    recipe.portions >= 2 AND
    day < plan_length_days AND
    meal_slots[day + 1][slot] === NULL
  )

  if (is_multi_portion_candidate) {
    // Step 6a: MULTI-PORTION PATH
    // ============================

    multi_portion_group_id = UUID.generate()

    // Day 1: Cooking day
    // ──────────────────
    calories_planned = ROUND(recipe.calories_kcal * portion_multiplier, 0)

    INSERT plan_meals {
      plan_day_id: plan_days[day].id,
      recipe_id: recipe.id,
      slot: slot,
      status: 'planned',
      calories_planned: calories_planned,  // = target ± tolerance
      portion_multiplier: portion_multiplier,  // e.g., 2.4
      portions_to_cook: recipe.portions,       // e.g., 6 (gotuj całą receptę!)
      multi_portion_group_id: multi_portion_group_id,
      is_leftover: FALSE  // Day 1 = cooking, not leftovers
    }

    // Day 2: Leftovers day (SAME portion_multiplier!)
    // ──────────────────────────────────────────────
    // Important: IDENTICAL portion_multiplier as Day 1!
    // This is the KEY CHANGE in v2 semantics

    INSERT plan_meals {
      plan_day_id: plan_days[day + 1].id,
      recipe_id: recipe.id,
      slot: slot,
      status: 'planned',
      calories_planned: calories_planned,  // = SAME as day 1
      portion_multiplier: portion_multiplier,  // IDENTICAL! (e.g., 2.4)
      portions_to_cook: NULL,                  // Day 2 = don't cook, use leftovers
      multi_portion_group_id: multi_portion_group_id,
      is_leftover: TRUE  // Day 2 = leftovers, not cooking
    }

    // Mark next day slot as filled
    meal_slots[day + 1][slot] = 'filled_by_multi_portion'

    return { meal_created: TRUE, recipe_used: recipe, skip_next_day: TRUE }

  } else {
    // Step 6b: SINGLE-PORTION PATH
    // =============================

    calories_planned = ROUND(recipe.calories_kcal * portion_multiplier, 0)

    INSERT plan_meals {
      plan_day_id: plan_days[day].id,
      recipe_id: recipe.id,
      slot: slot,
      status: 'planned',
      calories_planned: calories_planned,
      portion_multiplier: portion_multiplier,
      portions_to_cook: recipe.portions,  // Always cook the full recipe
      multi_portion_group_id: NULL,
      is_leftover: FALSE  // Single-portion meals are not leftovers
    }

    return { meal_created: TRUE, recipe_used: recipe, skip_next_day: FALSE }
  }
}
```

### Phase 4: Validate Multi-Portion Constraints (Database)

The database triggers automatically validate:

```sql
-- fn_enforce_multi_portion_group() trigger checks:
CHECK (
  COUNT(*) = 2  -- Exactly 2 meals in group
  AND SUM(CASE WHEN is_leftover = FALSE THEN 1 ELSE 0 END) = 1  -- Only 1 cooking day
  AND SUM(CASE WHEN portions_to_cook IS NOT NULL THEN 1 ELSE 0 END) = 1  -- Only 1 with portions_to_cook
  AND MIN(portion_multiplier) = MAX(portion_multiplier)  -- Identical multipliers!
)
```

---

## 8. Security Considerations

### Authentication & Authorization

**Authentication Layer** (Astro Middleware):
```typescript
// src/middleware/index.ts should verify session exists
if (!context.locals.session?.user) {
  return context.response.status = 401
}
```

**Authorization Check** (Endpoint Handler):
```typescript
// Verify authenticated user_id matches session
const userId = context.locals.session.user.id
// All database queries scoped to this user_id via RLS policies
```

### Input Validation

**Zod Schema**:
- ✓ Type validation (numbers are numbers, strings are strings)
- ✓ Range validation (daily_calories 800-6000, days 1-365)
- ✓ Format validation (start_date ISO 8601)
- ✓ Business logic validation (start_date not in past)
- ✓ Reject unexpected fields (strict schema mode)

**SQL Injection Prevention**:
- ✓ Parameterized queries via Supabase client (automatic)
- ✓ No string concatenation for SQL
- ✓ Zod type coercion prevents bypass attempts

### Row-Level Security (RLS)

**Database Policy** (Supabase):
```sql
-- users can only create plans for themselves
CREATE POLICY "users_can_only_create_own_plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id)
```

**Application Level**:
- Always use `supabase` from `context.locals` (authenticated client)
- Never directly instantiate `supabaseClient` (bypasses RLS)
- Validate user_id matches session before any operation

### Data Protection

**Sensitive Data**:
- Plan data is user-scoped and protected by RLS
- No PII beyond association with user account
- Caloric targets and recipe preferences are non-sensitive but user-owned

**Encryption**:
- Supabase handles TLS/encryption in transit

### Rate Limiting (Recommended Future)

```typescript
// Consider adding per-endpoint rate limiting:
// - 5 plan generations per user per hour
// - Track by user_id + timestamp
// - Return 429 Too Many Requests if exceeded
```

---

## 9. Error Handling Strategy

### Validation Error Handling (400)

```typescript
// In endpoint handler
try {
  const validated = createPlanCommandSchema.parse(req.body)
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: error.issues[0].message
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

### Authentication Error Handling (401)

```typescript
// In middleware or endpoint
if (!context.locals.session?.user) {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Conflict Error Handling (409)

```typescript
// In plans.service.ts
const existingPlan = await supabase
  .from('plans')
  .select('id')
  .eq('user_id', userId)
  .eq('state', 'active')
  .single()

if (existingPlan.data) {
  throw new ConflictError('User already has an active plan')
}
```

### v2-Specific Error Handling (400/500)

```typescript
// 🆕 Multi-portion validation error
if (portion_multiplier > recipe.portions) {
  throw new ValidationError(
    `Cannot select recipe: portion_multiplier (${portion_multiplier}) exceeds recipe portions (${recipe.portions})`
  )
}

// 🆕 No suitable recipe found
if (!recipe) {
  throw new ServerError(
    `No suitable recipe found for ${slot} with ~${target} calories (±20%)`
  )
}

// 🆕 Multi-portion constraint violation (from database trigger)
if (error.message.includes('multi_portion_group')) {
  throw new ServerError(
    'Database constraint violation: Multi-portion group rules violated'
  )
}
```

### Custom Error Classes

```typescript
// src/lib/errors.ts
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ServerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServerError'
  }
}
```

### Server Error Handling (500)

```typescript
// In endpoint handler (global try-catch)
try {
  const plan = await generatePlan(supabase, userId, command)
  return new Response(JSON.stringify(plan), { status: 201 })
} catch (error) {
  // Log to monitoring system (Sentry, etc.)
  console.error('Plan generation failed:', {
    userId,
    command,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  })

  // Return appropriate error code
  if (error instanceof ConflictError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ error: 'Failed to generate meal plan' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

---

## 10. Performance Considerations

### Optimization Strategies

#### 1. Database Query Optimization
```sql
-- Ensure indexes exist for common queries
CREATE INDEX idx_plans_user_id_state
  ON plans(user_id, state);

CREATE INDEX idx_recipes_calories
  ON recipes(calories_kcal);

CREATE INDEX idx_recipes_available_slots
  ON recipes(available_slots);

CREATE INDEX idx_recipe_slots_slot_recipe_id
  ON recipe_slots(slot, recipe_id);
```

#### 2. Recipe Selection Algorithm
- Use efficient filtering: `available_slots` contains requested slot
- Narrow by caloric range: target ± 20% of slot calories
- Pre-filter in database (SQL) before application logic
- Sort by closest match to target calories
- Limit result set (100 recipes max to avoid large data transfers)

#### 3. Batch Operations
```typescript
// Insert all plan_days in single batch
const days = Array.from({ length: plan_length_days }, (_, i) => ({
  plan_id: newPlanId,
  date: addDays(new Date(start_date), i)
}))

await supabase
  .from('plan_days')
  .insert(days)

// Insert all slot_targets in single batch
const targets = generateSlotTargets(newPlanId, dayIds, daily_calories)
await supabase
  .from('plan_day_slot_targets')
  .insert(targets)

// Meals are inserted one-by-one in main generation loop
// (because each requires recipe selection)
```

#### 4. Transaction Scope
- Keep transaction duration minimal (< 2 seconds)
- Pre-calculate all values before transaction begins
- Avoid nested transactions or long-running operations within transaction

### Potential Bottlenecks & Solutions

| Bottleneck | Root Cause | Solution |
|-----------|-----------|----------|
| Slow recipe selection | Large recipe table without indexes | Add indexes on `available_slots`, `calories_kcal` |
| High transaction lock time | Multiple sequential inserts | Batch insert all records simultaneously |
| N+1 query problem | Fetching recipes iteratively | Single query with JOIN to fetch all recipes upfront |
| Long endpoint response time | Synchronous plan generation | Optionally offload to background job (future enhancement) |
| Multi-portion lookup | Scanning future days repeatedly | Cache meal_slots[day][slot] status in memory |

### Caching Opportunities

```typescript
// Cache frequently-accessed recipe data
const recipeCache = new Map<string, Recipe[]>()

// Cache key pattern: "breakfast_2000" (slot_target)
const getCachedRecipes = (slot: string, target: number) => {
  const key = `${slot}_${Math.round(target / 100) * 100}`  // Round to 100 boundary
  if (!recipeCache.has(key)) {
    // Query and cache
    const recipes = queryRecipesBySlotAndTarget(slot, target)
    recipeCache.set(key, recipes)
  }
  return recipeCache.get(key)
}
```

### Scalability Considerations

**Current Architecture**:
- Synchronous endpoint (acceptable for MVP)
- Database transaction with all operations
- No queuing or background jobs

**Future Scaling**:
- Offload plan generation to Supabase Edge Function
- Implement async job queue for large batches
- Add plan generation service that can scale independently
- Cache recipe selections across plans

---

## 11. Implementation Steps

### Phase 1: Setup & Validation (Steps 1-3)

#### Step 1: Create/Update Zod Validation Schema
**File**: `src/lib/schemas/plan.ts`

Create validation schema for `CreatePlanCommand` with:
- `daily_calories`: positive number, 800-6000
- `plan_length_days`: integer, 1-365
- `start_date`: ISO 8601 format, not in past

**Deliverable**: Reusable schema for both endpoint and service layer

---

#### Step 2: Create/Update Custom Error Types
**File**: `src/lib/errors.ts`

Define or update error classes:
- `ValidationError` (400)
- `AuthenticationError` (401)
- `ConflictError` (409)
- `ServerError` (500)

Each error should include:
- Clear message
- Optional context/metadata
- Proper name and instanceof behavior

**Deliverable**: Error types with consistent interface

---

#### Step 3: Create Plans Service Layer (v2 UPDATED)
**File**: `src/lib/services/plans.service.ts`

Implement core function:
```typescript
export async function generatePlan(
  supabase: SupabaseClient,
  userId: string,
  command: CreatePlanCommand
): Promise<PlanDTO>
```

**Responsibilities** (v2 Updated):
1. Validate no existing active plan
2. Calculate end_date
3. **Implement v2-compliant recipe selection algorithm** (see Section 7)
4. Create database transaction
5. Insert plan + days + meals + slot_targets
6. Return PlanDTO

**Key Logic**:
- Distribute daily_calories across meal slots:
    - Breakfast: 20% of daily
    - Lunch: 30% of daily
    - Dinner: 30% of daily
    - Snacks: 20% of daily
- For each slot, select recipe within ±20% of target calories
- **Calculate portion_multiplier** = target / recipe.calories_kcal
- **Handle multi-portion meals**:
    - Identify lunch/dinner slots with consecutive days available
    - Use identical `portion_multiplier` for both days
    - Set `portions_to_cook = recipe.portions` for day 1, `NULL` for day 2
    - Set `is_leftover = FALSE` for day 1, `TRUE` for day 2
- Database triggers validate multi-portion constraints automatically

**Error Handling**:
- Throw `ConflictError` if active plan exists (409)
- Throw `ValidationError` if portion_multiplier invalid (400)
- Throw `ServerError` for database failures (500)

**Deliverable**: Testable, pure service function with clear interface

---

### Phase 2: Endpoint Implementation (Steps 4-5)

#### Step 4: Create API Endpoint Handler (v2 UPDATED)
**File**: `src/pages/api/plans/generate.ts`

Implement POST handler:

```typescript
export const prerender = false

export const POST: APIRoute = async (context) => {
  // 1. Check authentication
  if (!context.locals.session?.user?.id) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const userId = context.locals.session.user.id

  // 2. Validate input with Zod
  let command: CreatePlanCommand
  try {
    command = createPlanCommandSchema.parse(await context.request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.issues[0].message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    throw error
  }

  // 3. Call plans.generatePlan service
  try {
    const plan = await generatePlan(context.locals.supabase, userId, command)
    return new Response(JSON.stringify(plan), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    if (error instanceof ConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    }
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.error('Plan generation failed:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate meal plan' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

**Deliverable**: Complete, tested endpoint handler

---

#### Step 5: Add Request Logging & Monitoring
**File**: `src/lib/services/plans.service.ts` and endpoint

Add structured logging:

```typescript
const startTime = Date.now()

try {
  // ... plan generation logic

  const duration = Date.now() - startTime
  console.log({
    level: 'info',
    timestamp: new Date().toISOString(),
    endpoint: 'POST /api/plans/generate',
    userId,
    dailyCalories: command.daily_calories,
    planLengthDays: command.plan_length_days,
    duration_ms: duration,
    status: 'success'
  })

} catch (error) {
  const duration = Date.now() - startTime
  console.error({
    level: 'error',
    timestamp: new Date().toISOString(),
    endpoint: 'POST /api/plans/generate',
    userId,
    dailyCalories: command.daily_calories,
    planLengthDays: command.plan_length_days,
    duration_ms: duration,
    status: 'error',
    errorMessage: error.message
  })
  throw error
}
```

**Deliverable**: Operational visibility into plan generation

---

### Phase 3: Testing & Quality (Steps 6-7)

#### Step 6: Create Integration Tests
**File**: `tests/api/plans.generate.test.ts`

Test cases:

**Valid requests**:
- ✓ Normal plan generation (7 days, 2000 calories)
- ✓ Multi-portion meals are correctly paired
- ✓ portion_multiplier is calculated correctly
- ✓ portions_to_cook is set for day 1, NULL for day 2
- ✓ is_leftover is FALSE for day 1, TRUE for day 2
- ✓ Multi-portion group constraint is enforced

**Invalid requests**:
- ✗ Missing daily_calories → 400
- ✗ daily_calories negative → 400
- ✗ daily_calories > 6000 → 400
- ✗ plan_length_days = 0 → 400
- ✗ plan_length_days > 365 → 400
- ✗ Invalid date format → 400
- ✗ start_date in past → 400

**Authorization**:
- ✗ No session → 401
- ✗ Invalid token → 401

**Business rules**:
- ✗ Second active plan → 409
- ✓ Can create after archiving first

**Deliverable**: Comprehensive test suite with >90% coverage

---

#### Step 7: Document API Usage
**File**: `API_TESTING.md` or `QUICK_TEST_REFERENCE.md` (update)

Add section for `/api/plans/generate`:
- Example curl request
- Example response with multi-portion meals explained
- Common error scenarios
- v2 semantics explanation
- Testing checklist

**Deliverable**: Clear documentation for API consumers

---

### Phase 4: Deployment & Validation (Step 8)

#### Step 8: Code Review & Deployment
- Code review by team lead
- Manual testing in staging environment
- Verify error responses and edge cases
- Check performance (response time < 2s)
- Verify multi-portion group creation and constraints
- Monitor logs for errors in production

**Validation Checklist**:
- [ ] All tests passing
- [ ] Linter rules satisfied
- [ ] Error handling covers all scenarios
- [ ] Response format matches spec
- [ ] Documentation updated
- [ ] Security review completed (RLS, input validation)
- [ ] Performance acceptable (< 2s response time)
- [ ] Multi-portion meals generated correctly
- [ ] portion_multiplier calculations verified
- [ ] portions_to_cook values verified (recipe.portions for day 1, NULL for day 2)
- [ ] is_leftover flags verified (FALSE for day 1, TRUE for day 2)
- [ ] Database constraints enforced (triggers active)

---

## 12. File Structure & Dependencies

### Files to Create/Modify

```
src/
├── lib/
│   ├── errors.ts                    [NEW or UPDATE]
│   ├── schemas/
│   │   └── plan.ts                  [NEW or UPDATE]
│   └── services/
│       └── plans.service.ts         [UPDATE with v2 logic]
├── pages/
│   └── api/
│       └── plans/
│           ├── index.ts             [EXISTS]
│           └── generate.ts          [NEW or UPDATE]
└── types.ts                         [UPDATE - add portions_to_cook to MealResponse]
```

### Key Imports

```typescript
// Endpoint handler
import { APIRoute } from 'astro'
import { createPlanCommandSchema } from '@/lib/schemas/plan'
import { generatePlan } from '@/lib/services/plans.service'
import type { SupabaseClient } from '@/db/supabase.client'
import type { CreatePlanCommand, PlanDTO } from '@/types'
import { ConflictError, ValidationError, ServerError } from '@/lib/errors'

// Service layer
import type { SupabaseClient } from '@/db/supabase.client'
import { ConflictError, ValidationError, ServerError } from '@/lib/errors'
import type { CreatePlanCommand, PlanDTO } from '@/types'
```

### Dependencies

All dependencies already available:
- ✓ `zod` - validation
- ✓ `@supabase/supabase-js` - database client
- ✓ TypeScript - type safety
- ✓ Astro - framework

No new npm packages required.

---

## 13. Environment & Configuration

### Required Environment Variables

```env
# .env.local (Supabase)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=...

# Sensitive: server-side only
SUPABASE_SERVICE_ROLE_KEY=... (if using service role)
```

### Supabase Configuration

**Required Tables** (should exist from migrations):
- ✓ `plans`
- ✓ `plan_days`
- ✓ `plan_day_slot_targets`
- ✓ `plan_meals` (with v2 columns: portions_to_cook, is_leftover)
- ✓ `recipes`
- ✓ `recipe_slots`

**Required Enums**:
- ✓ `plan_state` ('active', 'archived', 'completed')
- ✓ `meal_slot` ('breakfast', 'lunch', 'dinner', 'snack')
- ✓ `meal_status` ('planned', 'prepared', 'consumed', 'skipped')

**Required RLS Policies**:
```sql
-- ON plans table
CREATE POLICY "select_own_plans" ON plans
  FOR SELECT USING (auth.uid() = user_id)

CREATE POLICY "insert_own_plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id)
```

**Required Triggers** (v2 Schema):
- ✓ `fn_calculate_plan_meal_calories()` - Auto-calculates calories
- ✓ `fn_validate_portion_multiplier()` - Ensures portion_multiplier <= recipe.portions
- ✓ `fn_enforce_multi_portion_group()` - Validates multi-portion constraints
- ✓ `fn_set_plan_meals_denorm()` - Denormalizes plan_id and user_id

---

## 14. v2 Schema Validation & Verification

### Multi-Portion Group Constraints (Database Level)

The database automatically enforces these constraints via `fn_enforce_multi_portion_group()` trigger:

```sql
-- Constraint 1: Exactly 2 meals in group
COUNT(*) = 2

-- Constraint 2: Only 1 cooking day
COUNT(*) FILTER (WHERE is_leftover = FALSE) = 1

-- Constraint 3: Only 1 with portions_to_cook set
COUNT(*) FILTER (WHERE portions_to_cook IS NOT NULL) = 1

-- Constraint 4: Identical portion_multiplier across pair
MIN(portion_multiplier) = MAX(portion_multiplier)
```

### Example: Expected Data After Plan Generation

**Input**:
- daily_calories = 2000
- plan_length_days = 3
- Scenario: Gulasz 6-porcyjny (250 kcal/porcja)

**Output for Day 1 & 2 (Multi-Portion)**:
```
Day 1 (MONDAY - Dinner):
├─ slot: 'dinner'
├─ recipe_id: 200 (Gulasz)
├─ portion_multiplier: 2.4
├─ calories_planned: 600  (250 × 2.4)
├─ portions_to_cook: 6    ← Gotuj całą receptę!
├─ is_leftover: FALSE
├─ multi_portion_group_id: "uuid-abc-123"

Day 2 (TUESDAY - Lunch):
├─ slot: 'lunch'
├─ recipe_id: 200 (Gulasz) ← SAME recipe
├─ portion_multiplier: 2.4  ← IDENTICAL!
├─ calories_planned: 600    ← IDENTICAL!
├─ portions_to_cook: NULL   ← Don't cook, use leftovers
├─ is_leftover: TRUE        ← Resztki!
├─ multi_portion_group_id: "uuid-abc-123"  ← SAME group
```

**Database Verification Query**:
```sql
SELECT
  pm.id,
  pm.plan_day_id,
  pd.date,
  pm.slot,
  pm.portion_multiplier,
  pm.portions_to_cook,
  pm.is_leftover,
  pm.multi_portion_group_id,
  r.name as recipe_name
FROM plan_meals pm
JOIN plan_days pd ON pm.plan_day_id = pd.id
JOIN recipes r ON pm.recipe_id = r.id
WHERE pm.multi_portion_group_id IS NOT NULL
ORDER BY pm.multi_portion_group_id, pd.date;

-- Result should show:
-- - 2 rows per group
-- - Same portion_multiplier for both
-- - Only first row has portions_to_cook value
-- - is_leftover differs (FALSE, TRUE)
```

---

## 15. Validation & Quality Checklist

### Pre-Deployment Validation

- [ ] **Type Safety**: All TypeScript strict mode rules satisfied
- [ ] **Validation**: All inputs validated with Zod
- [ ] **Error Handling**: All error paths return appropriate HTTP status
- [ ] **Authentication**: Session verification implemented
- [ ] **Authorization**: User can only create own plans
- [ ] **RLS**: Database policies restrict cross-user access
- [ ] **Documentation**: Code comments explain complex logic
- [ ] **Testing**: Integration tests cover happy path and error cases
- [ ] **Performance**: Response time < 2 seconds
- [ ] **Logging**: Errors logged with context for debugging
- [ ] **Security**: No SQL injection, XSS, or auth bypass vulnerabilities
- [ ] **v2 Semantics**: portion_multiplier calculations correct
- [ ] **Multi-Portion**: Groups created with identical multipliers
- [ ] **portions_to_cook**: Set correctly (recipe.portions day 1, NULL day 2)
- [ ] **is_leftover**: Set correctly (FALSE day 1, TRUE day 2)
- [ ] **Constraints**: Database triggers enforcing all rules

### Code Quality Standards

- **Coverage**: > 80% test coverage for service layer
- **Linting**: Pass ESLint with zero warnings
- **Type Errors**: Zero TypeScript errors
- **Documentation**: JSDoc comments for all public functions
- **Error Messages**: User-friendly, actionable error messages

---

## 16. Appendix: Related Resources

### Database Schema Reference

**plans table**:
- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID NOT NULL (FOREIGN KEY auth.users)
- `state` plan_state NOT NULL DEFAULT 'active'
- `start_date` DATE NOT NULL
- `end_date` DATE NOT NULL
- `created_at`, `updated_at` TIMESTAMPTZ

**plan_meals table (v2 updated)**:
- `id` BIGSERIAL PRIMARY KEY
- `plan_day_id` BIGINT (FK to plan_days)
- `recipe_id` BIGINT (FK to recipes)
- `slot` meal_slot ENUM
- `status` meal_status DEFAULT 'planned'
- `calories_planned` INTEGER
- `portion_multiplier` NUMERIC(8,1) ← Now represents actual portions
- **`portions_to_cook` INTEGER NULL** ← New in v2: recipe.portions or NULL
- **`is_leftover` BOOLEAN DEFAULT FALSE** ← New in v2: distinguishes day 1 vs day 2
- `multi_portion_group_id` UUID NULL
- Constraints:
    - `CHECK (portions_to_cook IS NULL OR is_leftover = FALSE)`
    - `CHECK (portion_multiplier <= (SELECT portions FROM recipes WHERE id = recipe_id))`

### Type Definitions

**CreatePlanCommand**: Input validation DTO
**PlanDTO**: Response DTO for plan metadata
**MealResponse**: Meal with v2-compliant fields (includes portions_to_cook)
**RecipeInMealResponse**: Subset of recipe data

### Related Endpoints

- `GET /api/plans` - List user's plans
- `GET /api/plans/{id}` - Get plan with full details
- `PATCH /api/plans/{id}` - Update plan state
- `DELETE /api/plans/{id}` - Delete plan
- `GET /api/recipes` - List available recipes

### Tech Stack Documentation

- [Astro Routing](https://docs.astro.build/en/guides/routing/)
- [Astro API Routes](https://docs.astro.build/en/guides/endpoints/)
- [Zod Validation](https://zod.dev/)
- [Supabase TypeScript Client](https://supabase.com/docs/reference/typescript)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Plan v2 ready for implementation!** ✅
