# REST API Plan

## 1. Resources

- **recipes** - Recipe data from Cookido platform (recipes table)
- **user-settings** - User preferences and defaults (user_settings table)
- **plans** - Meal plans created by users (plans table)
- **plan-days** - Individual days within a plan (plan_days table)
- **plan-meals** - Individual meals within a plan (plan_meals table)

## 2. Endpoints

### Authentication
Authentication is handled by Supabase Auth with Google/Facebook OAuth providers. No custom auth endpoints needed.

### Recipes

#### GET /api/recipes
**Description**: Search and filter recipes for meal planning
**Query Parameters**:
- `slot` (optional): Filter recipes **available for** meal slot (breakfast, lunch, dinner, snack)
- `min_calories` (optional): Minimum calories per serving
- `max_calories` (optional): Maximum calories per serving
- `search` (optional): Search by recipe name
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "slug": "healthy-breakfast-bowl",
      "name": "Healthy Breakfast Bowl",
      "available_slots": ["breakfast", "lunch"],
      "calories_per_serving": 350,
      "servings": 1,
      "time_minutes": 15,
      "image_url": "https://example.com/image.jpg",
      "source_url": "https://cookido.com/recipe/123"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 400 Bad Request (invalid parameters), 500 Internal Server Error

#### GET /api/recipes/{id}
**Description**: Get specific recipe details
**Response**:
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

**Success Codes**: 200 OK
**Error Codes**: 404 Not Found, 500 Internal Server Error

### User Settings

