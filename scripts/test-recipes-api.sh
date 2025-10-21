#!/bin/bash

# Recipe API Testing Script
# Usage: ./scripts/test-recipes-api.sh [test-name]
# Examples:
#   ./scripts/test-recipes-api.sh success
#   ./scripts/test-recipes-api.sh not-found
#   ./scripts/test-recipes-api.sh invalid
#   ./scripts/test-recipes-api.sh all

BASE_URL="http://localhost:3000/api/recipes"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Recipe API Testing Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Successful request (200)
test_success() {
  echo -e "${YELLOW}Test 1: Fetch Existing Recipe (200 OK)${NC}"
  echo -e "URL: ${BASE_URL}/1\n"
  curl -s -X GET "${BASE_URL}/1" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/1"
  echo ""
}

# Test 2: Not found (404)
test_not_found() {
  echo -e "${YELLOW}Test 2: Fetch Non-Existent Recipe (404 Not Found)${NC}"
  echo -e "URL: ${BASE_URL}/999999\n"
  curl -s -X GET "${BASE_URL}/999999" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/999999"
  echo ""
}

# Test 3: Invalid ID (400)
test_invalid() {
  echo -e "${YELLOW}Test 3: Invalid Recipe ID - Non-numeric (400 Bad Request)${NC}"
  echo -e "URL: ${BASE_URL}/abc\n"
  curl -s -X GET "${BASE_URL}/abc" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/abc"
  echo ""
}

# Test 4: Negative ID (400)
test_negative() {
  echo -e "${YELLOW}Test 4: Negative Recipe ID (400 Bad Request)${NC}"
  echo -e "URL: ${BASE_URL}/-1\n"
  curl -s -X GET "${BASE_URL}/-1" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/-1"
  echo ""
}

# Test 5: Zero ID (400)
test_zero() {
  echo -e "${YELLOW}Test 5: Zero Recipe ID (400 Bad Request)${NC}"
  echo -e "URL: ${BASE_URL}/0\n"
  curl -s -X GET "${BASE_URL}/0" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/0"
  echo ""
}

# Test 6: Cache headers
test_cache_headers() {
  echo -e "${YELLOW}Test 6: Verify Cache Headers${NC}"
  echo -e "URL: ${BASE_URL}/1\n"
  curl -s -i -X GET "${BASE_URL}/1" \
    -H "Content-Type: application/json" | head -15
  echo ""
}

# Test 7: Response time
test_response_time() {
  echo -e "${YELLOW}Test 7: Response Time${NC}"
  echo -e "URL: ${BASE_URL}/1\n"
  time curl -s -X GET "${BASE_URL}/1" \
    -H "Content-Type: application/json" \
    -o /dev/null
  echo ""
}

# Run tests based on argument
case "${1:-all}" in
  success)
    test_success
    ;;
  not-found)
    test_not_found
    ;;
  invalid)
    test_invalid
    ;;
  negative)
    test_negative
    ;;
  zero)
    test_zero
    ;;
  headers)
    test_cache_headers
    ;;
  time)
    test_response_time
    ;;
  all)
    test_success
    test_not_found
    test_invalid
    test_negative
    test_zero
    test_cache_headers
    test_response_time
    ;;
  *)
    echo -e "${RED}Unknown test: $1${NC}"
    echo ""
    echo "Available tests:"
    echo "  success      - Test successful recipe fetch (200)"
    echo "  not-found    - Test non-existent recipe (404)"
    echo "  invalid      - Test invalid recipe ID format (400)"
    echo "  negative     - Test negative recipe ID (400)"
    echo "  zero         - Test zero recipe ID (400)"
    echo "  headers      - Test cache headers"
    echo "  time         - Test response time"
    echo "  all          - Run all tests"
    echo ""
    echo "Usage: ./scripts/test-recipes-api.sh [test-name]"
    exit 1
    ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Complete${NC}"
echo -e "${BLUE}========================================${NC}"
