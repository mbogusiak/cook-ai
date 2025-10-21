# API Endpoint Implementation Plan: POST /api/plans/generate

## 1. Endpoint Overview

The `POST /api/plans/generate` endpoint enables authenticated users to generate a new meal plan based on their dietary requirements and preferences. The endpoint accepts caloric intake targets and plan duration, then orchestrates complex business logic to:

- Create a plan record with calculated end date
- Generate meal plan days spanning the requested duration
- Select and allocate recipes to meal slots (breakfast, lunch, dinner, snacks)
- Handle multi-portion meals with proper portion multipliers
- Enforce the business rule of one active plan per user

**Key Characteristics:**
- **Authenticated endpoint**: Requires valid Supabase session
- **User-scoped**: Plans are created exclusively for the authenticated user
- **Atomic operation**: All plan data is created within a single transaction
- **Conflict prevention**: Enforces constraint that only one active plan can exist per user

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
[Service] Generate meal plan
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

**File**: `src/types.ts` (already defined)

```typescript
export type CreatePlanCommand = {
  daily_calories: number
  plan_length_days: number
  start_date: string
}
```

### Output DTO

**File**: `src/types.ts` (already defined)

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

export type MealResponse = {
  id: number
  slot: Enums<'meal_slot'>
  status: Enums<'meal_status'>
  calories_planned: number
  portion_multiplier: number
  multi_portion_group_id: string | null
  is_leftover: boolean
  recipe: RecipeInMealResponse
}
```

---

## 6. Data Flow Architecture

### High-Level Flow Diagram

```
┌─────────────────────────────────────────────┐
│  Client: POST /api/plans/generate           │
│  Body: { daily_calories, plan_length_days,  │
│          start_date }                       │
└────────────────┬────────────────────────────┘
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
        │    - Create plan + days + meals       │
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
      ├─ Insert meal with portion_multiplier
      ├─ If multi-portion meal:
      │  └─ Set multi_portion_group_id and is_leftover flags
      └─ Handle recipe allocation across days
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
4. **Transaction Management**: 
   - Execute atomic database transaction
   - Rollback on any failure
5. **Error Handling**: 
   - Wrap Supabase errors in custom exceptions
   - Provide meaningful error messages

---

## 7. Security Considerations

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

### Rate Limiting

**Implementation** (Recommended in future):
```typescript
// Consider adding per-endpoint rate limiting:
// - 5 plan generations per user per hour
// - Track by user_id + timestamp
// - Return 429 Too Many Requests if exceeded
```

**Rationale**:
- Plan generation is CPU/IO intensive (recipe selection algorithm)
- Prevents abuse and resource exhaustion
- Can be implemented via:
  - Supabase custom middleware
  - Redis-backed rate limiter
  - Database-backed rate limiter table

### Row-Level Security (RLS)

**Database Policy** (Supabase):
```sql
-- users can only see their own plans
CREATE POLICY "users_can_only_view_own_plans" ON plans
  FOR SELECT USING (auth.uid() = user_id)

-- users can only create plans for themselves
CREATE POLICY "users_can_only_create_own_plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id)

-- users can only update their own plans
CREATE POLICY "users_can_only_update_own_plans" ON plans
  FOR UPDATE USING (auth.uid() = user_id)
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
- Consider encrypting sensitive plan notes if feature added later

---

## 8. Error Handling Strategy

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

**Custom Error Class**:
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
  
  return new Response(
    JSON.stringify({ error: 'Failed to generate meal plan' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Error Logging

**Structured Logging Format**:
```typescript
const logError = (context: {
  endpoint: string
  userId: string
  error: Error
  requestBody?: unknown
  statusCode: number
}) => {
  console.error({
    level: 'error',
    timestamp: new Date().toISOString(),
    endpoint: context.endpoint,
    userId: context.userId,
    statusCode: context.statusCode,
    errorMessage: context.error.message,
    errorStack: context.error.stack,
    requestBody: context.requestBody // Exclude sensitive fields
  })
}
```

### Error Recovery Strategies

| Error Type | Strategy | Outcome |
|-----------|----------|---------|
| Validation Error | Return immediately with specific message | User corrects input |
| Authentication Missing | Return 401 | User logs in |
| Existing Active Plan | Return 409 with action message | User archives existing plan first |
| Recipe Selection Fails | Fallback to default recipes | Plan still generated with defaults |
| Database Connection Fails | Retry with exponential backoff | Automatic recovery or error after retries |
| Transaction Deadlock | Retry entire operation (up to 3x) | Automatic recovery |

---

## 9. Performance Considerations

### Optimization Strategies

#### 1. Database Query Optimization
```sql
-- Ensure indexes exist for common queries
CREATE INDEX idx_plans_user_id_state 
  ON plans(user_id, state);

