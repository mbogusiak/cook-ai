![Node Version](https://img.shields.io/badge/Node-22.14.0-339933?logo=node.js&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5-BC52EE?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=06192E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)

## Table of Contents 

- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

## 1. Project name 

**Mealflow — Meal Planner**

## 2. Project description

Smart and intuitive meal planning web app for Thermomix users that automates creating personalized weekly menus from the Cookido recipe library. It saves time via multi‑portion cooking, keeps diets varied, and helps reduce food waste.

- Daily plan across 4 slots: breakfast, lunch, dinner, snack
- Calorie distribution per day: 20% / 30% / 30% / 20% with ±20% selection tolerance
- Multi‑portion logic: if a lunch/dinner recipe has >1 serving, it's planned again the next day as leftovers; calories are evenly split across days
- Clear UI labels for "Cook for 2 days" (day 1) and "Leftovers" (day 2)
- Swap any planned meal for up to 3 suitable alternatives; autosave for all changes
- User authentication via email/password (OAuth via Google/Facebook planned for future release)

For detailed product requirements, see `.ai/prd.md`. Architectural notes and MVP rationale are in `.ai/tech-stack.md`.

## 3. Tech stack 

- Astro 5 with SSR for fast, dynamic web applications
- React 19 + TypeScript 5 for interactive components
- Tailwind CSS 4 + shadcn/ui (Radix primitives, CVA, clsx) for composable components
- Supabase: PostgreSQL with RLS, Postgres auth (email/password), infrastructure for OAuth (Google/Facebook)
- Validation with Zod for input validation
- Plan generation: planned as server function (Supabase Edge Function or Astro endpoint)
- Development tools: ESLint, Prettier, Husky + lint-staged for code quality

References:
- Product Requirements: `.ai/prd.md`
- Tech rationale: `.ai/tech-stack.md`

## 4. Getting started locally

Prerequisites:
- Node.js 22.14.0 (see `.nvmrc`)
- npm (bundled with Node)

Setup:

```bash
# 1) Clone the repository
git clone <your-repo-url>
cd cookido-ai

# 2) Use the project Node version
nvm use

# 3) Install dependencies
npm install

# 4) Start the dev server
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

Notes:
- Supabase credentials and other secrets should be provided via environment variables (not included yet).
- The plan generator should run server‑side (Edge Function or API route) close to the database for performance and consistency.

## 5. Available scripts

From `package.json`:
- `dev`: start the development server
- `build`: build for production
- `preview`: preview the production build
- `astro`: run Astro CLI directly
- `lint`: run ESLint
- `lint:fix`: fix ESLint issues
- `format`: format code with Prettier

## 6. Project scope

- In scope (MVP):
  - Responsive web application (RWD)
  - User authentication via email/password
  - Use of Cookido recipe database
  - Plan generation with multi‑portion logic
  - Interactions: status changes (planned/completed/skipped), meal swapping with suitable alternatives, autosave

- Out of scope (future releases):
  - OAuth via Google/Facebook
  - Native app/PWA
  - Guest mode
  - User‑added custom recipes
  - Manual meal editing
  - Shopping list generation
  - Advanced dietary filters (e.g., vegan, gluten‑free)
  - Fitness tracker integrations

## 7. Project status

MVP in progress. North Star Metric: percentage of plans where users mark at least 90% of meals as completed. Q1 target: 15%. Supporting metrics include early retention, swap feature adoption, and multi‑portion usage.

## 8. License

MIT. If this repository does not yet include a `LICENSE` file, consider adding one to formalize the terms.






