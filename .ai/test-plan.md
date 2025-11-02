Oto kompleksowy plan testów dla projektu "Mealflow", przygotowany z perspektywy doświadczonego inżyniera QA.

---

## 1. 🍽️ Wprowadzenie

### 1.1. Cel Dokumentu
Celem tego dokumentu jest zdefiniowanie strategii, zakresu, zasobów i harmonogramu działań testowych dla aplikacji **Mealflow**. Plan ten ma na celu zapewnienie, że aplikacja spełnia wymagania biznesowe i jakościowe przed wdrożeniem produkcyjnym.

### 1.2. Opis Projektu
**Mealflow** to aplikacja webowa (zbudowana w oparciu o Astro, React i Supabase) przeznaczona do planowania posiłków. Kluczowe funkcjonalności obejmują generowanie spersonalizowanych planów żywieniowych w oparciu o zapotrzebowanie kaloryczne, przeglądanie planów, zarządzanie posiłkami (oznaczanie jako ukończone, wymiana na alternatywy) oraz zarządzanie ustawieniami użytkownika.

### 1.3. Kluczowe Technologie (z perspektywy QA)
* **Frontend:** Astro (dla stron statycznych/SSR) i React (dla komponentów interaktywnych).
* **Zarządzanie Stanem UI:** `react-query` (`@tanstack/react-query`) do buforowania danych po stronie klienta.
* **Backend (API):** Punkty końcowe API zaimplementowane jako `serverless functions` w `src/pages/api/`.
* **Baza Danych:** Supabase (PostgreSQL).
* **Walidacja:** Zod (w `src/lib/schemas/`) do walidacji danych wejściowych API.

---

## 2. 🎯 Zakres Testów

### 2.1. W Zakresie (In Scope)

Testy obejmą następujące obszary:

* **Testy API (Backend):**
   * Wszystkie punkty końcowe w `src/pages/api/`.
   * Walidacja schematów wejściowych (Zod).
   * Poprawność kodów statusu HTTP (2xx, 4xx, 5xx).
   * Struktura i poprawność odpowiedzi JSON.
   * Logika biznesowa (np. walidacja kalorii, generowanie planu, logika `multi-portion`).
* **Testy Funkcjonalne (Frontend):**
   * Wszystkie interaktywne komponenty React (`src/components/`).
   * Kluczowe przepływy użytkownika (User Flows).
   * Integracja Frontendu z Backendem (poprawność wywołań API i obsługa odpowiedzi).
   * Obsługa stanów (ładowanie, błąd, stan pusty) w komponentach korzystających z `react-query`.
* **Testy Integracyjne:**
   * Przepływ danych między UI -> API -> Baza Danych.
   * Integracja logiki wieloporcjowej (`is_leftover`, `portions_to_cook`) między generowaniem planu a jego wyświetlaniem.
* **Testy Walidacji:**
   * Testowanie wszystkich schematów Zod (`src/lib/schemas/`) danymi poprawnymi, niepoprawnymi i brzegowymi.
* **Testy Użyteczności (Podstawowe):**
   * Responsywność (RWD) kluczowych widoków (Dashboard, Plan Overview, Plan Day).
   * Dostępność (A11y) - weryfikacja poprawności użycia atrybutów `aria-*` i `role`.

### 2.2. Poza Zakresem (Out of Scope)

* **Testy Systemu Uwierzytelniania:** Kod jawnie wskazuje na brak zaimplementowanego uwierzytelniania (użycie `TEMP_USER_ID` i `DEV_USER_ID`). Testy będą symulować uwierzytelnionego użytkownika, ale nie będą testować procesów logowania, rejestracji czy resetowania hasła.
* **Testy Wydajnościowe i Obciążeniowe:** Ten plan skupia się na testach funkcjonalnych. Testy obciążeniowe (np. API `POST /api/plans/generate`) powinny być częścią osobnego planu.
* **Testy Infrastruktury Supabase:** Nie będziemy testować samej bazy danych Supabase, a jedynie poprawność naszej integracji z nią.
* **Testy Statycznych Stron Informacyjnych:** Komponenty takie jak `Welcome.astro` (jeśli nie są częścią aktywnego przepływu) mają niski priorytet.

---

## 3. 🚀 Kluczowe Funkcjonalności i Scenariusze Testowe

Poniżej znajduje się podział na kluczowe moduły aplikacji wraz z priorytetowymi scenariuszami testowymi.

