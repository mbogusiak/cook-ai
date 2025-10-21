#!/bin/bash

# Test suite for GET /api/recipes endpoint
# Run dev server first: npm run dev
# Default Astro dev server runs on http://localhost:4321

BASE_URL="http://localhost:3001"
API_ENDPOINT="$BASE_URL/api/recipes"

echo "=========================================="
echo "Testing GET /api/recipes endpoint"
echo "=========================================="
echo ""

# Test 1: Basic request (no parameters, default pagination)
echo "📋 Test 1: Basic request (default limit=20, offset=0)"
echo "curl \"$API_ENDPOINT\""
curl -s "$API_ENDPOINT" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 2: Filter by slot - breakfast
echo "🍳 Test 2: Filter by slot=breakfast"
echo "curl \"$API_ENDPOINT?slot=breakfast\""
curl -s "$API_ENDPOINT?slot=breakfast" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 3: Filter by slot - lunch
echo "🥗 Test 3: Filter by slot=lunch"
echo "curl \"$API_ENDPOINT?slot=lunch\""
curl -s "$API_ENDPOINT?slot=lunch" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 4: Text search
echo "🔍 Test 4: Search by name (search=chicken)"
echo "curl \"$API_ENDPOINT?search=chicken\""
curl -s "$API_ENDPOINT?search=chicken" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 5: Calorie range filter
echo "🔢 Test 5: Calorie range (min_calories=200, max_calories=500)"
echo "curl \"$API_ENDPOINT?min_calories=200&max_calories=500\""
curl -s "$API_ENDPOINT?min_calories=200&max_calories=500" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 6: Pagination - custom limit
echo "📄 Test 6: Custom limit (limit=5)"
echo "curl \"$API_ENDPOINT?limit=5\""
curl -s "$API_ENDPOINT?limit=5" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 7: Pagination - with offset
echo "📄 Test 7: Pagination (limit=10, offset=10)"
echo "curl \"$API_ENDPOINT?limit=10&offset=10\""
curl -s "$API_ENDPOINT?limit=10&offset=10" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 8: Combined filters
echo "🎯 Test 8: Combined filters (slot=dinner, min_calories=300, limit=5)"
echo "curl \"$API_ENDPOINT?slot=dinner&min_calories=300&limit=5\""
curl -s "$API_ENDPOINT?slot=dinner&min_calories=300&limit=5" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 9: Search + calorie range
echo "🔍 Test 9: Search + calorie range (search=salad, max_calories=400)"
echo "curl \"$API_ENDPOINT?search=salad&max_calories=400\""
curl -s "$API_ENDPOINT?search=salad&max_calories=400" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Test 10: Maximum limit
echo "📊 Test 10: Maximum limit (limit=100)"
echo "curl \"$API_ENDPOINT?limit=100\""
curl -s "$API_ENDPOINT?limit=100" | jq '.pagination'
echo ""
echo "------------------------------------------"
echo ""

echo "=========================================="
echo "ERROR CASES - Expected 400 Bad Request"
echo "=========================================="
echo ""

# Error Test 1: Invalid slot
echo "❌ Error Test 1: Invalid slot value"
echo "curl \"$API_ENDPOINT?slot=invalid_slot\""
curl -s "$API_ENDPOINT?slot=invalid_slot" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Error Test 2: Limit too high
echo "❌ Error Test 2: Limit exceeds maximum (limit=150)"
echo "curl \"$API_ENDPOINT?limit=150\""
curl -s "$API_ENDPOINT?limit=150" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Error Test 3: Negative offset
echo "❌ Error Test 3: Negative offset (offset=-1)"
echo "curl \"$API_ENDPOINT?offset=-1\""
curl -s "$API_ENDPOINT?offset=-1" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Error Test 4: min_calories > max_calories
echo "❌ Error Test 4: min_calories > max_calories"
echo "curl \"$API_ENDPOINT?min_calories=500&max_calories=200\""
curl -s "$API_ENDPOINT?min_calories=500&max_calories=200" | jq .
echo ""
echo "------------------------------------------"
echo ""

# Error Test 5: Negative calories
echo "❌ Error Test 5: Negative min_calories"
echo "curl \"$API_ENDPOINT?min_calories=-100\""
curl -s "$API_ENDPOINT?min_calories=-100" | jq .
echo ""
echo "------------------------------------------"
echo ""

echo "=========================================="
echo "EDGE CASES"
echo "=========================================="
echo ""

# Edge Test 1: Empty search
echo "🔍 Edge Test 1: Empty search string (should return all)"
echo "curl \"$API_ENDPOINT?search=\""
curl -s "$API_ENDPOINT?search=" | jq '.pagination'
echo ""
echo "------------------------------------------"
echo ""

# Edge Test 2: Zero offset
echo "📄 Edge Test 2: Explicit zero offset (offset=0)"
echo "curl \"$API_ENDPOINT?offset=0&limit=5\""
curl -s "$API_ENDPOINT?offset=0&limit=5" | jq '.pagination'
echo ""
echo "------------------------------------------"
echo ""

# Edge Test 3: Very specific calorie range
echo "🔢 Edge Test 3: Very narrow calorie range (min=300, max=305)"
echo "curl \"$API_ENDPOINT?min_calories=300&max_calories=305\""
curl -s "$API_ENDPOINT?min_calories=300&max_calories=305" | jq .
echo ""
echo "------------------------------------------"
echo ""

echo "=========================================="
echo "Tests completed!"
echo "=========================================="

