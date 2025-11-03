# Plan Testów dla Aplikacji Cookido AI

## 1. Wprowadzenie

### 1.1. Cel Dokumentu

Celem tego dokumentu jest przedstawienie kompleksowej strategii testowania dla aplikacji Cookido AI. Plan obejmuje różne aspekty zapewnienia jakości, od testów funkcjonalnych po niefunkcjonalne, aby zagwarantować, że aplikacja jest niezawodna, wydajna i przyjazna dla użytkownika.

### 1.2. Zakres Testów

Testy obejmą następujące obszary funkcjonalne aplikacji:

-   **Moduł Uwierzytelniania:** Rejestracja, logowanie, wylogowywanie, resetowanie hasła.
-   **Onboarding Użytkownika:** Proces wprowadzający nowego użytkownika i generowanie pierwszego planu.
-   **Zarządzanie Planami:** Tworzenie, przeglądanie, modyfikowanie i usuwanie planów żywieniowych.
-   **Przegląd Dnia i Posiłków:** Wyświetlanie szczegółów dnia, zamiana posiłków, podgląd przepisów.
-   **API Aplikacji:** Testowanie wszystkich publicznych punktów końcowych API.

Poza zakresem testów znajdują się:

-   Testy infrastruktury (np. serwery Supabase).
-   Testy penetracyjne (wymagają osobnego planu i narzędzi).
-   Szczegółowe testy wydajnościowe pod dużym obciążeniem (wymagają dedykowanego środowiska).

## 2. Przegląd Aplikacji i Stosu Technologicznego

Cookido AI to aplikacja do inteligentnego planowania posiłków. Umożliwia użytkownikom generowanie spersonalizowanych planów żywieniowych na podstawie ich preferencji.

**Stos technologiczny:**

-   **Frontend:** Astro 5, React 19, TypeScript 5, Tailwind CSS 4
-   **Komponenty UI:** Shadcn/ui
-   **Backend (BaaS):** Supabase (Baza danych, Uwierzytelnianie)
-   **Środowisko uruchomieniowe:** Node.js

## 3. Strategia Testów

### 3.1. Poziomy Testowania

-   **Testy Jednostkowe:** (Odpowiedzialność deweloperów) Weryfikacja pojedynczych funkcji i komponentów. Narzędzia: Vitest, React Testing Library.
-   **Testy Integracyjne:** Sprawdzanie poprawności współpracy między różnymi częściami systemu, np. między komponentami UI a usługami backendowymi.
-   **Testy End-to-End (E2E):** Symulacja pełnych przepływów użytkownika w aplikacji, od początku do końca. Narzędzia: Playwright lub Cypress.
-   **Testy API:** Bezpośrednie testowanie punktów końcowych API w celu weryfikacji logiki biznesowej, obsługi błędów i kontraktów danych. Narzędzia: Postman, Insomnia lub testy automatyczne w Playwright.

### 3.2. Typy Testowania

-   **Testy Funkcjonalne:** Weryfikacja, czy aplikacja działa zgodnie z wymaganiami biznesowymi.
-   **Testy UI/UX:** Sprawdzanie poprawności wyświetlania interfejsu, responsywności (RWD) i ogólnej użyteczności.
-   **Testy Kompatybilności:** Weryfikacja działania aplikacji na najpopularniejszych przeglądarkach (Chrome, Firefox, Safari) i urządzeniach (desktop, mobile).
-   **Testy Bezpieczeństwa:** Podstawowa weryfikacja mechanizmów uwierzytelniania i autoryzacji.

## 4. Środowisko i Narzędzia Testowe

-   **Środowisko Testowe:** Dedykowana instancja aplikacji (staging), połączona z osobną bazą danych Supabase, odzwierciedlająca środowisko produkcyjne.
-   **Narzędzia do Automatyzacji Testów E2E:** **Playwright** - rekomendowany ze względu na szybkość, niezawodność i możliwość testowania API.
-   **Narzędzia do Testów API:** **Postman/Insomnia** (do testów manualnych i eksploracyjnych) oraz Playwright (do automatyzacji).
-   **Zarządzanie Testami i Błędami:** Jira, Asana, lub proste pliki Markdown w repozytorium dla mniejszych projektów.

## 5. Scenariusze Testowe

Poniżej znajdują się wysokopoziomowe scenariusze testowe dla kluczowych modułów aplikacji.

### 5.1. Testy E2E (Przepływy Użytkownika)

#### Moduł Uwierzytelniania