### F1: Onboarding i Generowanie Planu (Krytyczny)
**Pliki:** `src/components/onboarding/`, `src/pages/api/user-settings.ts`, `src/pages/api/plans/generate.ts`, `src/lib/services/plans.service.ts`

* **F1.1 (API):** `POST /api/user-settings` - Pomyślne utworzenie ustawień (201), próba ponownego utworzenia (409 Conflict), niepoprawne dane (400 Bad Request).
* **F1.2 (UI):** Formularz Onboardingu (`OnboardingPage.tsx`) - Walidacja pól (`daily_calories` 100-10000, `plan_length_days` 1-31).
* **F1.3 (UI):** Formularz Onboardingu - Przejście między krokami 1 i 2.
* **F1.4 (UI):** Wybór daty startowej (`StartDateSelector.tsx`) - Walidacja daty (nie może być z przeszłości - `validate` w `useOnboardingForm.ts`).
* **F1.5 (E2E):** Pomyślne wygenerowanie planu - Użytkownik wypełnia formularz, klika "Generuj plan", widzi `BlockingLoader`, a następnie zostaje przekierowany na stronę planu (`/plans/[id]`).
* **F1.6 (API):** `POST /api/plans/generate` - Walidacja schematu `createPlanCommandSchema` (np. `start_date` musi być w przyszłości).
* **F1.7 (API):** `POST /api/plans/generate` - Próba wygenerowania planu, gdy istnieje już aktywny plan (oczekiwany 409 Conflict).
* **F1.8 (Logika Biznesowa):** Weryfikacja danych wygenerowanego planu - Sprawdzenie, czy `plan_days` zgadzają się z `plan_length_days`, czy `plan_day_slot_targets` sumują się do `daily_calories` (zgodnie z rozkładem 25/35/35/5).
* **F1.9 (Logika Biznesowa):** Weryfikacja logiki wieloporcjowej (`multi-portion`) - Wygenerowanie planu 7-dniowego i sprawdzenie, czy w bazie danych istnieją posiłki z `multi_portion_group_id`, `is_leftover: true` i `portions_to_cook: null` (dla dnia 2) oraz `is_leftover: false` i `portions_to_cook: [liczba]` (dla dnia 1).

### F2: Dashboard - Lista Planów (Wysoki)
**Pliki:** `src/components/dashboard/`, `src/pages/api/plans/index.ts`

* **F2.1 (UI):** Wyświetlanie stanu ładowania (`SkeletonList.tsx`).
* **F2.2 (UI):** Wyświetlanie stanu błędu (`state.status === "error"`).
* **F2.3 (UI):** Wyświetlanie stanu pustego (`PlansListContent.tsx` gdy `items.length === 0`).
* **F2.4 (Funkcjonalne):** Paginacja (`PaginationControls.tsx`) - Przechodzenie przód/tył, wyłączanie przycisków na pierwszej/ostatniej stronie.
* **F2.5 (Funkcjonalne):** Filtrowanie (`PlansToolbar.tsx`) - Zmiana filtra (Aktywne, Archiwalne) i weryfikacja, czy API jest wywoływane z poprawnymi parametrami (`?state=...`).
* **F2.6 (Funkcjonalne):** Karta Planu (`PlanCard.tsx`) - Poprawne wyświetlanie etykiet i kolorów dla różnych statusów (`active`, `archived`, `cancelled`).
* **F2.7 (Logika Biznesowa):** Logika przycisku "Generuj plan" - Przycisk jest wyłączony (`disabled`) i ma `Tooltip`, jeśli `hasActivePlan: true`.

### F3: Przegląd Planu (Wysoki)
**Pliki:** `src/components/planOverview/`, `src/pages/api/plans/[id].ts`

