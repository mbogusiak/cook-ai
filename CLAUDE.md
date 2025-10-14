# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm install` - Install dependencies
- `npm run dev` - Start development server (runs on port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

### Shadcn UI Components
- `npx shadcn@latest add [component-name]` - Add a new Shadcn UI component
- Components are installed to `src/components/ui/`
- See https://ui.shadcn.com/r for available components

## Architecture

### Project Purpose
Cookido AI is a meal planning application (Planer Żywieniowy) for Thermomix users. It generates personalized weekly meal plans based on calorie goals using 6000+ recipes from the Cookido platform. Key features include multi-portion meal support (cooking once for 2 days), flexible meal swapping, progress tracking, and OAuth authentication (Google/Facebook).

### Tech Stack
- **Framework**: Astro 5 with SSR (server output mode)
- **UI Library**: React 19 for interactive components
- **Styling**: Tailwind CSS 4 with Shadcn/ui components (new-york style, neutral theme)
- **Language**: TypeScript 5 (strict mode via Astro tsconfig)
- **Backend**: Supabase for database and authentication
- **Validation**: Zod for input validation
- **Node Version**: 22.14.0 (see `.nvmrc`)

### Directory Structure
- `src/` - All source code
  - `layouts/` - Astro layout templates
  - `pages/` - Astro pages (file-based routing)
  - `pages/api/` - API endpoints (use uppercase GET, POST handlers)
  - `middleware/index.ts` - Astro middleware for request/response modification
  - `components/` - UI components (Astro for static, React for interactive)
  - `components/ui/` - Shadcn UI components
  - `lib/` - Services, utilities, and helpers
  - `db/` - Supabase clients and type definitions
  - `types.ts` - Shared TypeScript types (Entities, DTOs)
  - `styles/` - Global CSS including Tailwind configuration
  - `assets/` - Internal static assets
- `public/` - Public static assets
- `.ai/` - Product documentation including PRD and implementation guides

### Key Configuration Files
- `astro.config.mjs` - Astro configuration (SSR mode, Node adapter, React integration)
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` → `./src/*`)
- `components.json` - Shadcn UI configuration
- `eslint.config.js` - ESLint configuration (includes React Hooks, a11y, Prettier)
- `.cursor/rules/` - AI assistant rules for Cursor IDE
- `.github/copilot-instructions.md` - GitHub Copilot instructions
- `.windsurfrules` - Windsurf AI configuration

## Coding Standards

### General Principles
- **Error Handling**: Handle errors and edge cases at the beginning of functions with early returns
- **Clean Code**: Use guard clauses, avoid unnecessary else statements, place happy path last
- **Linting**: Always use ESLint feedback to improve code quality
- **Logging**: Implement proper error logging with user-friendly messages

### TypeScript
- Use strict mode (enforced by Astro's strict tsconfig)
- Avoid `any` type
- Define types in `src/types.ts` for shared entities and DTOs
- Use Zod schemas for runtime validation

### Component Architecture
- **Astro Components** (`.astro`): Use for static content and layouts
- **React Components** (`.tsx`): Use only when interactivity is needed
- Never use Next.js directives like `"use client"` (Astro handles SSR differently)
- Extract custom hooks to `src/components/hooks/`
- Use `React.memo()` for expensive components with stable props
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive calculations

### Styling with Tailwind
- Use Tailwind 4 utility classes
- Use `@layer` directive for organizing custom styles
- Use arbitrary values with square brackets for one-off designs (e.g., `w-[123px]`)
- Leverage responsive variants (`sm:`, `md:`, `lg:`)
- Use state variants (`hover:`, `focus-visible:`, `active:`)
- Follow Shadcn UI's new-york style with neutral base color

### Accessibility
- Use semantic HTML elements
- Implement ARIA attributes only when necessary (avoid redundancy)
- Use ARIA landmarks for page regions
- Provide `aria-label` or `aria-labelledby` for elements without visible labels
- Use `aria-live` regions for dynamic content updates
- Follow a11y rules enforced by `eslint-plugin-jsx-a11y`

### API Routes
- Create endpoints in `src/pages/api/`
- Use uppercase method names: `export async function GET(context) { }`
- Add `export const prerender = false` for dynamic routes
- Use Zod for input validation
- Extract business logic to services in `src/lib/`
- Access Supabase via `context.locals.supabase` (not direct imports)

### Backend and Database
- Use Supabase for authentication and database operations
- Import `SupabaseClient` type from `src/db/supabase.client.ts` (not from `@supabase/supabase-js`)
- In Astro routes, access Supabase via `context.locals.supabase`
- Validate all data with Zod schemas before database operations
- Follow Row Level Security (RLS) best practices

### Astro-Specific
- Use View Transitions API (`<ClientRouter>`) for smooth page transitions
- Use `Astro.cookies` for server-side cookie management
- Access environment variables via `import.meta.env`
- Leverage content collections with type safety for structured content
- Use hybrid rendering (SSR + static) where appropriate

### React Hooks Rules
- Only call hooks at the top level (never in loops, conditions, or nested functions)
- Only call hooks from React function components or custom hooks
- Custom hooks must start with "use"
- Never call hooks conditionally
- Ensure hooks are called in the same order across renders
- Enforced by `eslint-plugin-react-hooks` and `eslint-plugin-react-compiler`

## Product Context

The application implements a meal planner as specified in `.ai/prd.md`:
- **User Authentication**: OAuth via Google and Facebook (no guest mode)
- **Meal Planning**: Generates 7-day plans with 4 meals/day (breakfast 20%, lunch 30%, dinner 30%, snack 20% of daily calories)
- **Multi-portion Logic**: Supports cooking once for 2 days to save time (dinners/lunches only)
- **Meal Management**: Users can mark meals as completed/skipped, swap meals (3 alternatives shown)
- **Calorie Matching**: Meals selected within ±20% of target calories per slot
- **Data Source**: 6000+ recipes from Cookido platform
- **Success Metric**: Plan completion = 90%+ meals marked as completed

## Lint-Staged and Git Hooks

The project uses Husky and lint-staged for pre-commit hooks:
- TypeScript/TSX/Astro files: Auto-fixed with ESLint
- JSON/CSS/Markdown files: Auto-formatted with Prettier

## Important Notes

- This is an Astro SSR application, not a static site or Next.js app
- Shadcn UI components are React-based but integrated with Astro
- All documentation in `.ai/` directory is in Polish
- The project follows the 10xDevs.pl program structure
