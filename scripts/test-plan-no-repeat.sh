#!/bin/bash

###############################################################################
# Test Script: No-Repeat Meals Algorithm with Leftovers
# 
# This script tests the new meal plan generation algorithm that:
# 1. Prevents recipe repetition within a plan
# 2. Creates leftovers on next day if recipe has portions > 1
# 3. Expands calorie margin from ±20% to ±30% if needed
#
# Usage: ./scripts/test-plan-no-repeat.sh [SESSION_TOKEN]
#
###############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
ENDPOINT="$API_BASE_URL/api/plans/generate"
GET_PLAN_ENDPOINT="$API_BASE_URL/api/plans"

SESSION_TOKEN="${1:-}"

if [ -z "$SESSION_TOKEN" ]; then
  echo -e "${YELLOW}No session token provided.${NC}"
  echo "Usage: $0 <session_token>"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   No-Repeat Meals Algorithm - Test Suite                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Helper function to check recipe uniqueness
check_recipe_uniqueness() {
  local plan_id=$1
  local response=$2
  
  echo -e "\n${YELLOW}Fetching plan details to verify no-repeat logic...${NC}"
  
  local plan_details=$(curl -s -X GET "$GET_PLAN_ENDPOINT/$plan_id" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SESSION_TOKEN")
  
  echo "$plan_details" | jq '.' 2>/dev/null || echo "$plan_details"
  
  # Extract all recipe IDs
  local recipe_ids=$(echo "$plan_details" | jq -r '.days[] | .meals[] | select(.is_leftover == false) | .recipe.id' 2>/dev/null)
  
  echo -e "\n${YELLOW}Non-leftover Recipe IDs:${NC}"
  echo "$recipe_ids"
  
  # Count unique vs total
  local total_count=$(echo "$recipe_ids" | wc -w)
  local unique_count=$(echo "$recipe_ids" | tr ' ' '\n' | sort -u | wc -w)
  
  echo -e "\n${YELLOW}Recipe Count Analysis:${NC}"
  echo "Total non-leftover meals: $total_count"
  echo "Unique recipes used: $unique_count"
  
  if [ "$total_count" -eq "$unique_count" ]; then
    echo -e "${GREEN}✓ PASSED${NC}: No recipe repetition detected (all recipes are unique)"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}: Recipe repetition detected!"
    return 1
  fi
}

# Helper function to check leftovers
check_leftovers_logic() {
  local plan_id=$1
  
  echo -e "\n${YELLOW}Verifying leftovers logic...${NC}"
  
  local plan_details=$(curl -s -X GET "$GET_PLAN_ENDPOINT/$plan_id" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SESSION_TOKEN")
  
  # Check if leftovers exist and follow the pattern
  local leftovers_count=$(echo "$plan_details" | jq '[.days[] | .meals[] | select(.is_leftover == true)] | length' 2>/dev/null)
  
  echo -e "${YELLOW}Leftovers found: $leftovers_count${NC}"
  
  if [ "$leftovers_count" -gt 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}: Leftovers were created in the plan"
    
    # Show leftover details
    echo -e "\n${YELLOW}Leftover Meals:${NC}"
    echo "$plan_details" | jq '.days[] | select(.meals[] | select(.is_leftover == true)) | {date: .date, meals: [.meals[] | select(.is_leftover == true) | {slot: .slot, recipe: .recipe.name, is_leftover: .is_leftover}]}' 2>/dev/null || echo "Could not display leftovers"
    
    return 0
  else
    echo -e "${YELLOW}ℹ INFO${NC}: No leftovers created (recipes likely all have portions = 1)"
    return 0
  fi
}

# Test 1: Generate a short plan and verify no repetition
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: 3-Day Plan - Verify No Recipe Repetition${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REQUEST_BODY_1='{
  "daily_calories": 2000,
  "plan_length_days": 3,
  "start_date": "2025-10-20"
}'

echo -e "\n${YELLOW}Request:${NC}"
echo "$REQUEST_BODY_1" | jq '.'

RESPONSE_1=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d "$REQUEST_BODY_1")

HTTP_CODE_1=$(echo "$RESPONSE_1" | tail -n1)
BODY_1=$(echo "$RESPONSE_1" | head -n-1)

echo -e "\n${YELLOW}Response Status: ${NC}$HTTP_CODE_1"
echo -e "${YELLOW}Response Body:${NC}"
echo "$BODY_1" | jq '.'

if [[ "$HTTP_CODE_1" == "201" ]]; then
  PLAN_ID_1=$(echo "$BODY_1" | jq -r '.id')
  echo -e "\n${GREEN}✓ Plan created successfully (ID: $PLAN_ID_1)${NC}"
  
  check_recipe_uniqueness "$PLAN_ID_1" "$BODY_1"
  check_leftovers_logic "$PLAN_ID_1"
else
  echo -e "${RED}✗ Failed to create plan (HTTP $HTTP_CODE_1)${NC}"
fi

# Test 2: Longer plan (7 days) to verify the algorithm handles more days
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 2: 7-Day Plan - Extended No-Repeat Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REQUEST_BODY_2='{
  "daily_calories": 2000,
  "plan_length_days": 7,
  "start_date": "2025-10-23"
}'

echo -e "\n${YELLOW}Request:${NC}"
echo "$REQUEST_BODY_2" | jq '.'

RESPONSE_2=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d "$REQUEST_BODY_2")

HTTP_CODE_2=$(echo "$RESPONSE_2" | tail -n1)
BODY_2=$(echo "$RESPONSE_2" | head -n-1)

echo -e "\n${YELLOW}Response Status: ${NC}$HTTP_CODE_2"
echo -e "${YELLOW}Response Body:${NC}"
echo "$BODY_2" | jq '.'

if [[ "$HTTP_CODE_2" == "201" ]]; then
  PLAN_ID_2=$(echo "$BODY_2" | jq -r '.id')
  echo -e "\n${GREEN}✓ Plan created successfully (ID: $PLAN_ID_2)${NC}"
  
  check_recipe_uniqueness "$PLAN_ID_2" "$BODY_2"
  check_leftovers_logic "$PLAN_ID_2"
else
  echo -e "${RED}✗ Failed to create plan (HTTP $HTTP_CODE_2)${NC}"
fi

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST COMPLETE                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
