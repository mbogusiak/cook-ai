# API Testing Guide

## Prerequisites

1. Start the development server:
```bash
npm run dev
```

The server will be available at `http://localhost:3000` (default Astro port). If port 3000 is in use, check the terminal output for the actual port number.

2. Ensure your Supabase environment variables are set in `.env` or `.env.local`:
```
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## GET /api/recipes/{id} - Recipe Details Endpoint

### Test Case 1: Fetch Existing Recipe (Success - 200)

```bash
curl -X GET "http://localhost:3000/api/recipes/1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -v
```

**Expected Response**:
- Status: `200 OK`
- Headers: `Cache-Control: public, max-age=3600`
- Body: 
```json
{
  "data": {
    "id": 1,
    "slug": "healthy-breakfast-bowl",
    "name": "Healthy Breakfast Bowl",
    "available_slots": ["breakfast", "lunch"],
    "calories_per_serving": 350,
    "servings": 1,
    "time_minutes": 15,
    "image_url": "https://example.com/image.jpg",
    "source_url": "https://cookido.com/recipe/123",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### Test Case 2: Fetch Non-Existent Recipe (Not Found - 404)

```bash
curl -X GET "http://localhost:3000/api/recipes/999999" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -v
```

**Expected Response**:
- Status: `404 Not Found`
- Body:
```json
{
  "error": "Recipe not found"
}
```

---

### Test Case 3: Invalid Recipe ID - Non-numeric (Bad Request - 400)

```bash
curl -X GET "http://localhost:3000/api/recipes/abc" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -v
```

**Expected Response**:
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "Invalid recipe ID format"
}
```

---

### Test Case 4: Negative Recipe ID (Bad Request - 400)

```bash
curl -X GET "http://localhost:3000/api/recipes/-1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -v
```

**Expected Response**:
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "Invalid recipe ID format"
}
```

---

### Test Case 5: Zero Recipe ID (Bad Request - 400)

```bash
curl -X GET "http://localhost:3000/api/recipes/0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -v
```

**Expected Response**:
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "Invalid recipe ID format"
}
```

---

### Test Case 6: Verify Cache Headers

```bash
curl -X GET "http://localhost:3000/api/recipes/1" \
  -H "Content-Type: application/json" \
  -i
```

**Expected Headers**:
```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600
```

---

## Testing with Pretty JSON Output

If you have `jq` installed, you can format the JSON output:

```bash
curl -s "http://localhost:3000/api/recipes/1" | jq .
```

---

## Testing with Postman

1. Open Postman
2. Create a new GET request
3. URL: `http://localhost:3000/api/recipes/1`
4. Headers:
   - `Content-Type: application/json`
   - `Accept: application/json`
5. Click Send
6. Verify response status and body

---

## Browser Testing

Simply visit in your browser:
- `http://localhost:3000/api/recipes/1`
- `http://localhost:3000/api/recipes/999999`
- `http://localhost:3000/api/recipes/abc`

---

## Response Time Testing

To measure response time:

```bash
time curl -X GET "http://localhost:3000/api/recipes/1" \
  -H "Content-Type: application/json" \
  -o /dev/null \
  -s \
  -w "\nTime: %{time_total}s\n"
```

Expected: Response time should be < 100ms for good performance.

---

## Load Testing (using Apache Bench)

To test performance under load:

```bash
ab -n 100 -c 10 "http://localhost:3000/api/recipes/1"
```

This sends 100 requests with 10 concurrent connections.

---

## Debugging

### View Detailed Request/Response

```bash
curl -X GET "http://localhost:3000/api/recipes/1" \
  -H "Content-Type: application/json" \
  -v 2>&1 | head -50
```

### Check Server Logs

Watch your terminal where you ran `npm run dev` for any console.error logs.

### Enable More Verbose Output

```bash
curl -X GET "http://localhost:3000/api/recipes/1" \
  --trace-ascii /dev/stdout
```

---

## Notes

- The endpoint is **public** (no authentication required)
- Responses are cached for **1 hour** (3600 seconds) via `Cache-Control` header
- Only **active recipes** (`is_active = true`) are returned
- If no recipe slots are found, `available_slots` will be an empty array `[]`
- Timestamps are in ISO 8601 format (UTC)
