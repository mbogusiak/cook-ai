## Frontend - Astro 5 z React dla komponentów interaktywnych

### Astro 5
- **SSR (Server-Side Rendering)**: Output mode ustawiony na `server` dla dynamicznych aplikacji
- **Node Adapter**: Używane dla wdrożeń na serwerach Node.js
- **View Transitions API**: Integracja z `<ClientRouter>` dla płynnych przejść między stronami
- **File-based routing**: Strony w `src/pages/` automatycznie tworzą trasy aplikacji
- **Hybrid rendering**: Kombinacja SSR i statycznych zasobów

### React 19
- **Komponenty interaktywne**: React używany **tylko** dla komponentów wymagających interaktywności
- **Komponenty Astro**: Komponenty statyczne w formatcie `.astro` dla statycznej zawartości
- **React Hooks**: Pełna obsługa hooks (useState, useEffect, useCallback, useMemo, custom hooks)
- **React Compiler**: Wsparcie dla optymalizacji wydajności

### TypeScript 5
- **Strict mode**: Włączony globalnie w `tsconfig.json`
- **Path aliases**: `@/*` → `./src/*`
- **Type definitions**: Centralizacja typów w `src/types.ts`
- **Component types**: PropTypes dla komponentów React i Astro

### Tailwind CSS 4
- **Utility-first CSS**: Stylowanie przez klasy Tailwind
- **Custom layers**: Organizacja stylów za pomocą `@layer` directive
- **Responsive design**: Obsługa breakpointów (`sm:`, `md:`, `lg:`)
- **State variants**: `hover:`, `focus-visible:`, `active:` i inne

### Shadcn/ui
- **UI Components Library**: Gotowe komponenty React oparte na Radix UI
- **Style**: New York style z neutral theme
- **Instalacja**: Komponenty instalowane do `src/components/ui/`
- **Customization**: Komponenty można dostosować do własnych potrzeb

## Backend - Supabase + PostgreSQL

### Baza danych
- **PostgreSQL**: Pełnoprawna relacyjna baza danych
- **Row Level Security (RLS)**: Polityki zabezpieczeń na poziomie wierszy
- **Real-time subscriptions**: Wsparcie dla subskrypcji w real-time (opcjonalnie)

### Autentykacja
- **Email/Hasło**: Podstawowa autentykacja z email i hasłem (aktualnie zaimplementowana)
- **OAuth**: Przygotowana infrastruktura w Supabase, ale nie zaimplementowana (brak Google i Facebook)
- **Supabase Auth**: Zarządzanie użytkownikami i sesjami
- **JWT tokens**: Tokeny do autoryzacji API requests
- **Session management**: Obsługa sesji przez cookies

### Supabase SDK
- **JavaScript/TypeScript**: `@supabase/supabase-js` dla komunikacji z backendem
- **Backend-as-a-Service**: Gotowe endpointy dla operacji CRUD
- **Environment variables**: Konfiguracja przez `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`

## Walidacja danych

### Zod
- **Schema validation**: Definiowanie schematów walidacji dla danych wejściowych
- **Runtime validation**: Walidacja w runtime dla API endpoints i formularzy
- **Type inference**: Automatyczne wnioskowanie typów TypeScript ze schematów
- **Error messages**: Szczegółowe komunikaty błędów dla użytkownika

## AI - Generowanie planów żywieniowych

### Cookido recipes API
- **6000+ przepisów**: Integracja z bazą przepisów Thermomix
- **Dane o składnikach**: Kalorie, składniki, czas przygotowania

## CI/CD i Hosting

### GitHub Actions
- **Automatyzacja testów**: Testy na każdy push i PR
- **Build pipeline**: Automatyczne buildy dla production
- **Deployment**: Wdrażanie do Cloudflare Pages

### Cloudflare Pages
- **Static hosting**: Hosting dla budowanej aplikacji
- **Edge functions**: Opcjonalne edge functions dla logiki serwerowej
- **CDN**: Globalna sieć dystrybucji zawartości
- **Preview deployments**: Automatyczne deployments dla PRs

## Narzędzia deweloperskie

### ESLint
- **Linting**: Analiza kodu pod kątem błędów i best practices
- **Plugins**:
  - `eslint-plugin-react`: Reguły dla React
  - `eslint-plugin-react-hooks`: Walidacja React hooks
  - `eslint-plugin-jsx-a11y`: Accessibility rules
  - `eslint-plugin-prettier`: Integracja z Prettier

### Prettier
- **Code formatting**: Automatyczne formatowanie kodu
- **Pre-commit hooks**: Formatowanie przez Husky + lint-staged

### Husky + lint-staged
- **Pre-commit hooks**: Automatyczne uruchamianie zadań przed commit
- **TypeScript/TSX/Astro**: Auto-fix z ESLint
- **JSON/CSS/Markdown**: Auto-format z Prettier

### Vitest (opcjonalnie w projektach z testami)
- **Unit testing**: Framework do testów jednostkowych
- **Watch mode**: Automatyczne re-uruchamianie testów

### Playwright (opcjonalnie dla e2e testów)
- **E2E testing**: Testy integracyjne aplikacji
- **Cross-browser**: Testy na Chrome, Firefox, Safari

## Environment

### Node.js
- **Wersja**: 22.14.0 (zobacz `.nvmrc`)
- **Package Manager**: npm

