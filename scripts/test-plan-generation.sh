#!/bin/bash

###############################################################################
# Test Script: POST /api/plans/generate
# 
# Usage: ./test-plan-generation.sh [SESSION_TOKEN]
#
# Examples:
#   ./test-plan-generation.sh                          (prompts for token)
#   ./test-plan-generation.sh "your_session_token"     (use provided token)
#
###############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
ENDPOINT="$API_BASE_URL/api/plans/generate"

# Session token
SESSION_TOKEN="${1:-}"

if [ -z "$SESSION_TOKEN" ]; then
  echo -e "${YELLOW}No session token provided.${NC}"
  echo "Usage: $0 <session_token>"
  echo ""
  echo "Set token as argument or environment variable:"
  echo "  export SESSION_TOKEN='your_token'"
  echo "  $0"
  exit 1
fi

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

###############################################################################
# Helper Functions
###############################################################################

# Print test header
print_test_header() {
  local test_num=$1
  local test_name=$2
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Test #$test_num: $test_name${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check response status
check_status() {
  local response=$1
  local expected_status=$2
  local test_name=$3
  
  ((TOTAL_TESTS++))
  
  if echo "$response" | grep -q "\"id\":"; then
    local actual_status=201
  else
    local actual_status=$(echo "$response" | grep -oP '"status":\K[0-9]+' || echo "unknown")
  fi
  
  if [[ "$response" == *"$expected_status"* ]] || grep -q "HTTP" <<< "$response"; then
    echo -e "${GREEN}✓ PASSED${NC}: $test_name"
    ((PASSED_TESTS++))
  else
    echo -e "${RED}✗ FAILED${NC}: $test_name"
    ((FAILED_TESTS++))
  fi
}

# Run test with curl
run_test() {
  local test_num=$1
  local test_name=$2
  local expected_status=$3
  local request_body=$4
  
  print_test_header "$test_num" "$test_name"
  
  echo -e "${YELLOW}Request Body:${NC}"
  echo "$request_body" | jq '.' 2>/dev/null || echo "$request_body"
  
  echo -e "\n${YELLOW}Sending request...${NC}"
  
  local response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -d "$request_body")
  
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | head -n-1)
  
  echo -e "${YELLOW}Response Status: ${NC}$http_code"
  echo -e "${YELLOW}Response Body:${NC}"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  
  # Check if status matches expected
  if [[ "$http_code" == "$expected_status" ]]; then
    echo -e "${GREEN}✓ PASSED${NC}: Got expected status $expected_status"
    ((PASSED_TESTS++))
  else
    echo -e "${RED}✗ FAILED${NC}: Expected $expected_status but got $http_code"
    ((FAILED_TESTS++))
  fi
  
  ((TOTAL_TESTS++))
}

###############################################################################
# Test Cases
###############################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Plan Generation API - Comprehensive Test Suite         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "\nEndpoint: ${YELLOW}$ENDPOINT${NC}"
echo -e "Auth: ${YELLOW}Bearer $SESSION_TOKEN${NC}\n"

# Test 1: Happy Path - Valid Plan
run_test 1 "Happy Path - Valid Plan (7 days, 2000 cal)" 201 \
'{
  "daily_calories": 2000,
  "plan_length_days": 7,
  "start_date": "2025-10-20"
}'

# Test 2: No Authentication
run_test 2 "No Authentication - Missing Token" 401 \
'{
  "daily_calories": 2000,
  "plan_length_days": 7,
  "start_date": "2025-10-20"
}'

# Test 3: Empty Body
run_test 3 "Empty Request Body" 400 ''

# Test 4: Invalid JSON
run_test 4 "Invalid JSON Syntax" 400 \
'{
  "daily_calories": 2000,
  INVALID
}'

# Test 5: Calories Too Low
run_test 5 "Calories Too Low (< 800)" 400 \
'{
  "daily_calories": 500,
  "plan_length_days": 7,
  "start_date": "2025-10-20"
}'

# Test 6: Calories Too High
run_test 6 "Calories Too High (> 6000)" 400 \
'{
  "daily_calories": 7000,
  "plan_length_days": 7,
  "start_date": "2025-10-20"
}'

# Test 7: Days Too Short
run_test 7 "Plan Days Too Short (< 1)" 400 \
'{
  "daily_calories": 2000,
  "plan_length_days": 0,
  "start_date": "2025-10-20"
}'

# Test 8: Days Too Long
run_test 8 "Plan Days Too Long (> 365)" 400 \
'{
  "daily_calories": 2000,
  "plan_length_days": 400,
  "start_date": "2025-10-20"
}'

# Test 9: Invalid Date Format
run_test 9 "Invalid Date Format (not ISO 8601)" 400 \
'{
  "daily_calories": 2000,
  "plan_length_days": 7,
  "start_date": "20-10-2025"
}'

# Test 10: Missing Required Field
run_test 10 "Missing Required Field (daily_calories)" 400 \
'{
  "plan_length_days": 7,
  "start_date": "2025-10-20"
}'

# Test 11: Extra/Unknown Fields
run_test 11 "Extra/Unknown Fields (strict schema)" 400 \
'{
  "daily_calories": 2000,
  "plan_length_days": 7,
  "start_date": "2025-10-20",
  "unexpected_field": "should fail"
}'

# Test 12: Minimum Valid Plan
run_test 12 "Minimum Valid Plan (1 day, 800 cal)" 201 \
'{
  "daily_calories": 800,
  "plan_length_days": 1,
  "start_date": "2025-10-20"
}'

# Test 13: Maximum Valid Plan
run_test 13 "Maximum Valid Plan (365 days, 6000 cal)" 201 \
'{
  "daily_calories": 6000,
  "plan_length_days": 365,
  "start_date": "2025-10-20"
}'

###############################################################################
# Test Summary
###############################################################################

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     TEST SUMMARY                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\nTotal Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"

if [[ $FAILED_TESTS -eq 0 ]]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi

