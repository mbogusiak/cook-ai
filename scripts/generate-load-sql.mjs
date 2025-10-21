import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse ISO 8601 duration string to minutes
 */
function parseDuration(duration) {
  if (!duration) return null;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + minutes;
}

/**
 * Extract numeric value from string
 */
function extractNumeric(value) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Escape single quotes in SQL strings
 */
function escapeSql(str) {
  if (!str) return null;
  return str.replace(/'/g, "''");
}

/**
 * Convert array to SQL text array literal
 */
function toSqlArray(arr) {
  if (!arr || arr.length === 0) return "'{}'::text[]";
  const escaped = arr.map(item => `E'${escapeSql(item)}'`).join(",");
  return `ARRAY[${escaped}]::text[]`;
}

/**
 * Generate SQL INSERT statements
 */
async function generateSql() {
  const filePath = path.join(__dirname, "../.ai/migration/cookido.json");

  console.log("📖 Reading cookido.json...");
  const rawData = fs.readFileSync(filePath, "utf-8");
  const recipes = JSON.parse(rawData);

  console.log(`✅ Loaded ${recipes.length} recipes`);

  // Build SQL file
  let sql = `-- Auto-generated SQL for loading recipes and recipe_slots
-- Generated: ${new Date().toISOString()}
-- Total recipes: ${recipes.length}

BEGIN TRANSACTION;

-- Clear existing data
DELETE FROM public.recipe_slots;
DELETE FROM public.recipes;

-- Reset sequences
ALTER SEQUENCE public.recipes_id_seq RESTART WITH 1;

-- Insert recipes
`;

  // Generate INSERT statements for recipes
  const recipeInserts = recipes.map((recipe) => {
    const maros = recipe.maros || {};
    const prep = parseDuration(recipe.prep_time);
    const cook = parseDuration(recipe.cook_time);
    const calories = Math.max(1, Math.floor(extractNumeric(maros.cal) || 0));
    const protein = extractNumeric(maros.protein);
    const fat = extractNumeric(maros.fat);
    const carbs = extractNumeric(maros.carbs);

    return `INSERT INTO public.recipes (slug, name, portions, prep_minutes, cook_minutes, image_url, source_url, rating_avg, reviews_count, ingredients, calories_kcal, protein_g, fat_g, carbs_g, is_active) VALUES ('${escapeSql(
      recipe.id
    )}', '${escapeSql(recipe.nazwa)}', ${recipe.portions || 1}, ${prep}, ${cook}, ${
      recipe.img ? `'${escapeSql(recipe.img)}'` : "NULL"
    }, '${escapeSql(recipe.url)}', ${recipe.rating_avg || "NULL"}, ${recipe.reviews_count || 0}, ${toSqlArray(
      recipe.ingredients
    )}, ${calories}, ${protein || "NULL"}, ${fat || "NULL"}, ${carbs || "NULL"}, true);`;
  });

  sql += recipeInserts.join("\n") + "\n";

  // Generate INSERT statements for recipe_slots
  sql += `\n-- Insert recipe slots\n`;
  const slotInserts = [];

  for (const recipe of recipes) {
    if (recipe.meal_slot && Array.isArray(recipe.meal_slot)) {
      for (const slot of recipe.meal_slot) {
        slotInserts.push(
          `INSERT INTO public.recipe_slots (recipe_id, slot) SELECT id, '${slot}' FROM public.recipes WHERE slug = '${escapeSql(recipe.id)}';`
        );
      }
    }
  }

  if (slotInserts.length > 0) {
    sql += slotInserts.join("\n");
  }

  sql += `\n\nCOMMIT;

-- Verify counts
SELECT 'Recipes loaded: ' || COUNT(*) FROM public.recipes;
SELECT 'Recipe slots loaded: ' || COUNT(*) FROM public.recipe_slots;
`;

  // Write to file
  const outputPath = path.join(__dirname, "../load-recipes.sql");
  fs.writeFileSync(outputPath, sql);

  console.log(`✅ Generated SQL file: ${outputPath}`);
  console.log(`   - ${recipeInserts.length} recipe inserts`);
  console.log(`   - ${slotInserts.length} recipe_slot inserts`);
}

generateSql().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
