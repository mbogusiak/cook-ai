# Test Commands for GET /api/recipes

## Prerequisites
1. Start dev server: `npm run dev`
2. Server should be running on `http://localhost:4321`
3. Ensure database has recipe data loaded

---

## Quick Test Commands (Copy & Paste)

### ✅ Success Cases

#### 1. Basic request (default pagination)
```bash
curl "http://localhost:3001/api/recipes" | jq
```

#### 2. Filter by breakfast slot
```bash
curl "http://localhost:4321/api/recipes?slot=breakfast" | jq
```

#### 3. Filter by lunch slot
```bash
curl "http://localhost:4321/api/recipes?slot=lunch" | jq
```

#### 4. Filter by dinner slot
```bash
curl "http://localhost:4321/api/recipes?slot=dinner" | jq
```

#### 5. Filter by snack slot
```bash
curl "http://localhost:4321/api/recipes?slot=snack" | jq
```

#### 6. Search by name
```bash
curl "http://localhost:4321/api/recipes?search=chicken" | jq
```

```bash
curl "http://localhost:4321/api/recipes?search=salad" | jq
```

#### 7. Filter by calorie range
```bash
curl "http://localhost:4321/api/recipes?min_calories=200&max_calories=500" | jq
```

```bash
curl "http://localhost:4321/api/recipes?min_calories=300" | jq
```

```bash
curl "http://localhost:4321/api/recipes?max_calories=400" | jq
```

#### 8. Pagination - custom limit
```bash
curl "http://localhost:4321/api/recipes?limit=5" | jq
```

```bash
curl "http://localhost:4321/api/recipes?limit=10" | jq
```

#### 9. Pagination - with offset
```bash
curl "http://localhost:4321/api/recipes?limit=10&offset=10" | jq
```

```bash
curl "http://localhost:4321/api/recipes?limit=5&offset=20" | jq
```

#### 10. Combined filters
```bash
curl "http://localhost:4321/api/recipes?slot=dinner&min_calories=300&limit=5" | jq
```

```bash
curl "http://localhost:4321/api/recipes?slot=breakfast&search=egg&max_calories=400" | jq
```

```bash
curl "http://localhost:4321/api/recipes?search=chicken&min_calories=200&max_calories=600&limit=10" | jq
```

#### 11. Check pagination metadata only
```bash
curl "http://localhost:4321/api/recipes?limit=20" | jq '.pagination'
```

#### 12. Maximum limit (100)
```bash
curl "http://localhost:4321/api/recipes?limit=100" | jq '.pagination'
```

---

## ❌ Error Cases (Expected 400 Bad Request)

#### 1. Invalid slot value
```bash
curl "http://localhost:4321/api/recipes?slot=invalid_slot" | jq
```

#### 2. Limit too high (max is 100)
```bash
curl "http://localhost:4321/api/recipes?limit=150" | jq
```

#### 3. Limit too low (min is 1)
```bash
curl "http://localhost:4321/api/recipes?limit=0" | jq
```

#### 4. Negative offset
```bash
curl "http://localhost:4321/api/recipes?offset=-1" | jq
```

#### 5. min_calories > max_calories
```bash
curl "http://localhost:4321/api/recipes?min_calories=500&max_calories=200" | jq
```

#### 6. Negative calories
```bash
curl "http://localhost:4321/api/recipes?min_calories=-100" | jq
```

```bash
curl "http://localhost:4321/api/recipes?max_calories=-50" | jq
```

#### 7. Non-numeric values for numeric fields
```bash
curl "http://localhost:4321/api/recipes?limit=abc" | jq
```

```bash
curl "http://localhost:4321/api/recipes?min_calories=xyz" | jq
```

---

## 🔍 Advanced Testing

#### 1. Check response headers
```bash
curl -I "http://localhost:4321/api/recipes"
```

#### 2. Show full response with timing
```bash
curl -w "\n\nTime: %{time_total}s\n" "http://localhost:4321/api/recipes?limit=50" | jq
```

#### 3. Test with verbose output
```bash
curl -v "http://localhost:4321/api/recipes?slot=breakfast&limit=5" | jq
```

#### 4. Save response to file
```bash
curl "http://localhost:4321/api/recipes?limit=100" -o recipes-response.json
cat recipes-response.json | jq
```

#### 5. Extract only recipe names
```bash
curl "http://localhost:4321/api/recipes?limit=10" | jq '.data[].name'
```

#### 6. Count total results
```bash
curl "http://localhost:4321/api/recipes?slot=breakfast" | jq '.pagination.total'
```

