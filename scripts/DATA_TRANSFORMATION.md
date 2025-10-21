# Data Transformation Reference

This document details how recipe data from `cookido.json` is transformed to match the database schema defined in `db-plan.md`.

## Overview

Each recipe in `cookido.json` becomes:
1. **One row** in the `recipes` table
2. **Multiple rows** in the `recipe_slots` table (one per meal slot)

## Field Mapping

### Basic Fields

| Source | Destination | Type | Logic |
|--------|-------------|------|-------|
| `nazwa` | `name` | TEXT | Direct copy (Polish recipe name) |
| `id` | `slug` | TEXT | Generated from name (see slug generation) |
| `portions` | `portions` | INT | Direct copy, default to 1 if missing |
| `img` | `image_url` | TEXT | Direct copy, NULL if missing |
| `url` | `source_url` | TEXT | Direct copy (Cookido link) |
| `rating_avg` | `rating_avg` | NUMERIC | Direct copy, NULL if missing or 0 |
| `reviews_count` | `reviews_count` | INT | Direct copy, default to 0 if missing |
| `ingredients` | `ingredients` | TEXT[] | Array copy (JSON), default to [] if missing |

### Time Fields

Duration parsing converts ISO 8601 format to minutes:

```
Format: PT[n]H[n]M

Examples:
- PT15M → 15 minutes
- PT1H → 60 minutes
- PT1H30M → 90 minutes
- PT2H15M → 135 minutes
- null → NULL
- "" → NULL
```

| Source | Destination | Parsing |
|--------|-------------|---------|
| `prep_time` | `prep_minutes` | ISO 8601 → minutes |
| `cook_time` | `cook_minutes` | ISO 8601 → minutes |

**Implementation:**
```typescript
function parseDuration(duration?: string): number | null {
  if (!duration) return null;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + minutes;
}
```

### Nutritional Fields

Nutrition extraction removes units and parses numbers:

```
Input: "306.8 kcal", "9 g", "17.3 g", "32 g"
Output: 306.8, 9, 17.3, 32
```

| Source | Destination | Unit | Format | Logic |
|--------|-------------|------|--------|-------|
| `maros.cal` | `calories_kcal` | kcal | "123.4 kcal" | Extract number, default 0 if missing |
| `maros.protein` | `protein_g` | g | "9 g" | Extract number, NULL if missing |
| `maros.fat` | `fat_g` | g | "17.3 g" | Extract number, NULL if missing |
| `maros.carbs` | `carbs_g` | g | "32 g" | Extract number, NULL if missing |

**Implementation:**
```typescript
function extractNumeric(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}
```

### Slug Generation

The `slug` field is generated from the recipe name and must be:
- Unique across all recipes
- URL-safe (only alphanumeric and hyphens)
- Human-readable
- Case-insensitive
- Accent-insensitive

**Process:**
1. Convert to lowercase
2. Remove accents/diacritics (ą→a, ć→c, etc.)
3. Remove special characters (but keep spaces)
4. Replace spaces with hyphens
5. Remove consecutive hyphens
6. Limit to 100 characters

**Examples:**
```
Śródziemnomorska sałatka ziemniaczana
→ srodziemnomorska-salatka-ziemniaczana

Purée ziemniaczane
→ puree-ziemniaczane

Pieczone marchewki z miętą i tymiankiem
→ pieczone-marchewki-z-mieta-i-tymiankiem
```

**Implementation:**
```typescript
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .slice(0, 100); // Limit length
}
```

## Related Tables

### Meal Slots

The `meal_slot` array from Cookido creates multiple rows in `recipe_slots`:

**Input:**
```json
{
  "id": "494b10be-bed1-401f-bc64-ad25627b1f60",
  "nazwa": "Śródziemnomorska sałatka ziemniaczana",
  "meal_slot": ["dinner", "snack"]
}
```

**Output:**
```sql
INSERT INTO recipe_slots (recipe_id, slot) VALUES
  (12345, 'dinner'),
  (12345, 'snack');
```

**Constraints:**
- Must be one of: `breakfast`, `lunch`, `dinner`, `snack`
- Primary key: (`recipe_id`, `slot`)
- Recipe can appear in multiple slots
- If `meal_slot` is empty or null, no slot records created

## Data Quality Handling

### Missing or Invalid Data

| Field | Missing Behavior | Invalid Behavior |
|-------|------------------|------------------|
| `calories_kcal` | Default to 0 | Parse attempt, fallback to 0 |
| `prep_minutes` | Set to NULL | Skip parsing, set to NULL |
| `cook_minutes` | Set to NULL | Skip parsing, set to NULL |
| `rating_avg` | Set to NULL | Skip parsing, set to NULL |
| `image_url` | Set to NULL | Direct use (may result in 404) |
| `ingredients` | Empty array [] | Direct use |
| `meal_slot` | No rows created | Skip invalid values |
| `protein_g`, `fat_g`, `carbs_g` | Set to NULL | Parse attempt, set to NULL on failure |