* **F3.1 (UI):** Wyświetlanie stanu ładowania (`LoadingState.tsx`) i błędu (`ErrorState.tsx`).
* **F3.2 (UI):** Nagłówek Planu (`PlanHeader.tsx`) - Poprawne wyświetlanie zakresu dat, statusu oraz paska postępu (`completionPercentage`, `completedMeals` / `totalMeals`).
* **F3.3 (UI):** Kalendarz (`PlanCalendarStrip.tsx`) - Kliknięcie na `DateBadge` powinno płynnie przewinąć stronę do odpowiedniej karty dnia (`DayCard`).
* **F3.4 (UI):** Karta Dnia (`DayCard.tsx`) - Poprawne wyświetlanie sumy kalorii, statusu (Ukończony, W trakcie) i miniatur posiłków.
* **F3.5 (Logika Biznesowa):** Miniatura Posiłku (`MealMiniature.tsx`) - Weryfikacja, czy posiłki wieloporcjowe mają poprawne badge ("Ugotuj na 2 dni" / "Resztki").
* **F3.6 (Funkcjonalne):** Menu Akcji (`ActionMenu.tsx`) - Przycisk "Archiwizuj" jest wyłączony, jeśli postęp jest < 90%.
* **F3.7 (E2E):** Archiwizacja Planu - Użytkownik klika "Archiwizuj", potwierdza w `ConfirmDialog`, stan planu zmienia się na "Ukończony" (w UI) / "archived" (w API).
* **F3.8 (E2E):** Anulowanie Planu - Użytkownik klika "Anuluj", potwierdza, zostaje przekierowany na `/dashboard` (zgodnie z `usePlanActions.ts`).

### F4: Widok Dnia Planu (Krytyczny)
**Pliki:** `src/components/planDay/`, `src/pages/api/plans/[plan_id]/days/[date].ts`

* **F4.1 (UI):** Wyświetlanie stanu ładowania (Skeleton) i błędu.
* **F4.2 (UI):** Nawigacja (`DayNavigator.tsx`) - Przechodzenie przód/tył, przyciski wyłączone na pierwszym/ostatnim dniu planu.
* **F4.3 (UI):** Karta Posiłku (`MealCard.tsx`) - Poprawne wyświetlanie danych (kalorie, czas, składniki).
* **F4.4 (UI):** Karta Posiłku - Rozwijanie/zwijanie listy składników.
* **F4.5 (UI):** Karta Posiłku - Poprawne wyświetlanie tekstu dla posiłków wieloporcjowych (`multiPortionText`).
* **F4.6 (UI):** Slot Posiłku (`MealSlot.tsx`) - Poprawne wyświetlanie "Brak zaplanowanego posiłku", jeśli `slot.meal` jest `null`.
* **F4.7 (E2E):** Otworzenie Modalu Przepisu - Kliknięcie "Ugotuj" otwiera `RecipePreviewModal` z poprawnymi danymi (składniki, przygotowanie, link Cookido).

### F5: Zarządzanie Posiłkiem (Krytyczny)
**Pliki:** `MealCard.tsx`, `SwapModal.tsx`, `planDay/hooks.ts`, `api/plan-meals/`

* **F5.1 (Funkcjonalne):** Zmiana Statusu Posiłku - Kliknięcie "✓" (ukończony) zmienia styl karty i wysyła żądanie `updateMealStatus`. Ponowne kliknięcie cofa status do 'planned'.
* **F5.2 (Funkcjonalne):** Zmiana Statusu Posiłku - Kliknięcie "X" (pominięty) zmienia styl karty.
* **F5.3 (API):** `GET /api/plan-meals/[id]/alternatives` - Weryfikacja, czy zwracane są alternatywy (poprawny slot, podobne kalorie).
* **F5.4 (E2E):** Wymiana Posiłku (Swap) - Kliknięcie "Wymień" -> Otwarcie `SwapModal` -> Załadowanie alternatyw -> Wybranie alternatywy -> Kliknięcie "Wymień".
* **F5.5 (Weryfikacja):** Po wymianie (F5.4), modal się zamyka, a widok dnia odświeża się (przez `invalidateQueries`), pokazując nowy posiłek.
* **F5.6 (API):** `POST /api/plan-meals/[id]/swap` - Testowanie przypadków brzegowych (np. nieistniejący `new_recipe_id`, próba wymiany posiłku o statusie 'completed').
* **F5.7 (Integracyjne):** Wymiana posiłku wieloporcjowego - Weryfikacja, czy `POST .../swap` dla posiłku z `multi_portion_group_id` aktualizuje *oba* posiłki (dzień 1 i dzień 2) w grupie (zgodnie z logiką w `performSwapTransaction`).

### F6: API Przepisów (Średni)
**Pliki:** `src/pages/api/recipes/`

