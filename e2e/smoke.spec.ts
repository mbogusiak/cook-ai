import { test, expect } from "@playwright/test"

test.describe("Smoke", () => {
  test("home redirects to onboarding and renders heading", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/onboarding/)
    await expect(page.getByRole("heading", { name: "Stwórz swój plan żywieniowy" })).toBeVisible()
  })
})



