# Data Loading Scripts

This directory contains scripts for loading recipe data from the Cookido dataset into the database.

## Overview

The `cookido.json` file contains 7,087 Polish recipes exported from Cookido with the following information:
- Recipe metadata (name, portions, timings)
- Ingredients list
- Preparation instructions
- Nutritional information (calories, protein, fat, carbs)
- Ratings and reviews count
- Meal slot categories (breakfast, lunch, dinner, snack)
- Source URL and images

## Scripts

### `load-recipes.ts` - TypeScript/Node.js Loader

**Requirements:**
- Node.js 18+
- Environment variables configured:
  - `PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key with write access

**Usage:**

```bash
# Install dependencies (if not already installed)
npm install dotenv @supabase/supabase-js

# Run the script
npx ts-node scripts/load-recipes.ts
```

**Features:**
- ✅ Batch processing (100 recipes per batch by default)
- ✅ ISO 8601 duration parsing (e.g., "PT15M" → 15 minutes)
- ✅ Nutritional data extraction (handles units like "kcal", "g")
- ✅ URL-friendly slug generation from recipe names
- ✅ Automatic recipe_slots insertion for meal categories
- ✅ Error handling with detailed logging
- ✅ Progress tracking and summary statistics

**What it does:**
1. Reads `cookido.json` from `.ai/migration/`
2. Transforms each recipe to match database schema
3. Inserts recipes in batches into the `recipes` table
4. Creates corresponding meal slot entries in `recipe_slots` table
5. Provides detailed progress and error reporting

**Example output:**
```
📖 Reading recipes from /path/to/cookido.json...
✅ Loaded 7087 recipes from file

📦 Processing batch 1/71...
✅ Batch 1: Inserted 100 recipes
✅ Inserted ~200 recipe slots

...

==================================================
📊 Summary:
   Total recipes: 7087
   ✅ Inserted: 7087
   ⚠️  Skipped/Failed: 0
==================================================

✨ Data loading completed successfully!
```

## Data Transformation

### Recipe Metadata Mapping

| Cookido Field | Database Field | Transformation |
|---------------|----------------|-----------------|
| `nazwa` | `name` | Direct copy |
| `id` (UUID) | `slug` | Generated from name (URL-friendly) |
| `portions` | `portions` | Direct copy or default 1 |
| `prep_time` | `prep_minutes` | ISO 8601 duration to minutes |
| `cook_time` | `cook_minutes` | ISO 8601 duration to minutes |
| `img` | `image_url` | Direct copy or null |
| `url` | `source_url` | Direct copy |
| `rating_avg` | `rating_avg` | Direct copy or null |
| `reviews_count` | `reviews_count` | Direct copy or default 0 |
| `ingredients` | `ingredients` | Array copy (JSON) |
| `maros.cal` | `calories_kcal` | Extract number or default 0 |
| `maros.protein` | `protein_g` | Extract number or null |
| `maros.fat` | `fat_g` | Extract number or null |
| `maros.carbs` | `carbs_g` | Extract number or null |
| `meal_slot` | `recipe_slots.slot` | Create child records |

### Example Transformations

**Duration parsing:**
- `PT15M` → 15 minutes
- `PT1H30M` → 90 minutes
- `PT2H` → 120 minutes

**Nutritional extraction:**
- `"306.8 kcal"` → 306.8
- `"9 g"` → 9
- `"17.3 g"` → 17.3

**Slug generation:**
- `"Śródziemnomorska sałatka ziemniaczana"` → `srodziemnomorska-salatka-ziemniaczana`
- Removes accents, special characters, converts to lowercase, replaces spaces with hyphens

## Database Schema

### `recipes` table
- Stores recipe metadata, nutritional info, and sourcing
- `slug` is unique for de-duplication
- `is_active` defaults to true for all imported recipes

### `recipe_slots` table
- Maps recipes to allowed meal categories
- Each record links `recipe_id` to `slot` (breakfast, lunch, dinner, snack)
- Supports multiple meal slots per recipe (e.g., a recipe can be both breakfast and dinner)

## Performance

- **Batch size:** 100 recipes per database transaction (configurable)
- **Processing time:** ~30-60 seconds for full dataset (7,087 recipes)
- **Network:** Uses batched inserts to minimize API calls
- **Error recovery:** Failed batches are logged but don't stop the entire process

## Troubleshooting

### "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
- Ensure your `.env` file contains both variables
- Use `SUPABASE_SERVICE_ROLE_KEY`, not the public API key

### "Column X does not exist"
- Verify that your database schema matches the migration file
- Run migrations: `supabase migration up`

### Duplicate slug errors
- The script uses `generateSlug()` which may create duplicates for similarly-named recipes
- To retry: Delete imported records and re-run the script

### Memory issues
- 7,087 recipes require minimal memory (~50-100 MB)
- No special considerations needed for this dataset size

## Database Constraints

Before running the script, ensure these constraints are in place:
- `recipes.slug` UNIQUE
- `recipes.portions` CHECK (portions >= 1)
- `recipes.calories_kcal` NOT NULL CHECK (calories_kcal > 0)
- `recipe_slots` UNIQUE (`recipe_id`, `slot`)
- `recipe_slots.slot` ENUM CHECK against valid meal_slot values
