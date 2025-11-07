import * as dotenv from "dotenv";
import * as path from "node:path";
import { seedE2EData } from "./utils/seed";

/**
 * Playwright Global Setup
 * Runs once before all tests
 *
 * This script:
 * 1. Loads environment variables from .env.e2e
 * 2. Cleans up existing test data
 * 3. Seeds baseline test data (user settings + 7-day plan)
 */
async function globalSetup() {
  process.stdout.write("\n" + "=".repeat(60) + "\n");
  process.stdout.write("🚀 Playwright Global Setup - E2E Test Data Seeding\n");
  process.stdout.write("=".repeat(60) + "\n\n");

  // Ensure .env.e2e is loaded and overrides any existing env vars
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.e2e"),
    override: true,
  });

  // Verify required environment variables
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_PUBLIC_KEY", "E2E_USERNAME_ID", "E2E_USERNAME", "E2E_PASSWORD"];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables in .env.e2e: ${missingVars.join(", ")}`);
  }

  try {
    // Seed the baseline test data
    // Skip plan creation if E2E_SKIP_PLAN_SEED is set (for onboarding tests)
    const skipPlanSeed = process.env.E2E_SKIP_PLAN_SEED === "true";
    const { planId } = await seedE2EData(skipPlanSeed);

    if (!skipPlanSeed) {
      // Store plan ID for tests to reference
      process.env.E2E_BASELINE_PLAN_ID = planId.toString();
      console.log("\n" + "=".repeat(60));
      console.log("✅ Global Setup Complete - Tests can now run");
      console.log(`📋 Baseline Plan ID: ${planId}`);
      console.log("=".repeat(60) + "\n");
    } else {
      console.log("\n" + "=".repeat(60));
      console.log("✅ Global Setup Complete - Plan seed skipped");
      console.log("=".repeat(60) + "\n");
    }
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ Global Setup Failed");
    console.error("=".repeat(60));
    console.error(error);
    throw error;
  }
}

export default globalSetup;
