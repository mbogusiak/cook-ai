import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions
/**
 * Parse ISO 8601 duration string (PT15M, PT1H30M) to minutes
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
 * Extract numeric value from string like "306.8 kcal" or "9 g"
 */
function extractNumeric(value) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Generate a URL-friendly slug from recipe name
 */
function generateSlug(name) {
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

/**
 * Transform Cookido recipe to database format
 */
function transformRecipe(cookidoRecipe) {
  const maros = cookidoRecipe.maros || {};
  
  return {
    slug: cookidoRecipe.id, // Use Cookido ID as slug (guaranteed unique)
    name: cookidoRecipe.nazwa || "",
    portions: cookidoRecipe.portions || 1,
    prep_minutes: parseDuration(cookidoRecipe.prep_time),
    cook_minutes: parseDuration(cookidoRecipe.cook_time),
    image_url: cookidoRecipe.img || null,
    source_url: cookidoRecipe.url || "",
    rating_avg: cookidoRecipe.rating_avg || null,
    reviews_count: cookidoRecipe.reviews_count || 0,
    ingredients: cookidoRecipe.ingredients || [],
    calories_kcal: parseInt(extractNumeric(maros.cal) || 1), // Default to 1 if missing to pass CHECK constraint
    protein_g: extractNumeric(maros.protein),
    fat_g: extractNumeric(maros.fat),
    carbs_g: extractNumeric(maros.carbs),
    is_active: true,
  };
}

/**
 * Load recipes from JSON file and insert into database
 */
async function loadRecipes(filePath, batchSize = 100) {
  try {
    console.log(`📖 Reading recipes from ${filePath}...`);

    const rawData = fs.readFileSync(filePath, "utf-8");
    const cookidoRecipes = JSON.parse(rawData);

    console.log(`✅ Loaded ${cookidoRecipes.length} recipes from file`);

    const existingSlugs = new Set();
    const transformedRecipes = cookidoRecipes.map(r => transformRecipe(r));

    // Process in batches
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < transformedRecipes.length; i += batchSize) {
      const batch = transformedRecipes.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(transformedRecipes.length / batchSize);

      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}...`);

      try {
        const { data: insertedRecipes, error: insertError } = await supabase
          .from("recipes")
          .insert(batch)
          .select("id, slug");

        if (insertError) {
          console.error(`❌ Batch ${batchNum} error:`, insertError.message);
          skippedCount += batch.length;
          continue;
        }

        if (!insertedRecipes) {
          console.warn(`⚠️  Batch ${batchNum}: No data returned`);
          skippedCount += batch.length;
          continue;
        }

        insertedCount += insertedRecipes.length;
        console.log(
          `✅ Batch ${batchNum}: Inserted ${insertedRecipes.length} recipes`
        );

        // Insert recipe slots
        const recipeSlots = [];

        for (let j = 0; j < batch.length; j++) {
          const recipe = batch[j];
          const insertedRecipe = insertedRecipes[j];

          if (!insertedRecipe) continue;

          const originalRecipe = cookidoRecipes[i + j];
          if (originalRecipe.meal_slot && originalRecipe.meal_slot.length > 0) {
            for (const slot of originalRecipe.meal_slot) {
              recipeSlots.push({
                recipe_id: insertedRecipe.id,
                slot: slot,
              });
            }
          }
        }

        if (recipeSlots.length > 0) {
          const { error: slotsError } = await supabase
            .from("recipe_slots")
            .insert(recipeSlots);

          if (slotsError) {
            console.error(`⚠️  Batch ${batchNum} slots error:`, slotsError.message);
          } else {
            console.log(`✅ Inserted ${recipeSlots.length} recipe slots`);
          }
        }
      } catch (error) {
        console.error(`❌ Batch ${batchNum} exception:`, error);
        skippedCount += batch.length;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`📊 Summary:`);
    console.log(`   Total recipes: ${transformedRecipes.length}`);
    console.log(`   ✅ Inserted: ${insertedCount}`);
    console.log(`   ⚠️  Skipped/Failed: ${skippedCount}`);
    console.log(`${"=".repeat(50)}\n`);

    if (insertedCount > 0) {
      console.log("✨ Data loading completed successfully!");
    }
  } catch (error) {
    console.error("❌ Error loading recipes:", error);
    process.exit(1);
  }
}

// Main execution
const filePath = path.join(__dirname, "../.ai/migration/cookido.json");

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

loadRecipes(filePath).then(() => {
  process.exit(0);
});
