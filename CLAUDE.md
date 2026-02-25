# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npx shadcn@latest add [component]  # Add Shadcn component
```

## Project Overview

**Cookido AI** - Meal planning app for Thermomix users generating personalized weekly plans from 6000+ recipes.

Key features:
- 7-day plans with 4 meals/day (breakfast 20%, lunch 30%, dinner 30%, snack 20%)
- Multi-portion cooking (once for 2 days)
- OAuth authentication (Google/Facebook)
- Calorie matching within ±20% of target

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro 5 (SSR mode) |
| UI | React 19 + Shadcn/ui (new-york style) |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (auth + database) |
| Validation | Zod |
| Node | 22.14.0 |

## Coding Standards

### TypeScript
- Strict mode enabled
- Avoid `any` - use proper types
- Shared types in `src/types.ts`
- Zod schemas for runtime validation

### Components
- **Astro** (`.astro`) → static content, layouts
- **React** (`.tsx`) → interactive components only
- No Next.js directives (`"use client"` not needed)
- Custom hooks in `src/components/hooks/`

### API Routes (`src/pages/api/`)
```typescript
export const prerender = false;

export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;
  // ...
}
```

### Database
- Access via `context.locals.supabase` (not direct imports)
- Import types from `src/db/supabase.client.ts`
- Validate with Zod before DB operations

### Styling
- Tailwind 4 utilities
- Responsive: `sm:`, `md:`, `lg:`
- States: `hover:`, `focus-visible:`, `active:`
- Arbitrary values: `w-[123px]`

### Accessibility
- Semantic HTML first
- ARIA only when necessary
- `aria-live` for dynamic updates

## Key Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | SSR mode, Node adapter, React |
| `components.json` | Shadcn UI config |
| `.ai/prd.md` | Product requirements (Polish) |
| `.cursor/rules/` | AI assistant rules |

## Git Hooks

Pre-commit via Husky + lint-staged:
- TS/TSX/Astro → ESLint auto-fix
- JSON/CSS/MD → Prettier format
