# Plan implementacji widoku Onboarding

## 1. Przegląd
Widok `/onboarding` to dwukrokowy kreator pierwszego uruchomienia, którego celem jest zebranie od nowego użytkownika ustawień domyślnych: docelowych dziennych kalorii (`daily_calories`) i długości planu (`plan_length_days`) oraz wyboru daty rozpoczęcia planu (opcje: dzisiaj, jutro, najbliższy poniedziałek). Po zatwierdzeniu danych widok synchronnie wywołuje generowanie planu (serwerowy proces), wyświetla pełnoekranowy loader blokujący interakcję i pokazuje sukces lub błąd.

## 2. Routing widoku
- Ścieżka: `/onboarding`
- Wymagania dostępu: widok dostępny tylko dla zalogowanych użytkowników; jeśli niezalogowany, przekierować do logowania (użyć `AuthGuard` lub middleware). 

## 3. Struktura komponentów
- `OnboardingPage` (strona routowa)
  - `AuthGuard` (opcjonalnie, wrapper)
  - `OnboardingLayout` (opcjonalny layout stron kreatora)
  - `PlanGeneratorForm` (główny formularz, krok 1)
  - `StartDateSelector` (krok 2 — wyboru daty)
  - `BlockingLoader` (full-screen loader)
  - `Toast` (globalne powiadomienia)

Drzewo komponentów (wysokopoziomowo):
- `OnboardingPage`
  - `AuthGuard`
    - `OnboardingLayout`
      - `PlanGeneratorForm`
        - `NumericInput` (reusable)
        - `Select` / `RadioGroup` (plan length)
        - `Button` (next / submit)
      - `StartDateSelector`
      - `BlockingLoader` (portal/modal)
      - `ToastProvider` (globalny kontekst jeśli nie globalny)

## 4. Szczegóły komponentów
### `OnboardingPage`
- Opis: Strona routowa dostępna na `/onboarding`. Odpowiada za kompozycję i logikę kroków kreatora.
- Główne elementy: `AuthGuard`, nagłówek, `PlanGeneratorForm`, `StartDateSelector`, `BlockingLoader`, `Toast`.
- Obsługiwane zdarzenia: inicjalizacja formularza, przejście między krokami, wywołanie zapisu, obsługa odpowiedzi serwera.
- Walidacja: deleguje do `PlanGeneratorForm` i `StartDateSelector`.
- Typy: `OnboardingViewModel` (zob. sekcja `Typy`).
- Props: brak (routingowy page); pobiera `supabase` z `context.locals` lub klienta globalnego.

### `PlanGeneratorForm`
- Opis: Formularz zbierający `daily_calories` i `plan_length_days`. Ustala fokus początkowy na polu kalorii.
- Główne elementy:
  - `label` + `input[type=number]` (daily_calories)
  - `label` + `select` / `number` (plan_length_days) — wartość domyślna 7
  - `validation` messages
  - `Next` / `Generate Plan` button
- Obsługiwane zdarzenia:
  - `onChange` dla pól
  - `onSubmit` — waliduje, wywołuje `useOnboardingForm.submit()`
- Walidacja (szczegółowa):
  - `daily_calories`:
    - wymagane
    - liczba całkowita dodatnia (>= 100 minimalnie defensywnie)
    - maksymalny rozsądny limit (np. 10000) — walidacja klienta
  - `plan_length_days`:
    - wymagane
    - liczba całkowita dodatnia (>=1)
    - domyślnie 7
- Typy:
  - Props: `initialValues?: OnboardingViewModel`
  - Events: `onSubmit(values: OnboardingViewModel)`

### `StartDateSelector`
- Opis: Komponent wyboru daty startu z predefiniowanymi opcjami: `today`, `tomorrow`, `next_monday` oraz możliwość wyboru datepicker (opcjonalnie).
- Główne elementy: radio group + (opcjonalnie) date input
- Obsługiwane zdarzenia: `onChange(selectedDate: string)`
- Walidacja: wybrana data musi nie być wcześniejsza niż today.
- Typy: integruje się z `OnboardingViewModel.start_date`.

### `BlockingLoader`
- Opis: Full-screen overlay blokujący UI, pokazuje spinner i (opcjonalnie) komunikat "Generowanie planu...".
- Główne elementy: overlay, spinner, aria-live region dla dostępności.
- Obsługiwane zdarzenia: pokazywanie / ukrywanie przez props `open: boolean`.
- Typy: props `{ open: boolean, message?: string }`.

### `Toast` / `ToastProvider`
- Opis: System powiadomień do informowania o sukcesie/błędach.
- Główne elementy: komponenty z Shadcn/ui lub prosty kontekst.
- Obsługiwane zdarzenia: `showToast({ type, title, message })`.

## 5. Typy
Definiujemy ViewModel i lokalne typy używane przez komponenty (TypeScript).
- `OnboardingViewModel`:
  - `daily_calories: number`
  - `plan_length_days: number`
  - `start_date: string` (ISO yyyy-mm-dd)
- `OnboardingRequestDTO` (to co wysyłamy do API /api/user-settings):
  - `default_daily_calories: number` (mapowane z `daily_calories`)
  - `default_plan_length_days?: number` (mapowane z `plan_length_days`)
- `OnboardingResponseDTO` (zgodne z `src/pages/api/user-settings.ts` oraz `types.UserSettingsDTO`):
  - `data: { user_id: string; default_daily_calories: number; default_plan_length_days: number; created_at: string; updated_at: string }`
