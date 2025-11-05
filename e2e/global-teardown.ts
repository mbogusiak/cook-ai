import * as dotenv from "dotenv";
import * as path from "node:path";
import { cleanupTestData, createAuthenticatedClient } from "./utils/seed";

/**
 * Playwright Global Teardown
 * Runs once after all tests complete
 *
 * This script optionally cleans up test data.
 * Set E2E_CLEANUP=true in .env.test to enable cleanup after tests.
 * By default, data is left for debugging purposes.
 */
async function globalTeardown() {
  console.log("\n" + "=".repeat(60));
  console.log("🧹 Playwright Global Teardown");
  console.log("=".repeat(60) + "\n");

  // Ensure .env.test is loaded and overrides any existing env vars
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.test"),
    override: true
  });

  const shouldCleanup = process.env.E2E_CLEANUP === "true";

  if (!shouldCleanup) {
    console.log(
      "ℹ️  Skipping cleanup (E2E_CLEANUP not set to 'true' in .env.test)",
    );
    console.log("   Test data will remain in database for debugging");
    console.log("\n" + "=".repeat(60) + "\n");
    return;
  }

  try {
    console.log("🗑️  Cleaning up test data...\n");

    const supabase = await createAuthenticatedClient();
    await cleanupTestData(supabase);

    // Sign out
    await supabase.auth.signOut();

    console.log("\n" + "=".repeat(60));
    console.log("✅ Global Teardown Complete - Test data cleaned");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("⚠️  Global Teardown Warning - Cleanup failed");
    console.error("=".repeat(60));
    console.error(error);
    // Don't throw - teardown failures shouldn't fail the entire test run
  }
}

export default globalTeardown;