CREATE INDEX idx_recipes_calories 
  ON recipes(calories_per_serving);

CREATE INDEX idx_recipes_available_slots 
  ON recipes(available_slots);
```

#### 2. Recipe Selection Algorithm
- Use efficient filtering: `available_slots` contains requested slot
- Narrow by caloric range: target ± 20% of slot calories
- Pre-filter in database (SQL) before application logic
- Cache recipe metadata if list is large

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
```

#### 4. Transaction Scope
- Keep transaction duration minimal (< 2 seconds)
- Pre-calculate all values before transaction begins
- Avoid nested transactions or long-running operations within transaction

### Potential Bottlenecks & Solutions

| Bottleneck | Root Cause | Solution |
|-----------|-----------|----------|
| Slow recipe selection | Large recipe table without indexes | Add indexes on `available_slots`, `calories_per_serving` |
| High transaction lock time | Multiple sequential inserts | Batch insert all records simultaneously |
| N+1 query problem | Fetching recipes iteratively | Single query with JOIN to fetch all recipes |
| Long endpoint response time | Synchronous plan generation | Optionally offload to background job (future enhancement) |

### Caching Opportunities

```typescript
// Cache frequently-accessed recipe data
const recipeCache = new Map<string, Recipe[]>()

// Cache key pattern: "breakfast_2000" (slot_calories)
const getCachedRecipes = (slot: string, calorieRange: number) => {
  const key = `${slot}_${calorieRange}`
  if (!recipeCache.has(key)) {
    // Query and cache
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

## 10. Implementation Steps

### Phase 1: Setup & Validation (Steps 1-3)

#### Step 1: Create Zod Validation Schema
**File**: `src/lib/schemas/plan.ts`

Create validation schema for `CreatePlanCommand` with:
- `daily_calories`: positive number, 800-6000
- `plan_length_days`: integer, 1-365
- `start_date`: ISO 8601 format, not in past

**Deliverable**: Reusable schema for both endpoint and service layer

---

#### Step 2: Create Custom Error Types
**File**: `src/lib/errors.ts`

Define error classes:
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

#### Step 3: Create Plans Service Layer
**File**: `src/lib/services/plans.service.ts`

Implement core function:
```typescript
export async function generatePlan(
  supabase: SupabaseClient,
  userId: string,
  command: CreatePlanCommand
): Promise<PlanDTO>
```

**Responsibilities**:
1. Validate no existing active plan
2. Calculate end_date
3. Implement recipe selection algorithm
4. Create database transaction
5. Insert plan + days + meals + slot_targets
6. Return PlanDTO

**Key Logic**:
- Distribute daily_calories across meal slots:
  - Breakfast: 25% of daily
  - Lunch: 35% of daily
  - Dinner: 35% of daily
  - Snacks: 5% of daily
- For each slot, select recipe within ±20% of target calories
- Handle multi-portion meals (length meals used as leftovers)

**Error Handling**:
- Throw `ConflictError` if active plan exists (409)
- Throw custom errors for database failures (500)
- Validate recipe availability (400 if insufficient recipes)

**Deliverable**: Testable, pure service function with clear interface

---

### Phase 2: Endpoint Implementation (Steps 4-5)

#### Step 4: Create API Endpoint Handler
**File**: `src/pages/api/plans/generate.ts`

Implement POST handler:

```typescript
export const prerender = false