- `FormErrors`:
  - `{ daily_calories?: string; plan_length_days?: string; start_date?: string }`

(Uwaga: `types.ts` już posiada `CreateUserSettingsCommand`, `UserSettingsDTO` — użyć ich zamiast tworzyć duplikatów, ale ViewModel nadal potrzebny lokalnie.)

## 6. Zarządzanie stanem i hooki
Zalecane: lokalny stan formularza z użyciem custom hooka `useOnboardingForm`.
- `useOnboardingForm` - odpowiedzialny za:
  - przechowywanie `values: OnboardingViewModel`
  - `errors: FormErrors`
  - `isSubmitting: boolean`
  - `setField(name, value)`
  - `validate()` zwracające `boolean` i uzupełniające `errors`
  - `submit()` — wykonuje wywołanie API oraz zarządza `BlockingLoader`, success toast i nawigacją po sukcesie
- Dlaczego hook: izoluje logikę walidacji i side-effectów (API call, loading, toasty), ułatwia testy i ponowne użycie.

## 7. Wywołania API i akcje frontendowe
- Endpointy:
  - POST `/api/user-settings` — tworzy ustawienia użytkownika.
    - Request body: `{ default_daily_calories: number, default_plan_length_days?: number }`
    - Success: 201 + `data` (UserSettingsDTO)
    - Error: 400 (validation), 409 (already exists), 500
- Kolejność akcji po submit:
  1. Walidacja lokalna `validate()`
  2. Ustaw `isSubmitting = true` i `BlockingLoader.open = true`
  3. Wywołanie `fetch` / `supabase` POST (z tokenem CSRF/authorization w nagłówkach jeśli wymagane)
  4. Obsługa odpowiedzi: sukces -> show toast, redirect do /plans lub / (wg PRD); błąd -> show toast z error message, ukryj loader

## 8. Mapowanie do User Stories
- US-004 (Konfiguracja celu i długości planu)
  - `PlanGeneratorForm` implementuje pola i walidację
  - Domyślna długość ustawiona na 7
  - Formularz waliduje i umożliwia przejście dalej
  - Po zatwierdzeniu `submit()` wywołuje POST `/api/user-settings` i pokazuje loader

## 9. Interakcje użytkownika i oczekiwane wyniki
- Wejście na `/onboarding` zalogowanym: widok formularza z fokus na polu kalorii
- Wprowadzenie nieprawidłowych wartości: walidacja inline i zablokowanie submit
- Klik `Generuj plan`: pełnoekranowy `BlockingLoader`, oczekiwanie na odpowiedź
- Sukces: toast sukcesu, przekierowanie do głównego widoku aplikacji (np. `/plans` lub `/`) oraz ewentualne pobranie nowego planu / odświeżenie danych
- Błąd 400: pokazanie komunikatu walidacji
- Błąd 409: informacja że ustawienia już istnieją (możliwość przekierowania do istniejącego planu)
- Błąd 500 / sieć: toast błędu i opcja ponowienia (retry)

## 10. Weryfikacja warunków wymaganych przez API na poziomie komponentów
- `default_daily_calories` musi być liczbą dodatnią -> walidacja `daily_calories` musi zapewnić to przed wysłaniem
- `default_plan_length_days` musi być liczbą dodatnią -> walidacja `plan_length_days`
- Request body minimalny: `{ default_daily_calories }` — `plan_length_days` opcjonalne, ale domyślnie wypełniamy 7
- Na poziomie UI: nie wysyłać jeśli pola nieprzejdą walidacji. W nagłówkach wysyłać token autoryzacji (jeśli Supabase klient używany, użyć supabase.auth.getSession() lub context.locals.supabase)

## 11. Scenariusze błędów i obsługa
- UX: pokaż zrozumiały komunikat użytkownikowi; loguj szczegóły błędu po stronie klienta (console.error) i, jeśli skonfigurowane, wysyłaj do Sentry
- Błędy walidacji 400: przypisać wiadomości do `errors` i skupić pierwszy błąd (set focus)
- Konflikt 409: zaoferować przekierowanie do istniejących ustawień lub planu
- Błąd sieci: retry z przyciskiem, lub automatyczne próby z backoff (opcjonalnie)
- Timeout: timeout fetcha po X sekund i komunikat
- Nieautoryzowany: jeśli serwer zwróci 401/403, wylogować i przekierować do logowania

## 12. Wyzwania implementacyjne i rekomendowane rozwiązania
- Autoryzacja / tokeny: preferować korzystanie z istniejącego klienta Supabase (dostępnego w `context.locals` na SSR lub globalnie w kliencie) i wysyłać żądanie przez serwer przy użyciu sesji. Jeśli wymagane CSRF, upewnić się, że nagłówki są ustawione.
- Dostępność: ustawić aria-live dla loadera i toastów, focus management po błędach.
- Blokujący loader: zastosować overlay z odpowiednimi atrybutami `aria-hidden`/`aria-busy`.
- Walidacja: korzystać z Zod lub ręcznej walidacji w hooku; zabezpieczyć również backend (backend już waliduje).
- UX: minimalizować liczbę pól na ekranie (prostota), jasne komunikaty błędów.

---

Poniżej zapiszę finalny plan wdrożenia (plik markdown).
