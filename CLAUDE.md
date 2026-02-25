# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Quick Reference

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev server | `npm run dev` (port 3000) |
| Build | `npm run build` |
| Preview | `npm run preview` |
| Lint | `npm run lint` / `npm run lint:fix` |
| Format | `npm run format` |
| Unit tests | `npm run test` / `npm run test:watch` |
| E2E tests | `npm run e2e` / `npm run e2e:headed` |
| Add Shadcn component | `npx shadcn@latest add [component-name]` → `src/components/ui/` |

---

## Project Overview

**Cookido AI** is a meal planning app (Planer Żywieniowy) for Thermomix users. It generates personalized weekly meal plans from 6000+ Cookido recipes based on calorie goals. Features: multi-portion meals (cook once for 2 days), meal swapping, progress tracking, OAuth (Google/Facebook).

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro 5 (SSR, server output) |
| UI | React 19, Shadcn/ui (new-york, neutral) |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5 (strict) |
| Backend | Supabase (auth, DB) |
| Validation | Zod |
| Deployment | Cloudflare (advanced mode) |
| Node | 22.14.0 (`.nvmrc`) |

### Directory Structure

```
src/
├── layouts/       # Astro layout templates
├── pages/         # File-based routing
│   └── api/       # API endpoints (GET, POST handlers)
├── middleware/    # Astro middleware (index.ts)
├── components/    # Astro (static) + React (interactive)
│   └── ui/        # Shadcn components
├── lib/           # Services, utilities, helpers
├── db/            # Supabase clients and types
├── types.ts       # Shared entities and DTOs
├── styles/        # Global CSS, Tailwind config
└── assets/        # Internal static assets
public/            # Public static assets
.ai/               # Product docs (PRD, guides) — Polish
```

### Key Config Files

- `astro.config.mjs` — SSR, Cloudflare adapter, React, path alias `@/*` → `./src/*`
- `tsconfig.json` — TypeScript, path aliases
- `components.json` — Shadcn UI
- `eslint.config.js` — ESLint (Hooks, a11y, Prettier)
- `.cursor/rules/` — Cursor AI rules
- `.github/copilot-instructions.md` — Copilot instructions

---

## Coding Conventions

### General

- **Error handling**: Guard clauses, early returns, handle edge cases first
- **Happy path last**: Avoid nested conditionals; use if-return pattern
- **Linting**: Apply ESLint feedback; use `lint:fix` when appropriate
- **Logging**: User-friendly error messages with proper logging

### TypeScript

- Strict mode (Astro tsconfig)
- No `any`; shared types in `src/types.ts`
- Zod for runtime validation

### Components

| Type | Use case |
|------|----------|
| `.astro` | Static content, layouts |
| `.tsx` | Interactivity only |

- Custom hooks → `src/components/hooks/`
- No `"use client"` (Astro ≠ Next.js)
- Performance: `React.memo()`, `useCallback`, `useMemo` for expensive components

### Styling (Tailwind 4)

- Utility classes; `@layer` for custom styles
- Arbitrary values: `w-[123px]`
- Responsive: `sm:`, `md:`, `lg:`; states: `hover:`, `focus-visible:`, `active:`
- Shadcn: new-york style, neutral theme

### Accessibility

- Semantic HTML; ARIA only when needed
- `aria-label` / `aria-labelledby` for unlabeled elements
- `aria-live` for dynamic content
- Enforced by `eslint-plugin-jsx-a11y`

### API & Backend

- **Endpoints**: `src/pages/api/` — uppercase handlers: `export async function GET(context)`
- **Dynamic routes**: `export const prerender = false`
- **Supabase**: `context.locals.supabase` (not direct imports)
- **Types**: `SupabaseClient` from `src/db/supabase.client.ts`
- **Validation**: Zod before DB operations; extract logic to `src/lib/`
- **Security**: Follow RLS best practices

### Astro-Specific

- View Transitions: `<ClientRouter>`
- Cookies: `Astro.cookies`
- Env: `import.meta.env`
- Hybrid rendering (SSR + static) where appropriate

### React Hooks

- Top level only; same order every render
- Custom hooks: prefix with `use`
- Enforced by `eslint-plugin-react-hooks`, `eslint-plugin-react-compiler`

---

## Product Context

See `.ai/prd.md` for full spec. Summary:

- **Auth**: OAuth (Google, Facebook); no guest mode
- **Plans**: 7 days × 4 meals (breakfast 20%, lunch 30%, dinner 30%, snack 20%)
- **Multi-portion**: Cook once for 2 days (dinners/lunches)
- **Meals**: Mark completed/skipped; swap with 3 alternatives
- **Calories**: ±20% of target per slot
- **Success**: 90%+ meals completed

---

## Tooling

### Pre-commit (Husky + lint-staged)

- `*.{ts,tsx,astro}` → ESLint --fix
- `*.{json,css,md}` → Prettier

### E2E Testing (Playwright)

- See `.cursor/rules/playwright-e2e-testing.mdc` for guidelines
- Page objects: `./e2e/page-objects`
- Use `data-testid` for selectors; `page.getByTestId('name')`

---

## Notes

- **Astro SSR** — not static, not Next.js
- **Shadcn** — React components integrated with Astro
- **Docs** — `.ai/` content is in Polish
- **Program** — 10xDevs.pl structure
