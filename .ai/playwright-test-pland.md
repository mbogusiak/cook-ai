# Playwright E2E Test Plan

## Scope and goals

- Validate critical user journeys from PRD end-to-end using Chromium (desktop) only
- Cover authentication, onboarding + plan generation, plan viewing, meal interactions, swapping, autosave, and multi-portion logic
- Ensure selectors are stable via data-testid; use Page Object Model for maintainability; add API assertions and visual checks

## Test environment

- Browser: Chromium (desktop)
- Base URL: `http://localhost:3000`
- Server: start app via `npm run dev` in tests (webServer in config) or reuse running server locally
- Env: `.env.test` loaded for Playwright; separate test DB/schema (Supabase test project)
- Parallel: enabled (isolate with browser contexts)
- Artifacts: trace=on-first-retry, video=retain-on-failure, screenshots on failure

## Playwright config (essentials)

- `playwright.config.ts`
    - `projects`: single Chromium desktop
    - `use`: `{ baseURL, headless, viewport, trace: 'on-first-retry', video: 'retain-on-failure', screenshot: 'only-on-failure' }`
    - `webServer`: `{ command: 'npm run dev', port: 3000, reuseExistingServer: true }`
    - `fullyParallel: true`

## Directory structure

- Tests: `e2e/*.spec.ts`
- Page Objects: `e2e/page-objects/*`
    - `AuthPage.ts`, `ResetPage.ts`, `OnboardingPage.ts`, `DashboardPage.ts`, `PlanOverviewPage.ts`, `PlanDayPage.ts`
    - Modals/components: `SwapModal.ts`, `RecipePreviewModal.ts`, `ConfirmDialog.ts`
- Test fixtures/utils: `e2e/utils/{api.ts, auth.ts, data.ts}`

## Selector strategy (data-testid)

- Convention: use `data-testid` (per rules) for robust selection; never rely on CSS text
- Naming: kebab-case, semantic, stable over time
- Placement: on interactive elements and key containers rendered by React/Astro components

### Add data-testid attributes (implementation step)

Add the following attributes to ensure resilient selectors:

- `src/components/auth/AuthLoginForm.tsx`
    - `data-testid="login-form"`
    - `email` input → `data-testid="login-email"`
    - `password` input → `data-testid="login-password"`
    - submit button → `data-testid="login-submit"`
    - error area → `data-testid="login-error"`
- `src/components/auth/AuthRegisterForm.tsx`
    - `register-form`, `register-email`, `register-password`, `register-password-confirm`, `register-submit`, `register-error`
- `src/components/auth/AuthResetRequestForm.tsx`
    - `reset-request-form`, `reset-request-email`, `reset-request-submit`, `reset-request-success`, `reset-request-error`
- `src/components/auth/AuthResetConfirmForm.tsx`
    - `reset-confirm-form`, `reset-new-password`, `reset-new-password-confirm`, `reset-confirm-submit`, `reset-confirm-success`, `reset-confirm-error`
- `src/components/onboarding/PlanGeneratorForm.tsx`
    - `plan-form`, `plan-calories-input`, `plan-length-select`, `plan-next-step`
- `src/components/onboarding/StartDateSelector.tsx`
    - `start-date-today`, `start-date-tomorrow`, `start-date-next-monday`, `generate-plan`
- `src/components/dashboard/PlansList.tsx`
    - list container `plans-list`, each card `plan-card`
- `src/components/planOverview/PlanOverviewContent.tsx`
    - `plan-overview`, `calendar-strip`, `day-card-{YYYY-MM-DD}`
- `src/components/planDay/PlanDayView.tsx`
    - `plan-day-view`, navigator: `day-prev`, `day-next`, `day-today`
- `src/components/planDay/MealCard.tsx`
    - container `meal-card-{slot}` e.g. `meal-card-breakfast`
    - status controls: `meal-complete`, `meal-skip`, `meal-swap`, `meal-status`
    - multi-portion badges: `multiportion-badge` (day 1), `leftovers-badge` (day 2)
    - calories per portion: `meal-calories`
    - link to recipe: `meal-recipe-link`
- `src/components/planDay/SwapModal.tsx`
    - `swap-modal`, options container `swap-options`, each option `swap-option-{index}`, confirm `swap-confirm`, cancel `swap-cancel`
- `src/components/planDay/RecipePreviewModal.tsx`
    - `recipe-modal`, close `recipe-close`
- Cross-cutting UI
    - global toast/notifications: `toast-container`

Note: If you already use a different attribute (`data-test-id`), standardize on `data-testid` across the app and tests.