export const POST: APIRoute = async (context) => {
  // 1. Check authentication
  // 2. Validate input with Zod
  // 3. Call plans.generatePlan service
  // 4. Return 201 with PlanDTO or error
}
```

**Handler Flow**:
1. Extract `user_id` from `context.locals.session.user.id`
2. Return 401 if no session
3. Parse JSON body
4. Validate with `createPlanCommandSchema.parse()`
5. Catch `ZodError` → return 400
6. Call `generatePlan(supabase, userId, command)`
7. Catch `ConflictError` → return 409
8. Catch other errors → return 500
9. Return 201 with `PlanDTO`

**Response Headers**:
```typescript
{
  'Content-Type': 'application/json',
  'Location': `/api/plans/${plan.id}` // Optional: link to new resource
}
```

**Deliverable**: Complete, tested endpoint handler

---

#### Step 5: Add Request Logging & Monitoring
**File**: `src/lib/services/plans.service.ts` and endpoint

Add structured logging:

```typescript
console.log({
  level: 'info',
  timestamp: new Date().toISOString(),
  endpoint: 'POST /api/plans/generate',
  userId,
  dailyCalories: command.daily_calories,
  planLengthDays: command.plan_length_days,
  duration_ms: endTime - startTime
})
```

**Deliverable**: Operational visibility into plan generation

---

### Phase 3: Testing & Quality (Steps 6-7)

#### Step 6: Create Integration Tests
**File**: `tests/api/plans.generate.test.ts`

Test cases:

**Valid requests**:
- ✓ Normal plan generation (7 days, 2000 calories)
- ✓ Short plan (1 day)
- ✓ Long plan (365 days)
- ✓ Min/max calories (800, 6000)

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
- Example response
- Common error scenarios
- Testing checklist

**Deliverable**: Clear documentation for API consumers

---

### Phase 4: Deployment & Validation (Step 8)

#### Step 8: Code Review & Deployment
- Code review by team lead
- Manual testing in staging environment
- Verify error responses and edge cases
- Check performance (response time < 2s)
- Monitor logs for errors in production

**Validation Checklist**:
- [ ] All tests passing
- [ ] Linter rules satisfied
- [ ] Error handling covers all scenarios
- [ ] Response format matches spec
- [ ] Documentation updated
- [ ] Security review completed (RLS, input validation)
- [ ] Performance acceptable (< 2s response time)

---

## 11. File Structure & Dependencies

### Files to Create/Modify

```
src/
├── lib/
│   ├── errors.ts                    [NEW]
│   ├── schemas/
│   │   └── plan.ts                  [NEW]
│   └── services/
│       └── plans.service.ts         [NEW]
├── pages/
│   └── api/
│       └── plans/
│           ├── index.ts             [EXISTS - add GET for list]
│           ├── generate.ts          [NEW - this endpoint]
│           └── [id].ts              [EXISTS - add GET details]
└── types.ts                         [UPDATE - add if needed]
```

### Key Imports

```typescript
// Endpoint handler
import { APIRoute } from 'astro'
import { createPlanCommandSchema } from '@/lib/schemas/plan'
import { generatePlan } from '@/lib/services/plans.service'
import type { SupabaseClient } from '@/db/supabase.client'
import type { CreatePlanCommand, PlanDTO } from '@/types'

// Service layer
import type { SupabaseClient } from '@/db/supabase.client'
import { ConflictError, ServerError } from '@/lib/errors'
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

## 12. Environment & Configuration

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
- ✓ `plan_meals`
- ✓ `recipes`

**Required Enums**:
- ✓ `plan_state` ('active', 'archived', 'completed')
- ✓ `meal_slot` ('breakfast', 'lunch', 'dinner', 'snacks')
- ✓ `meal_status` ('planned', 'prepared', 'consumed', 'skipped')

**Required RLS Policies**:
```sql
-- ON plans table
CREATE POLICY "select_own_plans" ON plans 
  FOR SELECT USING (auth.uid() = user_id)

CREATE POLICY "insert_own_plans" ON plans 
  FOR INSERT WITH CHECK (auth.uid() = user_id)
```

---

## 13. Validation & Quality Checklist

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

### Code Quality Standards

- **Coverage**: > 80% test coverage for service layer
- **Linting**: Pass ESLint with zero warnings
- **Type Errors**: Zero TypeScript errors
- **Documentation**: JSDoc comments for all public functions
- **Error Messages**: User-friendly, actionable error messages

---

## 14. Appendix: Related Resources

### Database Schema Reference

**plans table**:
- `id` BIGSERIAL PRIMARY KEY
- `user_id` UUID NOT NULL (FOREIGN KEY auth.users)
- `state` plan_state NOT NULL DEFAULT 'active'
- `start_date` DATE NOT NULL
- `end_date` DATE NOT NULL
- `created_at`, `updated_at` TIMESTAMPTZ

**plan_days table**:
- Stores individual days within a plan
- UNIQUE(plan_id, date)

**plan_day_slot_targets table**:
- Stores calorie targets per slot per day
- UNIQUE(plan_day_id, slot)

**plan_meals table**:
- Stores actual meal assignments
- Includes portion multiplier for multi-portion logic
- UNIQUE(plan_day_id, slot)

### Type Definitions

**CreatePlanCommand**: Input validation DTO
**PlanDTO**: Response DTO for plan metadata
**PlanDayResponse**: Nested day with meals (used by GET /api/plans/{id})

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