#### 7. Check if has_more is working
```bash
curl "http://localhost:4321/api/recipes?limit=5&offset=0" | jq '.pagination.has_more'
```

---

## 📊 Performance Testing

#### 1. Test multiple requests
```bash
for i in {1..10}; do
  echo "Request $i:"
  curl -w "Time: %{time_total}s\n" "http://localhost:4321/api/recipes?limit=20" -o /dev/null -s
done
```

#### 2. Test different page sizes
```bash
for limit in 10 20 50 100; do
  echo "Testing limit=$limit:"
  curl -w "Time: %{time_total}s\n" "http://localhost:4321/api/recipes?limit=$limit" -o /dev/null -s
done
```

---

## 🎯 Automated Test Script

Run all tests at once:
```bash
./test-recipes-endpoint.sh
```

Or run specific sections:
```bash
# Run only success cases
./test-recipes-endpoint.sh | grep -A 10 "Success"

# Run only error cases
./test-recipes-endpoint.sh | grep -A 10 "ERROR"
```

---

## 📝 Notes

- All commands assume dev server is running on `http://localhost:4321`
- `jq` is used for JSON formatting (install with `brew install jq` on macOS)
- If `jq` is not installed, remove `| jq` from commands to see raw JSON
- Check that recipes are loaded in database before testing
- Cache headers are set to 5 minutes for search results

---

# CURL Examples - Plan Generation API

## Endpoint: POST /api/plans/generate

Base URL: `http://localhost:3000/api/plans/generate`

---

## 1. ✅ HAPPY PATH - Válid Plan Generation

**Description**: Create a valid 7-day meal plan with 2000 daily calories

**Request**:
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

**Expected Response (201 Created)**:
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

**Response Headers**:
- Status: `201 Created`
- Location: `/api/plans/42`

---

## 2. 🔴 ERROR: Missing user_id (400 Bad Request)

**Description**: Request without user_id field

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "user_id is required and must be a string"
}
```

---

## 3. 🔴 ERROR: Invalid JSON (400 Bad Request)

**Description**: Malformed JSON in request body

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
    INVALID
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "Invalid JSON in request body"
}
```

---

## 4. 🔴 ERROR: Empty Request Body (400 Bad Request)

**Description**: Empty or missing request body

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d ''
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "Request body is empty"
}
```

---

## 5. 🔴 ERROR: daily_calories Too Low (400 Bad Request)

**Description**: daily_calories below minimum (800)

**Request**:
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

**Expected Response (400 Bad Request)**:
```json
{
  "error": "daily_calories must be at least 800 kcal"
}
```

---

## 6. 🔴 ERROR: daily_calories Too High (400 Bad Request)

**Description**: daily_calories above maximum (6000)

**Request**:
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

**Expected Response (400 Bad Request)**:
```json
{
  "error": "daily_calories must not exceed 6000 kcal"
}
```

---

## 7. 🔴 ERROR: daily_calories Not Integer (400 Bad Request)

**Description**: daily_calories must be whole number

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000.5,
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "daily_calories must be a whole number"
}
```

---

## 8. 🔴 ERROR: plan_length_days Too Short (400 Bad Request)

**Description**: plan_length_days below minimum (1)

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 0,
    "start_date": "2025-10-20"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "plan_length_days must be at least 1 day"
}
```

---

## 9. 🔴 ERROR: plan_length_days Too Long (400 Bad Request)

**Description**: plan_length_days above maximum (365)

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 400,
    "start_date": "2025-10-20"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "plan_length_days must not exceed 365 days"
}
```

---

## 10. 🔴 ERROR: Invalid Date Format (400 Bad Request)

**Description**: start_date not in ISO 8601 format

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "20-10-2025"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "start_date must be a valid ISO 8601 date (YYYY-MM-DD)"
}
```

---

## 11. 🔴 ERROR: start_date in Past (400 Bad Request)

**Description**: start_date cannot be today or in the past

**Request**:
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

**Expected Response (400 Bad Request)**:
```json
{
  "error": "start_date must be in the future (tomorrow or later)"
}
```

---

## 12. 🔴 ERROR: start_date is Today (400 Bad Request)

**Description**: start_date must be strictly in future (tomorrow or later)

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-17"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "start_date must be in the future (tomorrow or later)"
}
```

---

## 13. 🔴 ERROR: Missing Required Field (400 Bad Request)