## Page Objects (POM) outline

- `AuthPage`
    - `gotoLogin()`, `login(email, password)`, `assertError(text)`
- `ResetPage`
    - `request(email)`, `submitNewPassword(pw)`
- `OnboardingPage`
    - `fillCalories(value)`, `selectLength(days)`, `next()`, `selectStart(option)`, `generate()`
- `DashboardPage`
    - `openLatestPlan()`, `openPlanByDate(date)`
- `PlanOverviewPage`
    - `gotoDay(date)`, `assertDayCard(date)`
- `PlanDayPage`
    - `complete(slot)`, `skip(slot)`, `swap(slot)`, `openRecipe(slot)`
- `SwapModal`
    - `pickOption(index)`, `confirm()`, `cancel()`

## Test suites mapped to PRD

1) Authentication

- Register new user (US-001) with validations and auto-login redirect to onboarding
- Login existing user (US-002) success + invalid creds error
- Logout (US-003) clears session, redirects to login
- Reset password (US-004) request + confirm flows; expired link shows friendly message

2) Onboarding & Plan generation

- Configure calories and length defaults/validation (US-005)
- Choose start date (default next Monday) (US-006)
- Generate plan: shows loader, redirects to start day; slots match 20/30/30/20 kcal ±20% (US-007)

3) Plan viewing & navigation

- Daily view shows 4 slots with key info and recipe link (US-008)
- Navigate between days within plan bounds only (US-009)

4) Meal status changes & autosave

- Mark meal Completed and Skipped, status persists on reload (US-010, US-011, US-014)

5) Swap meal with alternatives

- Open swap, see up to 3 alternatives from same slot within ±20% calories; select and persist (US-012, US-013, US-014)

6) Multi-portion logic

- When lunch/dinner source has >1 portion, day 1 shows `multiportion-badge`, day 2 shows `leftovers-badge` for same slot; calories split, totals remain within plan targets (US-015)
- Swap day 1 multi-portion removes day 2 counterpart and replaces appropriately (US-013)
- Swap day 2 leftovers leaves day 1 unchanged (US-013)

7) Visual checks

- Baseline screenshots: login, onboarding steps, plan overview, plan day with/without leftovers, swap modal open
- `expect(page).toHaveScreenshot()` with masked dynamic elements if needed

## API validation

- Use Playwright APIRequestContext to validate server state after actions:
    - Fetch current plan/day data to assert status changes and swaps persisted
    - Optionally add test-only route `src/pages/api/test/reset.ts` (guarded by `NODE_ENV==='test'`) to reset DB between tests

## Data seeding strategy

- Before suites: seed a minimal recipe set covering breakfast/lunch/dinner/snack across calorie bands, with some lunch/dinner recipes having portions >1
- Create a test user per test (randomized email) or reuse storageState for authenticated suites
- Clean up via test reset endpoint

## Test style and examples

- Structure: Arrange → Act → Assert; rely on POM and `getByTestId`
- Example pattern:
```ts
// Arrange
await onboarding.fillCalories(2000);
// Act
await planDay.complete('lunch');
// Assert
await expect(page.getByTestId('meal-status')).toHaveText('completed');
```


## Reporting and debugging

- Reporters: list + html; upload traces as artifacts in CI
- On failure: retain video, screenshot, and trace; recommend `npx playwright show-trace` locally

## CI considerations (optional)

- GitHub Actions job: setup Node 22.x, install deps, run server via webServer, run `npx playwright install --with-deps chromium`, run tests headless

## Out of scope (now)

- Mobile viewport coverage (desktop only per rules)
- Non-Chromium browsers

## Deliverables

- Add `data-testid` attributes to components listed above
- Page Objects under `e2e/page-objects`
- Spec files covering suites 1–7
- Playwright config tuned per above; artifacts enabled
- Optional test reset API (guarded to test env)

Todos:

[x] Add data-testid attributes to key components for stable selectors
[x] Create Page Objects under e2e/page-objects for main pages/modals
[x] Tune playwright.config.ts for Chromium-only, artifacts, webServer, baseURL
[x] Implement test data seeding and optional test reset API route
[x] Write auth specs for register, login, logout, password reset
[x] Write onboarding and plan generation specs including kcal splits
[] Write daily view and navigation specs with recipe links
[] Write complete/skip + autosave persistence specs
[] Write swap specs with alternatives and persistence
[] Write multi-portion logic specs including swap day1/day2 rules
[] Add baseline visual snapshots for key pages and modal states