### Edge Cases

1. **Accented Characters**
   - Normalized to ASCII equivalents
   - Example: `ł` → `l`, `ę` → `e`

2. **HTML Entities in Ingredients**
   - Kept as-is (database stores raw values)
   - Example: `&frac12;` (½) remains in database

3. **Very Long Names**
   - Stored in full in `name` field
   - Slug truncated to 100 characters

4. **Zero or Negative Portions**
   - Treated as 1 (database CHECK constraint)

5. **Missing Meal Slots**
   - Recipe exists in `recipes` but no `recipe_slots` entries
   - Recipe cannot be used in meal plans (FK constraint)

## Batch Processing

Data is loaded in batches to:
- Minimize network requests
- Handle large datasets efficiently
- Provide progress updates
- Enable partial recovery from failures

**Default batch size:** 100 recipes per transaction

**Process per batch:**
1. Validate all recipes transform without errors
2. Insert recipes batch into `recipes` table
3. Get returned recipe IDs
4. Create slot mappings for each inserted recipe
5. Insert all slots into `recipe_slots` table
6. Log results and continue to next batch

## Performance Considerations

### Indexes
The following indexes speed up common queries:

```sql
-- recipes table
CREATE UNIQUE INDEX idx_recipes_slug ON recipes(slug);
CREATE INDEX idx_recipes_calories ON recipes(calories_kcal);
CREATE INDEX idx_recipes_name ON recipes USING gin(name gin_trgm_ops);

-- recipe_slots table
CREATE UNIQUE INDEX idx_recipe_slots_id_slot ON recipe_slots(recipe_id, slot);
```

### Estimated Metrics
- **File size:** ~150-200 MB (312k recipes)
- **Batch time:** ~500-1000ms per 100 recipes
- **Total time:** 5-10 minutes for full load
- **Database size:** ~500 MB-1 GB

## Validation Rules

After transformation, each recipe must satisfy:

```sql
-- recipes table constraints
CHECK (portions >= 1)
CHECK (prep_minutes IS NULL OR prep_minutes > 0)
CHECK (cook_minutes IS NULL OR cook_minutes > 0)
CHECK (calories_kcal > 0)
CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5))
CHECK (reviews_count >= 0)
UNIQUE (slug)

-- recipe_slots constraints
FOREIGN KEY (recipe_id) REFERENCES recipes(id)
CHECK (slot IN ('breakfast', 'lunch', 'dinner', 'snack'))
UNIQUE (recipe_id, slot)
```

## Example Transformation

### Input (cookido.json)
```json
{
  "id": "494b10be-bed1-401f-bc64-ad25627b1f60",
  "nazwa": "Śródziemnomorska sałatka ziemniaczana",
  "img": "https://assets.tmecosys.com/.../image.jpg",
  "prep_time": "PT15M",
  "cook_time": "PT55M",
  "portions": 6,
  "preparation": [...],
  "ingredients": [
    "40 g migdałów",
    "5 g natki pietruszki"
  ],
  "url": "https://cookidoo.pl/recipes/recipe/pl/r782728",
  "rating_avg": 4.8,
  "reviews_count": 510,
  "maros": {
    "cal": "306.8 kcal",
    "protein": "9 g",
    "fat": "17.3 g",
    "carbs": "32 g"
  },
  "meal_slot": ["dinner", "snack"]
}
```

### Output (recipes table)
```sql
INSERT INTO recipes (
  slug, name, portions, prep_minutes, cook_minutes, image_url,
  source_url, rating_avg, reviews_count, ingredients, calories_kcal,
  protein_g, fat_g, carbs_g, is_active, created_at, updated_at
) VALUES (
  'srodziemnomorska-salatka-ziemniaczana',
  'Śródziemnomorska sałatka ziemniaczana',
  6,
  15,
  55,
  'https://assets.tmecosys.com/.../image.jpg',
  'https://cookidoo.pl/recipes/recipe/pl/r782728',
  4.8,
  510,
  '["40 g migdałów","5 g natki pietruszki"]'::TEXT[],
  306,
  9.0,
  17.3,
  32.0,
  TRUE,
  NOW(),
  NOW()
);
```

### Output (recipe_slots table)
```sql
INSERT INTO recipe_slots (recipe_id, slot) VALUES
  (1, 'dinner'),
  (1, 'snack');
```

## Debugging Tips

### View Transformation Results

```typescript
// In load-recipes.ts, add before insert:
console.log(JSON.stringify(transformedRecipes[0], null, 2));
```

### Check for Duplicate Slugs

```sql
SELECT slug, COUNT(*) as count FROM recipes 
GROUP BY slug HAVING COUNT(*) > 1
LIMIT 10;
```

### Verify Parsing

```typescript
// Test individual functions
console.log(parseDuration("PT1H30M")); // Should be 90
console.log(extractNumeric("306.8 kcal")); // Should be 306.8
console.log(generateSlug("Śródziemnomorska sałatka")); // Should be formatted
```
