# 🚀 Quick Start: Loading Recipe Data

This guide walks you through loading 7,087 Polish recipes from Cookido into your database.

## ⏱️ 5-Minute Setup

### 1. Get Supabase Credentials

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **Service Role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Create `.env` File

In the project root, create `.env`:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Load Data

Choose your preferred language:

**TypeScript/Node.js:**
```bash
npm run load-recipes
```

**Python:**
```bash
pip install python-supabase python-dotenv
npm run load-recipes:python
```

## 📊 What Gets Loaded

### `recipes` Table (7,087 rows)
- ✅ Recipe name, portions, prep/cook time
- ✅ Image URLs and Cookido links
- ✅ Ratings and review counts
- ✅ Ingredients list (JSON array)
- ✅ Nutritional info: calories, protein, fat, carbs

### `recipe_slots` Table (~14,000 rows)
- ✅ Meal slot associations (breakfast, lunch, dinner, snack)
- ✅ Links recipes to allowed meal categories

## ⚙️ What Happens Behind the Scenes

```
cookido.json → Parse JSON → Transform to DB schema → Batch insert
                                ↓
                        Polish recipe names
                        Parse durations (PT15M → 15 min)
                        Extract nutrition numbers
                        Generate URL slugs
                        Organize meal categories
```

## 🎯 Expected Results

```
📖 Reading recipes from cookido.json...
✅ Loaded 7087 recipes from file

📦 Processing batch 1/71...
✅ Batch 1: Inserted 100 recipes
✅ Inserted ~200 recipe slots

... (batches 2-70) ...

==================================================
📊 Summary:
   Total recipes: 7087
   ✅ Inserted: 7087
   ⚠️  Skipped/Failed: 0
==================================================

✨ Data loading completed successfully!
```

**Estimated time:** 1-2 minutes for full dataset

## ⚠️ Troubleshooting

### Error: "Missing SUPABASE_URL"
- **Fix:** Create `.env` file with correct credentials
- See `scripts/ENV_SETUP.md` for details

### Error: "File not found"
- **Fix:** Ensure `cookido.json` exists at `.ai/migration/cookido.json`

### Duplicate slug errors
- **Cause:** Re-running script on already-loaded data
- **Fix:** Delete old records first, then re-run

### Script runs very slowly
- **Check:** Internet connection, database size
- **Try:** Reduce batch size in script (change `batch_size: 100` to `50`)

## 🔧 Advanced Usage

### Use Different Batch Size

**TypeScript:**
```typescript
// In load-recipes.ts, change:
await loadRecipes(filePath, 50);  // 50 recipes per batch
```

**Python:**
```python
# In load-recipes.py, change:
load_recipes(str(file_path), batch_size=50)
```

### Just Process Specific Recipes

```bash
# Get first 1000 recipes only
head -n 1000 .ai/migration/cookido.json > small-batch.json
# Then modify script to use small-batch.json
```

### Check Import Status

```sql
SELECT COUNT(*) FROM recipes;
SELECT COUNT(*) FROM recipe_slots;
```

## 📚 More Information

- **Full Documentation:** See `scripts/README.md`
- **Environment Setup:** See `scripts/ENV_SETUP.md`
- **Database Schema:** See `.ai/db-plan.md`
- **Migration Files:** See `supabase/migrations/`

## ✅ Verification Checklist

After loading completes:

- [ ] No error messages in console
- [ ] Summary shows "0" skipped/failed
- [ ] Can query recipes: `SELECT COUNT(*) FROM recipes`
- [ ] Can query slots: `SELECT COUNT(*) FROM recipe_slots`
- [ ] Recipes appear in your API
- [ ] Frontend can display recipe listings

## 🎉 Success!

Your database now contains:
- 7,087 Polish recipes
- Complete nutritional information
- Multiple meal slot categories per recipe
- Links back to Cookido sources
- Professional recipe images

Ready to build your meal planning app! 🍽️
