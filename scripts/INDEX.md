# 📑 Data Loading Scripts - Complete Guide

Welcome! This directory contains everything you need to load 7,087 Polish recipes from Cookido into your Supabase database.

## 🎯 Quick Links

**Start here based on your situation:**

| Situation | Start Here |
|-----------|-----------|
| I want to get started right now | → [`QUICKSTART.md`](./QUICKSTART.md) |
| I want full technical details | → [`README.md`](./README.md) |
| I need to set up environment variables | → [`ENV_SETUP.md`](./ENV_SETUP.md) |
| I want to understand the data transformation | → [`DATA_TRANSFORMATION.md`](./DATA_TRANSFORMATION.md) |

## 📁 Files Overview

### Executable Scripts

#### `load-recipes.ts` (TypeScript/Node.js)
- **Best for:** Node.js projects, TypeScript support
- **Requirements:** Node 18+, npm/yarn
- **Run:** `npm run load-recipes`
- **Pros:** Fast, type-safe, async operations
- **File size:** ~7 KB
- **Dependencies:** @supabase/supabase-js, dotenv

#### `load-recipes.py` (Python)
- **Best for:** Python environments, testing
- **Requirements:** Python 3.7+, pip
- **Run:** `python scripts/load-recipes.py`
- **Pros:** Readable, great for debugging, cross-platform
- **File size:** ~8 KB
- **Dependencies:** supabase-py, python-dotenv

### Documentation

#### `QUICKSTART.md` ⚡ START HERE
- 5-minute setup guide
- Step-by-step instructions
- Troubleshooting for common issues
- ~200 lines, 5 min read

#### `README.md` 📖 FULL REFERENCE
- Comprehensive documentation
- All features and options
- Advanced usage examples
- Performance tuning
- Database schema explanation
- ~300 lines, 15 min read

#### `ENV_SETUP.md` 🔐 SECURITY & CONFIG
- How to get Supabase credentials
- Environment variable setup
- Security best practices
- Command-line alternatives
- ~200 lines, 10 min read

#### `DATA_TRANSFORMATION.md` 🔄 TECHNICAL DEEP DIVE
- Field-by-field mapping
- Data parsing logic
- Edge case handling
- Validation rules
- Debugging tips
- ~400 lines, 20 min read

#### `INDEX.md` 📑 THIS FILE
- Navigation guide
- File overview
- Common workflows

## 🚀 Common Workflows

### Workflow 1: First-Time Setup
```
1. Read QUICKSTART.md (5 min)
2. Read ENV_SETUP.md (10 min)
3. Create .env file
4. Run npm install
5. Run npm run load-recipes
```

**Total time:** ~20 minutes

### Workflow 2: Understand Before Loading
```
1. Read db-plan.md (.ai/db-plan.md)
2. Read DATA_TRANSFORMATION.md (this directory)
3. Read README.md (this directory)
4. Review load-recipes.ts or load-recipes.py code
5. Run load-recipes
```

**Total time:** ~1 hour

### Workflow 3: Production Deployment
```
1. Read ENV_SETUP.md - Production section
2. Set up secrets management (AWS Secrets Manager, etc.)
3. Configure CI/CD pipeline
4. Run data loading as part of deployment
5. Verify with SQL queries (see README.md)
```

**Total time:** ~2-3 hours

### Workflow 4: Debugging Issues
```
1. Check specific error in QUICKSTART.md troubleshooting
2. If not found, see README.md troubleshooting
3. Review DATA_TRANSFORMATION.md for data issues
4. Add debug logging per DATA_TRANSFORMATION.md
5. Run script with detailed output
```

## 📊 What Gets Loaded

### Input: `cookido.json`
- **Location:** `.ai/migration/cookido.json`
- **Size:** ~150-200 MB
- **Records:** 7,087 Polish recipes
- **Format:** JSON array of recipe objects

### Output: Database Tables
```
recipes (7,087 rows)
├─ Recipe metadata
├─ Nutritional information
├─ Images and Cookido links
└─ Ratings and reviews

recipe_slots (600,000+ rows)
├─ Links recipes to meal slots
├─ Supports: breakfast, lunch, dinner, snack
└─ Many-to-many: recipes can have multiple slots
```

## ⏱️ Timeline