* **F6.1 (API):** `GET /api/recipes` - Testowanie paginacji (`limit`, `offset`).
* **F6.2 (API):** `GET /api/recipes` - Testowanie filtrów: `slot`, `min_calories`, `max_calories`, `search`. Weryfikacja poprawności wyników.
* **F6.3 (API):** `GET /api/recipes/[id]` - Poprawne pobranie przepisu (200), nieistniejący przepis (404), niepoprawny ID (400).

---

## 4. 🧭 Strategia Testowania

1.  **Strategia "API-First":**
   * Testowanie rozpocznie się od punktów końcowych API. Każdy endpoint zostanie przetestowany w izolacji przy użyciu narzędzi takich jak Postman (zautomatyzowane w Newman).
   * Tylko po potwierdzeniu stabilności API rozpoczną się pełne testy E2E.
2.  **Testowanie Oparte na Ryzyku (Risk-Based Testing):**
   * Najwyższy priorytet i najwięcej zasobów zostanie przeznaczone na obszary o krytycznym ryzyku biznesowym (patrz `Identyfikacja Ryzyk`, R-01, R-02).
   * Obszary te to: **Generowanie Planu** i **Wymiana Posiłków (Swap)**.
3.  **Testowanie Oparte na Przepływach Użytkownika (E2E):**
   * Kluczowe przepływy (np. "Happy Path" od onboardingu do archiwizacji planu) zostaną zautomatyzowane przy użyciu Playwright lub Cypress.
4.  **Testowanie Eksploracyjne (Exploratory Testing):**
   * Po zakończeniu testów scenariuszowych, testerzy przeprowadzą sesje eksploracyjne, aby zidentyfikować nieoczekiwane błędy, zwłaszcza w logice `react-query` (np. niespójność cache).

---

## 5. 🛠️ Rodzaje Testów

| Rodzaj Testu | Opis | Narzędzia | Priorytet |
| :--- | :--- | :--- | :--- |
| **Testy API** | Walidacja kontraktów (schematy Zod), kodów statusu, logiki biznesowej endpointów. | Postman / Newman | **Krytyczny** |
| **Testy Jednostkowe** | (Wykonywane przez deweloperów) Weryfikacja logiki w `hooks`, `services` i `transforms`. | Vitest / Jest | - |
| **Testy Integracyjne** | Weryfikacja poprawności współpracy modułów (np. `plans.service` z `recipes.service` podczas generowania planu; UI z API). | Playwright / Testy API | **Wysoki** |
| **Testy E2E** | Testowanie pełnych przepływów użytkownika (Onboarding -> Archiwizacja). | Playwright / Cypress | **Wysoki** |
| **Testy Walidacyjne** | Testowanie logiki walidacji (formularze UI, schematy Zod w API) danymi brzegowymi i niepoprawnymi. | Postman / Playwright | **Wysoki** |
| **Testy UI/UX** | Weryfikacja stanów (Loading, Error, Empty), spójności interfejsu, poprawności `Breadcrumbs`. | Manualne | **Średni** |
| **Testy RWD** | Weryfikacja działania aplikacji na różnych rozmiarach ekranu (Mobile, Tablet, Desktop). | Narzędzia deweloperskie przeglądarki | **Średni** |
| **Testy A11y** | Podstawowa weryfikacja dostępności (kontrast, nawigacja klawiaturą, atrybuty ARIA). | Lighthouse / Axe | **Niski** |
| **Testy Regresji** | Zestaw zautomatyzowanych testów (API + E2E) uruchamiany przed każdym wdrożeniem. | CI/CD (np. GitHub Actions) | **Krytyczny** |

---

## 6. 🌍 Środowisko Testowe i Dane

### 6.1. Środowiska
* **Lokalne (Local):** Deweloperzy uruchamiają testy jednostkowe i podstawowe testy API.
* **Testowe (QA/Staging):** Główne środowisko do testów manualnych, automatycznych E2E i API. Powinno być zintegrowane z osobną bazą Supabase (kopią produkcyjnej struktury).
* **Produkcyjne (Prod):** Po pomyślnym przejściu testów na QA.

### 6.2. Narzędzia
* **Zarządzanie Testami:** JIRA (dla scenariuszy i błędów).
* **Testy API:** Postman (manualne) i Newman (automatyzacja w CI).
* **Testy E2E/Automatyzacja UI:** Playwright lub Cypress.
* **Przeglądarki:** Chrome, Firefox, Safari (desktop + mobile).