1.  **Rejestracja:** Pomyślne utworzenie nowego konta, walidacja formularza (np. niepoprawny email, za krótkie hasło), obsługa przypadku użycia istniejącego adresu e-mail.
2.  **Logowanie:** Pomyślne zalogowanie, obsługa niepoprawnych danych, przekierowanie do panelu głównego.
3.  **Reset Hasła:** Przepływ prośby o reset hasła i pomyślna zmiana hasła.
4.  **Ochrona Stron:** Próba dostępu do stron chronionych (np. `/dashboard`) bez zalogowania.
5.  **Wylogowanie:** Pomyślne wylogowanie i przekierowanie na stronę główną.

#### Onboarding

1.  **Generowanie Planu:** Użytkownik po pierwszym zalogowaniu przechodzi przez formularz preferencji i pomyślnie generuje swój pierwszy plan żywieniowy.
2.  **Walidacja Formularza:** Sprawdzenie walidacji pól w formularzu onboardingu.

#### Panel Główny (Dashboard) i Plany

1.  **Wyświetlanie Planów:** Poprawne wyświetlanie listy planów użytkownika.
2.  **Nawigacja:** Przechodzenie między widokiem listy planów a szczegółami pojedynczego planu.
3.  **Tworzenie Nowego Planu:** Użytkownik może utworzyć nowy, pusty plan.
4.  **Usuwanie Planu:** Użytkownik może usunąć istniejący plan.

#### Widok Dnia i Posiłków

1.  **Nawigacja:** Przechodzenie między dniami w ramach planu.
2.  **Zamiana Posiłku:** Pomyślna zamiana posiłku na inny z listy alternatyw.
3.  **Podgląd Przepisu:** Otwieranie modala ze szczegółami przepisu.

### 5.2. Testy API

Testy powinny obejmować weryfikację kodów odpowiedzi HTTP (2xx, 4xx, 5xx), strukturę odpowiedzi JSON oraz walidację danych wejściowych.

#### `api/auth/`

-   `POST /api/auth/register`: Rejestracja użytkownika (sukces, duplikat, błędy walidacji).
-   `POST /api/auth/login`: Logowanie (sukces, niepoprawne dane).
-   `POST /api/auth/logout`: Wylogowywanie.

#### `api/plans/`

-   `GET /api/plans`: Pobieranie listy planów zalogowanego użytkownika.
-   `POST /api/plans`: Tworzenie nowego planu.
-   `POST /api/plans/generate`: Generowanie posiłków dla planu na podstawie preferencji.
-   `GET /api/plans/[id]`: Pobieranie szczegółów konkretnego planu.
-   `DELETE /api/plans/[id]`: Usuwanie planu.
-   `GET /api/plans/[plan_id]/days/[date]`: Pobieranie posiłków na konkretny dzień.

#### `api/plan-meals/`

-   `PUT /api/plan-meals/[id]/swap`: Zamiana posiłku.
-   `GET /api/plan-meals/[id]/alternatives`: Pobieranie alternatywnych posiłków do zamiany.

#### `api/recipes/`

-   `GET /api/recipes`: Pobieranie listy przepisów (z paginacją/filtrowaniem).
-   `GET /api/recipes/[id]`: Pobieranie szczegółów przepisu.

#### `api/user-settings.ts`

-   `GET`/`POST`: Weryfikacja pobierania i zapisywania ustawień użytkownika.

## 6. Zarządzanie Defektami

-   **Zgłaszanie Błędów:** Każdy znaleziony błąd powinien być zgłoszony w systemie do śledzenia zadań.
-   **Szablon Zgłoszenia:**
    -   **Tytuł:** Krótki, zwięzły opis problemu.
    -   **Kroki do odtworzenia:** Numerowana lista kroków.
    -   **Oczekiwany rezultat:** Co powinno się wydarzyć.
    -   **Rzeczywisty rezultat:** Co się wydarzyło.
    -   **Środowisko:** (np. przeglądarka, system operacyjny, wersja aplikacji).
    -   **Priorytet/Waga:** (np. Krytyczny, Wysoki, Średni, Niski).
    -   **Załączniki:** Zrzuty ekranu, nagrania wideo.
-   **Cykl Życia Błędu:** `Nowy` -> `W Analizie` -> `Do Poprawy` -> `Gotowy do Testów` -> `Zamknięty`.

---
Ten plan stanowi solidną podstawę do rozpoczęcia procesu zapewnienia jakości w projekcie Cookido AI. Powinien być on dokumentem żywym i aktualizowanym wraz z rozwojem aplikacji.


