# Quick Test Reference - POST /api/plans/generate

## 📍 Endpoint Location
**File**: `src/pages/api/plans/generate.ts`
**URL**: `POST http://localhost:3000/api/plans/generate`
**Status**: ✅ Ready for testing
**Auth**: ⏳ TEMPORARY - Pass user_id in request body (auth coming soon)

---

## 🚀 Quick Start

### Option 1: Using Bash Test Script (Recommended)

```bash
# Navigate to project root
cd /Users/marcin.bogusiak/10xdevs/cookido-ai

# Run quick test (with default UUID)
./TEST_PLAN_GENERATION.sh

# Or with custom UUID
./TEST_PLAN_GENERATION.sh "550e8400-e29b-41d4-a716-446655440000"
```

**Output**: 3 test cases with status codes and JSON responses

---

### Option 2: Individual CURL Commands

#### Happy Path Test (201 Created)
```bash
USER_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"daily_calories\": 2000,
    \"plan_length_days\": 7,
    \"start_date\": \"2025-10-20\"
  }" | jq
```

**Expected Response**:
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

---

## 🧪 Test Scenarios Matrix

| # | Scenario | Input | Expected Status | Notes |
|----|----------|-------|-----------------|-------|
| 1 | Valid Plan | 2000 cal, 7 days | ✅ 201 | Happy path |
| 2 | Missing user_id | No user_id field | ❌ 400 | Required |
| 3 | Empty Body | `""` | ❌ 400 | Empty request |
| 4 | Invalid JSON | Malformed JSON | ❌ 400 | Parse error |
| 5 | Low Calories | 500 cal | ❌ 400 | Min is 800 |
| 6 | High Calories | 7000 cal | ❌ 400 | Max is 6000 |
| 7 | Short Plan | 0 days | ❌ 400 | Min is 1 |
| 8 | Long Plan | 400 days | ❌ 400 | Max is 365 |
| 9 | Bad Date Format | "20-10-2025" | ❌ 400 | Use YYYY-MM-DD |
| 10 | Missing Field | No daily_calories | ❌ 400 | Required field |
| 11 | Extra Fields | Unknown field | ❌ 400 | Strict schema |
| 12 | Min Valid | 800 cal, 1 day | ✅ 201 | Edge case |
| 13 | Max Valid | 6000 cal, 365 days | ✅ 201 | Edge case |

---

## 📝 Detailed Test Cases

### ✅ Test 1: Valid Plan Generation
**Purpose**: Verify happy path creates plan with 201 status

```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

**Check**: 
- [ ] Status code is `201 Created`
- [ ] Response has `id` field
- [ ] `user_id` matches request
- [ ] `state` is `"active"`
- [ ] `start_date` matches request
- [ ] `end_date` is start_date + 6 days
- [ ] Location header is `/api/plans/{id}`

---

### ❌ Test 2: Missing user_id
**Purpose**: Verify user_id is required

```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

**Expected**: 
- [ ] Status code is `400 Bad Request`
- [ ] Response contains error about missing user_id

---

### ❌ Test 3: Validation - Low Calories
**Purpose**: Verify daily_calories minimum constraint (800)

```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 500,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

**Expected**:
- [ ] Status code is `400 Bad Request`
- [ ] Error message: "daily_calories must be at least 800 kcal"

---

### ❌ Test 4: Validation - High Calories
**Purpose**: Verify daily_calories maximum constraint (6000)

```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 7000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

**Expected**:
- [ ] Status code is `400 Bad Request`
- [ ] Error message about maximum calories

---

### ❌ Test 5: Validation - Invalid Date
**Purpose**: Verify start_date must be in future

```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-15"
  }'
```

**Expected**:
- [ ] Status code is `400 Bad Request`
- [ ] Error message says date must be in future

---

### ❌ Test 6: Conflict - Active Plan Exists
**Purpose**: Verify user can only have one active plan

```bash
# First request should succeed (201)
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'

# Second request with same user_id should fail (409)
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-25"
  }'
```

**Expected**:
- [ ] First request: `201 Created`
- [ ] Second request: `409 Conflict`
- [ ] Error message: "User already has an active plan..."

---

## 🔍 How to Verify Response

### Using jq (JSON pretty-print)
```bash
curl -s -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{...}' | jq
```

### Using jq with filtering
```bash
# Get just the error message
curl -s ... | jq '.error'

# Get plan ID
curl -s ... | jq '.id'

# Get entire response with formatting
curl -s ... | jq '.'
```

### Using curl verbose mode
```bash
curl -v -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{...}'
```

Shows:
- Request headers
- Response headers (including Location)
- HTTP status code
- Response body

---

## 📊 Response Status Codes

| Code | Meaning | When |
|------|---------|------|
| **201** | Created | Plan successfully generated |
| **400** | Bad Request | Validation failed (invalid input) |
| **409** | Conflict | User already has active plan |
| **500** | Internal Error | Server/database error |

---

## 🐛 Debugging Tips

### Issue: Always getting 400 "user_id is required"
**Cause**: Missing or invalid user_id in request body
**Solution**: 
- Verify user_id is included in JSON body
- Ensure it's a valid UUID string format
- Check it's not null or empty

### Issue: Getting 500 errors
**Cause**: Database or recipe issue
**Solution**:
- Check if recipes are loaded in database
- Verify Supabase connection in middleware
- Check server logs for error details

### Issue: Date validation always fails
**Cause**: Using today or past dates
**Solution**:
- Use tomorrow or later: `date -d "+1 day" +"%Y-%m-%d"`
- Verify ISO 8601 format: `YYYY-MM-DD`

### Issue: "No recipes available" error
**Cause**: Recipe database doesn't have meals for specified slot
**Solution**:
- Load test recipes: `npm run load-recipes`
- Verify recipes have correct meal_slot assignments

---

## 📈 Performance Testing

### Measure response time
```bash
time curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }' > /dev/null
```

**Expected**: < 2 seconds

### Test with larger plans
```bash
# 30-day plan (should still be fast)
curl -X POST ... -d '{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "daily_calories": 2000,
  "plan_length_days": 30,
  "start_date": "2025-10-20"
}'

# 365-day plan (maximum)
curl -X POST ... -d '{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "daily_calories": 2000,
  "plan_length_days": 365,
  "start_date": "2025-10-20"
}'
```

---

## 📋 Pre-Test Checklist

Before testing, verify:

- [ ] API server is running on `localhost:3000`
- [ ] Recipes are loaded in database
- [ ] Database connection working
- [ ] jq installed for JSON formatting (optional): `brew install jq`
- [ ] curl is available

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `src/pages/api/plans/generate.ts` | Endpoint handler |
| `src/lib/schemas/plan.ts` | Input validation |
| `src/lib/services/plans.service.ts` | Business logic |
| `src/lib/errors.ts` | Error types |
| `CURL_EXAMPLES.md` | Comprehensive curl examples |
| `scripts/test-plan-generation.sh` | Full automated test suite |
| `TEST_PLAN_GENERATION.sh` | Quick test script |

---

## 📚 Additional Resources

- [Endpoint Implementation Plan](/.ai/view-implementation-plan_4.md)
- [CURL Examples](./CURL_EXAMPLES.md)
- [API Testing Guide](./API_TESTING.md)

---

## ⏳ Coming Soon: Authentication

The endpoint currently accepts `user_id` in the request body for testing purposes. In a separate implementation step, this will be replaced with proper Supabase session authentication via `context.locals.session`.