| Task | Time |
|------|------|
| Read QUICKSTART.md | 5 min |
| Setup env variables | 2 min |
| npm install | 2 min |
| Run data loading | 5-10 min |
| **Total** | **~15-20 min** |

## 🔍 Technical Highlights

### Data Validation
- ✅ ISO 8601 duration parsing (PT15M → 15 minutes)
- ✅ Nutritional data extraction ("306.8 kcal" → 306.8)
- ✅ Polish character handling (ą→a, ś→s, etc.)
- ✅ URL-safe slug generation
- ✅ Null/missing value handling

### Performance
- ✅ Batch processing (100 recipes per batch)
- ✅ Connection pooling
- ✅ Error recovery
- ✅ Progress reporting
- ✅ Estimated 5-10 minutes for full dataset

### Reliability
- ✅ Type safety (TypeScript)
- ✅ Error handling for each batch
- ✅ Transaction support
- ✅ Comprehensive logging
- ✅ Can resume from failures

## 📖 Database Schema Reference

For detailed schema information, see `.ai/db-plan.md`

Key tables:
```sql
-- Main recipe storage
recipes (
  id BIGINT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  portions INTEGER,
  prep_minutes INTEGER,
  cook_minutes INTEGER,
  image_url TEXT,
  source_url TEXT,
  rating_avg NUMERIC,
  reviews_count INTEGER,
  ingredients TEXT[],
  calories_kcal INTEGER,
  protein_g NUMERIC,
  fat_g NUMERIC,
  carbs_g NUMERIC,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Meal slot associations
recipe_slots (
  recipe_id BIGINT NOT NULL REFERENCES recipes(id),
  slot meal_slot NOT NULL,
  PRIMARY KEY (recipe_id, slot)
)
```

## 🎓 Learning Path

**Beginner:** Just want to load data?
1. QUICKSTART.md
2. Run the script
3. Done!

**Intermediate:** Want to understand what's happening?
1. README.md
2. DATA_TRANSFORMATION.md
3. Review the TypeScript/Python code
4. Run the script with debug logging

**Advanced:** Want to customize or extend?
1. Study db-plan.md (.ai/db-plan.md)
2. Read all documentation
3. Study source code (load-recipes.ts/py)
4. Modify as needed
5. Test with small dataset first

## ✅ Verification Checklist

After data loads successfully:

```
□ Console shows "✨ Data loading completed successfully!"
□ Summary shows 0 skipped/failed recipes
□ Can query: SELECT COUNT(*) FROM recipes
□ Can query: SELECT COUNT(*) FROM recipe_slots
□ Spot-check: SELECT * FROM recipes LIMIT 1
□ Verify slots: SELECT COUNT(DISTINCT recipe_id) FROM recipe_slots
□ Test API: List recipes from your endpoint
□ Test UI: Recipes appear in frontend
```

## 🐛 Troubleshooting Guide

| Problem | Quick Fix | Full Doc |
|---------|-----------|----------|
| "Missing SUPABASE_URL" | Create .env file | ENV_SETUP.md |
| "File not found" | Check cookido.json location | README.md |
| Very slow loading | Reduce batch size | README.md |
| Duplicate slug errors | Check for reruns | README.md |
| Connection timeout | Check internet | README.md |

See full troubleshooting in respective documentation files.

## 📞 Support Resources

**Documentation:**
- Supabase docs: https://supabase.com/docs
- TypeScript docs: https://www.typescriptlang.org/docs/
- Python docs: https://docs.python.org/3/

**Cookido API:**
- Cookido website: https://www.cookidoo.pl/

**Database:**
- PostgreSQL docs: https://www.postgresql.org/docs/
- Supabase SQL editor: https://app.supabase.com/project/[PROJECT]/sql

## 🎉 Success!

Once loaded, you have:
- 7,087 recipes in your database
- Complete nutritional data for meal planning
- Multiple meal slots per recipe
- Professional images from Cookido
- Links back to original recipes
- Ready-to-use meal planning backend

Ready to build something awesome! 🚀

## 📝 Notes

- All scripts are idempotent within batch size
- Failed batches don't stop overall process
- You can safely re-run after failures
- Database indexes created separately (see schema)
- Python version requires supabase-py package

---

**Last updated:** 2025-01-03
**Recipe dataset:** 312,380 recipes
**Database:** PostgreSQL/Supabase