### 6.3. Dane Testowe (Krytyczny Warunek Wstępny)
* **Wymaganie Kluczowe:** Środowisko testowe QA **musi** mieć dostęp do bazy Supabase zasilonej danymi.
* **Wymagane Dane:**
   * Tabela `recipes`: Musi zawierać co najmniej 100-200 przepisów z poprawnie wypełnionymi `calories_kcal`, `portions`, `is_active`.
   * Tabela `recipe_slots`: Musi zawierać powiązania dla każdego przepisu (np. który przepis pasuje do `breakfast`, `lunch` itd.).
* **Blokada:** Bez tych danych, testowanie modułów F1 (Generowanie Planu), F4, F5 i F6 jest **niemożliwe**.

---

## 7. ⚠️ Identyfikacja Ryzyk

| ID | Ryzyko | Prawdopodobieństwo | Wpływ | Plan Mitigacji |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | **Brak danych testowych (przepisów)** w bazie Supabase. | Wysokie | **Krytyczny** | Priorytetowe zasilenie bazy QA danymi (skryptem, kopią). **Blokada testów** do czasu rozwiązania. |
| **R-02** | **Błędy w logice generowania planu** (F1.8, F1.9) - np. zły dobór kalorii, błędy w logice wieloporcjowej. | Średnie | **Krytyczny** | Intensywne testy API (`generatePlan`), weryfikacja każdego wygenerowanego posiłku (kalorie, status `is_leftover`). |
| **R-03** | **Błędy w logice wymiany (Swap)** (F5.4, F5.7) - np. wymiana posiłku wieloporcjowego psuje drugi dzień. | Średnie | Wysoki | Dedykowane scenariusze integracyjne dla `swap` i `multi-portion`. Testowanie API `swap` przed UI. |
| **R-04** | **Niespójność stanu UI** z powodu błędów `react-query` (np. brak `invalidateQueries` po akcji). | Średnie | Średni | Testy eksploracyjne, weryfikacja odświeżania danych po każdej akcji MUTATE (Update Status, Swap, Archive). |
| **R-05** | **Wydajność `POST /api/plans/generate`** - zbyt długi czas generowania planu. | Wysokie | Średni | Pomiar czasu odpowiedzi API. Jeśli > 5-10 sekund, zgłoszenie jako błąd wydajnościowy. |
| **R-06** | Problemy z responsywnością (RWD) na urządzeniach mobilnych. | Wysokie | Niski | Dedykowana sesja testów RWD dla kluczowych widoków (`dashboard`, `planDay`). |

---

## 8. 🏁 Kryteria Wejścia / Wyjścia

### 8.1. Kryteria Wejścia (Rozpoczęcia Testów)
1.  Wszystkie kluczowe funkcjonalności (F1-F7) są "feature complete" i wdrożone na środowisko QA.
2.  Środowisko QA jest stabilne.
3.  **Baza danych Supabase (QA) jest dostępna i zasilona danymi testowymi (przepisy, sloty).**
4.  Dostęp do dokumentacji API (lub kodu `src/pages/api/`) jest zapewniony.

### 8.2. Kryteria Wyjścia (Zakończenia Testów)
1.  Wszystkie zautomatyzowane testy API (Kolekcja Postman) przechodzą (100% pass).
2.  Wszystkie zautomatyzowane testy E2E (Krytyczne przepływy) przechodzą (100% pass).
3.  Wszystkie scenariusze testowe (manualne) o priorytecie Krytycznym i Wysokim zostały wykonane.
4.  **Brak otwartych błędów o priorytecie Krytycznym (Blocker).**
5.  Mniej niż 3 otwarte błędy o priorytecie Wysokim (High).
6.  Wszystkie zgłoszone błędy zostały przeanalizowane przez zespół deweloperski.

---

## 9. 📋 Rezultaty Testów (Test Deliverables)

* **Plan Testów:** Ten dokument.
* **Scenariusze i Przypadki Testowe:** Przechowywane w systemie JIRA/TestRail.
* **Kolekcja Testów API:** Kolekcja Postman/Newman (wersjonowana).
* **Skrypty Testów E2E:** Repozytorium kodu (Playwright/Cypress).
* **Raporty o Błędach:** Zgłoszenia w JIRA.
* **Raport Końcowy z Testów:** Podsumowanie wykonanych testów, pokrycia, znalezionych błędów i rekomendacja (Go / No-Go).