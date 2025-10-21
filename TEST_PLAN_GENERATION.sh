#!/bin/bash
# 
# Quick Test Script - POST /api/plans/generate
# Usage: ./TEST_PLAN_GENERATION.sh [USER_ID]
#
# Example:
#   ./TEST_PLAN_GENERATION.sh "550e8400-e29b-41d4-a716-446655440000"
#

USER_ID="${1:-550e8400-e29b-41d4-a716-446655440001}"

API_URL="http://localhost:3000/api/plans/generate"

echo "🧪 Testing: POST $API_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "User ID: $USER_ID"
echo ""

# Test 1: Happy Path
echo "✅ Test 1: Valid Plan (happy path)"
echo "Request:"
echo '  user_id: '$USER_ID''
echo '  daily_calories: 2000'
echo '  plan_length_days: 7'
echo '  start_date: 2025-10-20'
echo ""
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"daily_calories\": 2000,
    \"plan_length_days\": 7,
    \"start_date\": \"2025-10-20\"
  }" -w "\nStatus: %{http_code}\n\n" | jq .

# Test 2: Low Calories
echo "❌ Test 2: Low Calories (should fail with 400)"
echo "Request:"
echo '  daily_calories: 500'
echo ""
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"daily_calories\": 500,
    \"plan_length_days\": 7,
    \"start_date\": \"2025-10-20\"
  }" -w "\nStatus: %{http_code}\n\n" | jq .

# Test 3: Invalid Date (past)
echo "❌ Test 3: Past Date (should fail with 400)"
echo "Request:"
echo '  start_date: 2025-10-15 (in past)'
echo ""
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"daily_calories\": 2000,
    \"plan_length_days\": 7,
    \"start_date\": \"2025-10-15\"
  }" -w "\nStatus: %{http_code}\n\n" | jq .

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Done! Check responses above."