#### GET /api/user-settings
**Description**: Get current user's settings
**Response**:
```json
{
  "data": {
    "user_id": "uuid-here",
    "default_daily_calories": 2000,
    "default_plan_length_days": 7,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 404 Not Found (no settings yet), 401 Unauthorized, 500 Internal Server Error

#### POST /api/user-settings
**Description**: Create user settings (first time setup)
**Request Body**:
```json
{
  "default_daily_calories": 2000,
  "default_plan_length_days": 7
}
```

**Response**:
```json
{
  "data": {
    "user_id": "uuid-here",
    "default_daily_calories": 2000,
    "default_plan_length_days": 7,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Success Codes**: 201 Created
**Error Codes**: 400 Bad Request (validation errors), 401 Unauthorized, 409 Conflict (settings already exist), 500 Internal Server Error

#### PATCH /api/user-settings
**Description**: Update user settings
**Request Body**:
```json
{
  "default_daily_calories": 2200,
  "default_plan_length_days": 14
}
```

**Response**: Same as POST response with 200 OK
**Success Codes**: 200 OK
**Error Codes**: 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

### Plans

#### GET /api/plans
**Description**: Get user's plans
**Query Parameters**:
- `state` (optional): Filter by plan state (active, archived, cancelled)
- `limit` (optional): Number of results (default: 10, max: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid-here",
      "state": "active",
      "start_date": "2024-01-15",
      "end_date": "2024-01-21",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0,
    "has_more": false
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 401 Unauthorized, 500 Internal Server Error

#### POST /api/plans/generate
**Description**: Generate a new meal plan
**Request Body**:
```json
{
  "daily_calories": 2000,
  "plan_length_days": 7,
  "start_date": "2024-01-15"
}
```

**Response**:
```json
{
  "data": {
    "id": 1,
    "user_id": "uuid-here",
    "state": "active",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Success Codes**: 201 Created
**Error Codes**: 400 Bad Request (validation errors), 401 Unauthorized, 409 Conflict (active plan exists), 500 Internal Server Error

#### GET /api/plans/{id}
**Description**: Get specific plan details with all days and meals
**Response**:
```json
{
  "data": {
    "id": 1,
    "user_id": "uuid-here",
    "state": "active",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "days": [
      {
        "id": 1,
        "date": "2024-01-15",
        "meals": [
          {
            "id": 1,
            "slot": "breakfast",
            "status": "planned",
            "calories_planned": 400,
            "portion_multiplier": 1.0,
            "multi_portion_group_id": null,
            "is_leftover": false,
            "recipe": {
              "id": 1,
              "name": "Healthy Breakfast Bowl",
              "image_url": "https://example.com/image.jpg",
              "time_minutes": 15,
              "source_url": "https://cookido.com/recipe/123",
              "available_slots": ["breakfast", "lunch"]
            }
          }
        ]
      }
    ],
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

#### PATCH /api/plans/{id}
**Description**: Update plan state (archive, cancel)
**Request Body**:
```json
{
  "state": "archived"
}
```

**Response**:
```json
{
  "data": {
    "id": 1,
    "user_id": "uuid-here",
    "state": "archived",
    "start_date": "2024-01-15",
    "end_date": "2024-01-21",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

### Plan Days

#### GET /api/plans/{plan_id}/days/{date}
**Description**: Get specific day from plan with all meals
**Response**:
```json
{
  "data": {
    "id": 1,
    "plan_id": 1,
    "date": "2024-01-15",
    "meals": [
      {
        "id": 1,
        "slot": "breakfast",
        "status": "planned",
        "calories_planned": 400,
        "portion_multiplier": 1.0,
        "multi_portion_group_id": null,
        "is_leftover": false,
        "recipe": {
          "id": 1,
          "name": "Healthy Breakfast Bowl",
          "image_url": "https://example.com/image.jpg",
          "time_minutes": 15,
          "source_url": "https://cookido.com/recipe/123",
          "available_slots": ["breakfast", "lunch"]
        }
      }
    ],
    "slot_targets": [
      {
        "slot": "breakfast",
        "calories_target": 400
      }
    ]
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

### Plan Meals

#### PATCH /api/plan-meals/{id}
**Description**: Update meal status (completed, skipped)
**Request Body**:
```json
{
  "status": "completed"
}
```

**Response**:
```json
{
  "data": {
    "id": 1,
    "slot": "breakfast",
    "status": "completed",
    "calories_planned": 400,
    "portion_multiplier": 1.0,
    "multi_portion_group_id": null,
    "is_leftover": false,
    "recipe_id": 1,
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

#### GET /api/plan-meals/{id}/alternatives
**Description**: Get alternative recipes for meal swapping
**Response**:
```json
{
  "data": [
    {
      "id": 2,
      "name": "Alternative Breakfast",
      "available_slots": ["breakfast", "lunch"],
      "calories_per_serving": 380,
      "servings": 1,
      "time_minutes": 12,
      "image_url": "https://example.com/image2.jpg",
      "source_url": "https://cookido.com/recipe/456"
    }
  ]
}
```

**Success Codes**: 200 OK
**Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

#### POST /api/plan-meals/{id}/swap
**Description**: Swap meal with alternative recipe
**Request Body**:
```json
{
  "new_recipe_id": 2
}
```

**Response**:
```json
{
  "data": {
    "updated_meals": [
      {
        "id": 1,
        "slot": "lunch",
        "status": "planned",
        "calories_planned": 600,
        "portion_multiplier": 0.5,
        "multi_portion_group_id": "uuid-group",
        "is_leftover": false,
        "recipe_id": 2
      }
    ]
  }
}
```

**Success Codes**: 200 OK
**Error Codes**: 400 Bad Request (invalid recipe for slot/calories), 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

## 3. Authentication and Authorization

### Authentication
- **Method**: Supabase Auth with OAuth providers (Google, Facebook)
- **Implementation**: Client-side authentication using Supabase Auth SDK
- **Session Management**: JWT tokens managed by Supabase Auth
- **No guest mode**: All endpoints require authenticated user

### Authorization
- **Method**: Row Level Security (RLS) policies in Supabase
- **User Isolation**: All user data filtered by `auth.uid()` in RLS policies
- **Resource Access**: Users can only access their own plans, meals, and settings
- **Recipe Access**: Public read-only access to recipes table

## 4. Validation and Business Logic

### Validation Rules
- **Daily Calories**: Must be positive integer > 0
- **Plan Length**: Must be between 1-31 days
- **Date Range**: End date must be >= start date
- **Portion Multiplier**: Must be > 0, max 2 decimal places
- **Meal Status**: Must be one of: planned, completed, skipped
- **Plan State**: Must be one of: active, archived, cancelled
- **Meal Slot**: Must be one of: breakfast, lunch, dinner, snack
- **Recipe Available Slots**: Each recipe must have at least one slot in `available_slots` array; when filtering by slot, only recipes with that slot in `available_slots` are returned

### Business Logic Implementation

#### Plan Generation Logic
1. **Calorie Distribution**: Split daily calories as 20% breakfast, 30% lunch, 30% dinner, 20% snack
2. **Recipe Selection**: Find recipes where the target slot is included in `available_slots` and calories are within ±20% of slot target calories
3. **Multi-portion Handling**: 
   - If lunch/dinner recipe has >1 serving, schedule same meal next day
   - Mark first day as cooking day, second day as leftover
4. **Uniqueness**: Avoid repeating recipes within same plan (except multi-portion pairs)
5. **Slot Flexibility**: Same recipe can be scheduled in different slots on different days:
   - Example: A salad recipe with `available_slots: ["lunch", "dinner", "snack"]` can be used as lunch on day 1 and as dinner on day 5
   - Slot selection is determined by calorie requirements and availability for each specific meal slot during plan generation

#### Meal Swapping Logic
1. **Alternative Selection**: Find up to 3 recipes that:
   - Include the current slot in their `available_slots`
   - Match calorie criteria (±20% of current slot target)
   - Have not been used elsewhere in the plan
2. **Multi-portion Group Handling**:
   - Swapping day 1 (cooking): Remove day 2 leftover and generate new unique meal for that slot
   - Swapping day 2 (leftover): No impact on day 1, generate new unique meal for day 2
3. **Calorie Consistency**: Maintain daily calorie targets after swap

#### Plan Completion
- **Definition**: Plan completed when ≥90% of meals marked as "completed"
- **Calculation**: (completed_meals / total_meals) * 100 >= 90


#### Error Handling
- **Validation Errors**: Return 400 with detailed field-level error messages
- **Business Rule Violations**: Return 422 with explanation
- **Rate Limit Exceeded**: Return 429 with retry-after header
- **Server Errors**: Return 500 with generic error message, log details server-side
