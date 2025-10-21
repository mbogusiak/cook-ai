#!/bin/bash

# Test script for POST /api/user-settings endpoint
# User ID: 067549b4-784f-45f8-8036-df0412c701a0

BASE_URL="http://localhost:3000/api/user-settings"
USER_ID="067549b4-784f-45f8-8036-df0412c701a0"

echo "=========================================="
echo "TEST 1: Happy Path - Valid Request"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 2000,
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 2: Happy Path - Without plan_length_days (should default to 7)"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 2500
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 3: Validation Error - Negative Calories"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": -500,
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 4: Validation Error - Calories = 0"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 0,
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 5: Validation Error - plan_length_days = 0"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 2000,
    \"default_plan_length_days\": 0
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 6: Validation Error - plan_length_days = 32 (exceeds max)"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 2000,
    \"default_plan_length_days\": 32
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 7: Validation Error - plan_length_days is float (not integer)"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 2000,
    \"default_plan_length_days\": 7.5
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 8: Validation Error - Invalid UUID format"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"invalid-uuid-format\",
    \"default_daily_calories\": 2000,
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 9: Validation Error - Calories is string (not number)"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": \"abc\",
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 10: Bad Request - Missing user_id"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"default_daily_calories\": 2000,
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 11: Bad Request - Missing default_daily_calories"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 12: Bad Request - Empty JSON body"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d ""
echo "\n\n"

echo "=========================================="
echo "TEST 13: Bad Request - Invalid JSON (missing closing brace)"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 2000"
echo "\n\n"

echo "=========================================="
echo "TEST 14: Conflict - Create duplicate (run TEST 1 first)"
echo "=========================================="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"default_daily_calories\": 2000,
    \"default_plan_length_days\": 7
  }"
echo "\n\n"

echo "=========================================="
echo "TEST 15: Different user_id - Alternative valid request"
echo "=========================================="
ANOTHER_USER_ID="550e8400-e29b-41d4-a716-446655440000"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$ANOTHER_USER_ID\",
    \"default_daily_calories\": 1800,
    \"default_plan_length_days\": 14
  }"
echo "\n\n"
