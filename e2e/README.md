# E2E Testing with Playwright

This directory contains end-to-end tests for the Cookido AI meal planning application.

## Setup

### 1. Install Dependencies

```bash
npm install
npm run e2e:install  # Install Chromium browser
```

### 2. Configure Test Environment

The tests use a dedicated Supabase cloud database (not local). Credentials are stored in `.env.test`:

```env
SUPABASE_URL=https://etdtiufyhrmlvhmybynu.supabase.co
SUPABASE_PUBLIC_KEY=eyJhbGci...
E2E_USERNAME_ID=2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09
E2E_USERNAME=e2e_mbogusiak@gmail.com
E2E_PASSWORD=123456
```

### 3. Test User

A dedicated test user must exist in the Supabase Auth database:
- **Email**: `e2e_mbogusiak@gmail.com`
- **Password**: `123456`
- **User ID**: `2d58b2c7-d4a0-47e8-8bb4-f4cd14f73d09`

## Test Data Seeding

### Automatic Seeding

Tests automatically seed baseline data before running:

```bash
npm run e2e  # Runs global setup → seeds data → runs tests → teardown
```

### Manual Seeding

To seed data without running tests:

```bash
npx tsx -e "import('./e2e/global-setup.ts').then(m => m.default())"
```

### What Gets Seeded

- **1 user_settings** record (2000 kcal/day, 7 days default)
- **1 active plan** starting next Monday
- **7 plan_days** (full week)
- **28 slot_targets** (4 meals × 7 days)
- **28 plan_meals** including:
  - 20 planned meals
  - 5 completed meals
  - 3 skipped meals
  - 2 multi-portion groups (4 meals total: 2 cooking days + 2 leftover days)

### Manual Cleanup

If automatic cleanup fails due to database triggers, run the manual cleanup SQL:

1. Open Supabase SQL Editor
2. Run the SQL from `e2e/fixtures/cleanup-manual.sql`
3. Update the user ID if needed

## Running Tests

```bash
# Run all tests (headless)
npm run e2e

# Run with UI
npm run e2e:headed

# Run with Playwright Inspector
npm run e2e:ui

# Run specific test file
npx playwright test e2e/auth.spec.ts
```

## Project Structure

```
e2e/
├── README.md                    # This file
├── fixtures/
│   ├── test-data.ts            # Test data constants and helpers
│   └── cleanup-manual.sql      # Manual cleanup SQL script
├── utils/
│   └── seed.ts                 # Data seeding utilities
├── page-objects/               # Page Object Model classes
│   ├── AuthPage.ts
│   ├── DashboardPage.ts
│   ├── OnboardingPage.ts
│   ├── PlanDayPage.ts
│   ├── PlanOverviewPage.ts
│   └── components/
│       ├── SwapModal.ts
│       └── RecipePreviewModal.ts
├── global-setup.ts             # Runs before all tests (seeds data)
├── global-teardown.ts          # Runs after all tests (optional cleanup)
└── *.spec.ts                   # Test files
```

## Configuration

### playwright.config.ts

- **Browser**: Chromium only (desktop)
- **Base URL**: `http://localhost:3000`
- **Locale**: `pl-PL`
- **Timezone**: `Europe/Warsaw`
- **Retries**: 1
- **Artifacts**: Screenshots + videos on failure, traces on retry

### Environment Variables

- `.env.test` is automatically loaded with `override: true` to use cloud Supabase
- Local `.env` (with local Supabase) is ignored during tests

## Troubleshooting

### "Invalid login credentials"

- Ensure the test user exists in Supabase Auth
- Verify the password is set (not just OAuth)
- Check that `.env.test` has correct credentials

### "Multi-portion group must have exactly 2 meals"

- This happens during cleanup due to database triggers
- Run manual cleanup SQL: `e2e/fixtures/cleanup-manual.sql`
- The script will guide you through manual cleanup

### "Duplicate key value violates unique constraint"

- An active plan already exists for the test user
- Run cleanup before seeding
- Check that cleanup completed successfully

## Writing New Tests

1. **Create Page Object** (if needed)
   ```typescript
   // e2e/page-objects/MyPage.ts
   export class MyPage {
     constructor(private page: Page) {}
     async navigate() { ... }
     async clickButton() { ... }
   }
   ```

2. **Write Test**
   ```typescript
   // e2e/my-feature.spec.ts
   import { test, expect } from '@playwright/test';

   test.describe('My Feature', () => {
     test('should do something', async ({ page }) => {
       // Arrange
       await page.goto('/my-page');

       // Act
       await page.getByTestId('my-button').click();

       // Assert
       await expect(page.getByTestId('result')).toBeVisible();
     });
   });
   ```

3. **Use Baseline Data**
   ```typescript
   import { getTestUser, getBaselinePlanStartDate } from './fixtures/test-data';

   const testUser = getTestUser();
   const startDate = getBaselinePlanStartDate(); // Next Monday
   ```

## CI/CD

(To be configured)

- Set up GitHub Actions workflow
- Store `.env.test` as repository secrets
- Run tests on PR and merge to main
- Upload test artifacts (traces, videos) on failure