**Description**: Missing daily_calories field

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "plan_length_days": 7,
    "start_date": "2025-10-20"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "Invalid input parameters"
}
```

---

## 14. 🔴 ERROR: Extra/Unknown Fields (400 Bad Request)

**Description**: Request body with unexpected fields (schema uses .strict())

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 2000,
    "plan_length_days": 7,
    "start_date": "2025-10-20",
    "unexpected_field": "should fail"
  }'
```

**Expected Response (400 Bad Request)**:
```json
{
  "error": "Invalid input parameters"
}
```

---

## 15. 🔴 ERROR: Active Plan Already Exists (409 Conflict)

**Description**: User already has an active plan

**Prerequisites**: User must have existing active plan

**Request** (run twice with same user_id):
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

**Expected Response (first time - 201 Created)**:
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

**Expected Response (second time - 409 Conflict)**:
```json
{
  "error": "User already has an active plan. Archive or complete the existing plan first."
}
```

---

## 16. ✅ EDGE CASE: Minimum Valid Plan (1 day, 800 calories)

**Description**: Minimal valid plan - 1 day with minimum calories

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 800,
    "plan_length_days": 1,
    "start_date": "2025-10-20"
  }'
```

**Expected Response (201 Created)**:
```json
{
  "id": 43,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "state": "active",
  "start_date": "2025-10-20",
  "end_date": "2025-10-20",
  "created_at": "2025-10-17T14:35:00Z",
  "updated_at": "2025-10-17T14:35:00Z"
}
```

---

## 17. ✅ EDGE CASE: Maximum Valid Plan (365 days, 6000 calories)

**Description**: Maximal valid plan - full year with maximum calories

**Request**:
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "daily_calories": 6000,
    "plan_length_days": 365,
    "start_date": "2025-10-20"
  }'
```

**Expected Response (201 Created)**:
```json
{
  "id": 44,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "state": "active",
  "start_date": "2025-10-20",
  "end_date": "2026-10-19",
  "created_at": "2025-10-17T14:40:00Z",
  "updated_at": "2025-10-17T14:40:00Z"
}
```

---

## 18. ✅ EDGE CASE: Tomorrow as Start Date

**Description**: Start plan tomorrow (valid edge case)

**Request** (run this command replacing TOMORROW_DATE):
```bash
TOMORROW=$(date -v+1d +"%Y-%m-%d")  # macOS
# or
TOMORROW=$(date -d "+1 day" +"%Y-%m-%d")  # Linux

curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"daily_calories\": 2000,
    \"plan_length_days\": 7,
    \"start_date\": \"$TOMORROW\"
  }"
```

**Expected Response (201 Created)**:
```json
{
  "id": 45,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "state": "active",
  "start_date": "2025-10-18",
  "end_date": "2025-10-24",
  "created_at": "2025-10-17T14:45:00Z",
  "updated_at": "2025-10-17T14:45:00Z"
}
```

---

## Testing Checklist

- [ ] Test 1: Happy path creates plan with 201 ✅
- [ ] Test 2: No auth returns 401 ✅
- [ ] Test 3: Invalid JSON returns 400 ✅
- [ ] Test 4: Empty body returns 400 ✅
- [ ] Test 5: Low calories returns 400 ✅
- [ ] Test 6: High calories returns 400 ✅
- [ ] Test 7: Float calories returns 400 ✅
- [ ] Test 8: Zero days returns 400 ✅
- [ ] Test 9: 400+ days returns 400 ✅
- [ ] Test 10: Invalid date format returns 400 ✅
- [ ] Test 11: Past date returns 400 ✅
- [ ] Test 12: Today as start returns 400 ✅
- [ ] Test 13: Missing field returns 400 ✅
- [ ] Test 14: Extra fields returns 400 ✅
- [ ] Test 15: Active plan exists returns 409 ✅
- [ ] Test 16: Minimum plan succeeds 201 ✅
- [ ] Test 17: Maximum plan succeeds 201 ✅
- [ ] Test 18: Tomorrow start succeeds 201 ✅

---

## Environment Setup

Before testing, set your session token:

```bash
export SESSION_TOKEN="your_actual_session_token_here"

# Then use in curl:
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{...}'

# Or without export:
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d '{...}' \
  -H "Authorization: Bearer $(cat ~/.session_token)"
```

---

## Common Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 Not Found | Endpoint not at `/api/plans/generate` - verify routing |
| 405 Method Not Allowed | Using GET instead of POST |
| 500 Internal Server Error | Database connection issue - check middleware |
| Missing `Location` header | Check 201 response headers |
| Wrong date format | Use ISO 8601 (YYYY-MM-DD) |
| Calories as string | Must be number, not quoted |

