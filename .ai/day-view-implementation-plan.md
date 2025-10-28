# Plan implementacji widoku Dnia Planu (Plan Day)

## 1. Przegląd
Widok Dnia Planu jest kluczowym ekranem aplikacji, który prezentuje użytkownikowi szczegółowy jadłospis na wybrany dzień. Jego celem jest czytelne wyświetlenie czterech posiłków (śniadanie, obiad, kolacja, przekąska) wraz z ich kluczowymi atrybutami. Widok umożliwia interakcje takie jak zmiana statusu posiłku (zjedzony, pominięty), wymiana na inną propozycję oraz podgląd szczegółów przepisu. Kładzie również duży nacisk na wizualne oznaczanie i logikę posiłków wieloporcjowych ("gotuj na 2 dni" / "resztki"), aby wspierać oszczędność czasu użytkownika.

## 2. Routing widoku
Widok będzie dostępny pod dynamiczną ścieżką, która identyfikuje konkretny plan i dzień:
- **Ścieżka**: `/plans/[plan_id]/days/[date]`
- **Przykłady**:
    - `/plans/123/days/2025-10-26`
    - `/plans/456/days/2025-11-01`
- **Komponent Astro**: `src/pages/plans/[id]/days/[date].astro` będzie odpowiedzialny za przechwycenie parametrów z URL i renderowanie klienckiego komponentu React.

## 3. Struktura komponentów
Hierarchia komponentów React, które zbudują widok, została zaprojektowana w celu separacji odpowiedzialności i reużywalności.

```
PlanDayPage.astro
└── PlanDayView.tsx (Główny komponent kliencki)
    ├── DayNavigator.tsx (Nawigacja między dniami)
    ├── MealSlot.tsx (Kontener na posiłek, x4)
    │   └── MealCard.tsx (Karta z detalami posiłku)
    │       ├── LeftoverBadge.tsx (Warunkowo, dla resztek)
    │       └── (Przyciski akcji: Zmiana statusu, Wymiana, Podgląd)
    ├── RecipePreviewModal.tsx (Modal z podglądem przepisu)
    └── SwapModal.tsx (Modal do wymiany posiłku)
```

## 4. Szczegóły komponentów

### `PlanDayView.tsx`
- **Opis**: Główny komponent React, który orkiestruje całym widokiem. Używa customowego hooka `usePlanDayQuery` do pobrania danych, obsługuje stany ładowania i błędów, a następnie renderuje podkomponenty.
- **Główne elementy**: `div` jako kontener, warunkowe renderowanie `LoadingSpinner`, `ErrorMessage` lub właściwej zawartości widoku.
- **Obsługiwane interakcje**: Brak bezpośrednich, deleguje obsługę do komponentów dzieci.
- **Typy**: `PlanDayViewModel`
- **Propsy**: `{ planId: number, date: string }`

### `DayNavigator.tsx`
- **Opis**: Wyświetla aktualnie wybraną datę i umożliwia nawigację do poprzedniego i następnego dnia w ramach aktywnego planu.
- **Główne elementy**: Przyciski `<button>` lub linki `<a>` dla nawigacji, element `<span>` lub `<h3>` do wyświetlania daty. Może zawierać komponent `DatePicker` do szybkiego skoku do dowolnego dnia.
- **Obsługiwane interakcje**: Kliknięcie "Poprzedni dzień", "Następny dzień", wybór daty z pickera.
- **Warunki walidacji**: Przyciski nawigacji są nieaktywne, jeśli użytkownik jest na pierwszym lub ostatnim dniu planu.
- **Propsy**: `{ currentDate: string, planStartDate: string, planEndDate: string, planId: number }`

### `MealSlot.tsx`
- **Opis**: Reprezentuje pojedynczy slot posiłku (np. "Śniadanie"). Wyświetla nazwę slotu, docelową kaloryczność i renderuje komponent `MealCard` dla przypisanego posiłku.
- **Główne elementy**: `section`, `h3` dla tytułu slotu, `span` dla kalorii, `MealCard`.
- **Propsy**: `{ title: string, targetCalories: number, meal: MealViewModel | null }`

### `MealCard.tsx`
- **Opis**: Wyświetla wszystkie informacje o pojedynczym posiłku i jest centrum interakcji użytkownika. Pokazuje nazwę, zdjęcie, kalorie, czas przygotowania, status oraz specjalne oznaczenia dla posiłków wieloporcjowych.
- **Główne elementy**: `article` (kontener), `img` (zdjęcie), `h4` (nazwa), `div` z ikonami i tekstem dla metadanych (kalorie, czas), przyciski akcji, warunkowo renderowany `LeftoverBadge`.
- **Obsługiwane interakcje**:
    - Zmiana statusu (kliknięcie ikony "ukończony" lub "pomiń").
    - Inicjacja wymiany (kliknięcie przycisku "Wymień").
    - Otwarcie podglądu przepisu (kliknięcie nazwy lub przycisku "Zobacz").
- **Warunki walidacji**: Przycisk "Wymień" jest aktywny tylko dla posiłków o statusie `planned`.
- **Typy**: `MealViewModel`
- **Propsy**: `{ meal: MealViewModel }`

## 5. Typy
Do implementacji widoku potrzebne będą nowe, szczegółowe modele widoku (ViewModel), które transformują surowe dane z API na format przyjazny dla UI.

```typescript
// ViewModel dla całego widoku dnia
interface PlanDayViewModel {
  date: string; // "2025-10-26"
  formattedDate: string; // "26 października 2025"
  dayOfWeek: string; // "Niedziela"
  planId: number;
  planStartDate: string;
  planEndDate: string;
  slots: {
    breakfast: MealSlotViewModel;
    lunch: MealSlotViewModel;
    dinner: MealSlotViewModel;
    snack: MealSlotViewModel;
  };
}

// ViewModel dla pojedynczego slotu
interface MealSlotViewModel {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  targetCalories: number;
  meal: MealViewModel | null; // Slot może być pusty
}

// ViewModel dla pojedynczego posiłku
interface MealViewModel {
  id: number;
  status: 'planned' | 'completed' | 'skipped';
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: number;
  name: string;
  imageUrl: string | null;
  timeMinutes: number;
  caloriesPlanned: number;
  servings: number;
  cookidoUrl: string;
  
  // Pola do logiki posiłków wieloporcjowych
  isMultiPortionCookDay: boolean; // Czy to dzień gotowania na zapas?
  isMultiPortionLeftoverDay: boolean; // Czy to dzień jedzenia resztek?
  multiPortionText: 'Ugotuj na 2 dni' | 'Resztki z wczoraj' | null;
}
```

## 6. Zarządzanie stanem
Zarządzanie stanem serwera (dane dnia) będzie realizowane przez dedykowane hooki, zbudowane w oparciu o bibliotekę TanStack Query.

- **`usePlanDayQuery(planId: number, date: string)`**:
    - Odpowiedzialny za pobieranie, cachowanie i odświeżanie danych dla widoku dnia z endpointu `GET /api/plans/{plan_id}/days/{date}`.
    - Zwraca `{ data: PlanDayViewModel | undefined, isLoading, isError, refetch }`.
    - Dane z DTO będą transformowane do `PlanDayViewModel` wewnątrz tego hooka.

- **`useUpdateMealStatus()`**:
    - Zbudowany przy użyciu `useMutation` z TanStack Query do obsługi zmiany statusu posiłku.
    - Implementuje **optymistyczne aktualizacje**: UI jest aktualizowane natychmiast, a żądanie `PATCH /api/plan-meals/{id}` jest wysyłane w tle. W przypadku błędu, zmiana w UI jest automatycznie wycofywana.
    - Zwraca `{ mutate: (vars: { mealId, status }) => void, isLoading }`.

- **Stan lokalny**: Zwykły `useState` będzie używany do zarządzania stanem UI, np. widocznością modali (`isSwapModalOpen`).

## 7. Integracja API

- **Pobieranie danych dnia**:
    - **Endpoint**: `GET /api/plans/{plan_id}/days/{date}`
    - **Wywołanie**: Przez `usePlanDayQuery` przy montowaniu komponentu `PlanDayView`.
    - **Typ odpowiedzi (DTO)**: `PlanDayDTO` (zgodnie z dokumentacją).

- **Aktualizacja statusu posiłku**:
    - **Endpoint**: `PATCH /api/plan-meals/{id}`
    - **Wywołanie**: Przez mutację `useUpdateMealStatus`.
    - **Typ żądania**: `{ "status": "completed" | "skipped" }`

- **Wymiana posiłku**:
    - **Krok 1: Pobranie alternatyw**
        - **Endpoint**: `GET /api/plan-meals/{id}/alternatives`
        - **Wywołanie**: Wewnątrz `SwapModal` po jego otwarciu.
    - **Krok 2: Potwierdzenie wymiany**
        - **Endpoint**: `POST /api/plan-meals/{id}/swap`
        - **Wywołanie**: Po wybraniu alternatywy i kliknięciu "Potwierdź" w `SwapModal`.
        - **Typ żądania**: `{ "alternative_recipe_id": number }`
        - **Po sukcesie**: Należy unieważnić query dla danego dnia (i potencjalnie następnego, jeśli dotyczyło to posiłku wieloporcjowego), aby pobrać świeże dane.

## 8. Interakcje użytkownika

- **Nawigacja między dniami**: Kliknięcie strzałek w `DayNavigator` powoduje zmianę `date` w URL, co prowadzi do ponownego pobrania danych dla nowego dnia.
- **Zmiana statusu posiłku**: Kliknięcie na ikonę statusu na `MealCard` natychmiast zmienia jej wygląd (np. dodaje zieloną ramkę, zmienia ikonę) i w tle wysyła żądanie do API.
- **Wymiana posiłku**: Kliknięcie "Wymień" otwiera `SwapModal`. Po wybraniu nowej potrawy i potwierdzeniu, modal się zamyka, a `MealCard` w widoku dnia aktualizuje się, wyświetlając nowy posiłek.
- **Podgląd przepisu**: Kliknięcie na `MealCard` otwiera `RecipePreviewModal` z dodatkowymi informacjami, nie przerywając głównego widoku.

## 9. Warunki i walidacja
- **Nawigacja**: Przyciski do nawigacji w `DayNavigator` są wyłączone (`disabled`), jeśli użytkownik znajduje się na granicznych datach swojego planu (pierwszy lub ostatni dzień).
- **Akcje na posiłku**: Przycisk "Wymień" na `MealCard` jest dostępny tylko wtedy, gdy `meal.status` to `'planned'`. Nie można wymieniać posiłków już zjedzonych lub pominiętych.
- **Puste sloty**: Widok musi poprawnie renderować się, gdy dla danego slotu nie ma przypisanego posiłku (`meal: null`). W takim przypadku `MealSlot` powinien wyświetlić informację np. "Brak zaplanowanego posiłku".

## 10. Obsługa błędów
- **Błąd ładowania danych (np. 404, 500)**: Jeśli `usePlanDayQuery` zwróci błąd, `PlanDayView` powinien wyświetlić komponent `ErrorState` z odpowiednim komunikatem (np. "Nie znaleziono dnia planu" lub "Wystąpił błąd serwera") i przyciskiem "Spróbuj ponownie", który wywoła funkcję `refetch`.
- **Błąd zmiany statusu**: Dzięki optymistycznemu UI z rollbackiem, w przypadku błędu `PATCH` karta posiłku automatycznie wróci do poprzedniego stanu. Dodatkowo, powinien pojawić się nietrwały komunikat (toast) informujący użytkownika, że "Nie udało się zapisać zmiany".
- **Błąd wymiany posiłku**: Błąd powinien być obsłużony wewnątrz `SwapModal`, wyświetlając komunikat bezpośrednio w oknie dialogowym, bez zamykania go, aby użytkownik mógł spróbować ponownie.

## 11. Kroki implementacji
1.  **Struktura plików**: Stwórz plik `src/pages/plans/[id]/days/[date].astro` oraz folder `src/components/planDay/` na nowe komponenty React.
2.  **Typy i transformacje**: Zdefiniuj typy `PlanDayViewModel`, `MealSlotViewModel`, `MealViewModel` w pliku `src/components/planDay/types.ts`. Stwórz funkcję transformującą DTO na ViewModel.
3.  **Hooki danych**: Zaimplementuj `usePlanDayQuery` i `useUpdateMealStatus` używając TanStack Query.
4.  **Komponent `PlanDayPage.astro`**: Utwórz stronę Astro, która pobiera `planId` i `date` z URL i renderuje komponent `PlanDayView`, przekazując mu te dane jako propsy.
5.  **Komponent `PlanDayView.tsx`**: Zbuduj główny komponent, zintegruj go z `usePlanDayQuery` i dodaj logikę obsługi stanów `isLoading` i `isError`.
6.  **Komponenty `MealSlot` i `MealCard`**: Stwórz komponenty do wyświetlania slotów i posiłków. Zaimplementuj logikę warunkowego renderowania dla oznaczeń wieloporcjowych i statusów.
7.  **Komponent `DayNavigator`**: Zbuduj nawigację z logiką włączania/wyłączania przycisków na podstawie dat granicznych planu.
8.  **Interaktywność**: Podłącz akcje użytkownika w `MealCard` do hooka `useUpdateMealStatus` oraz zaimplementuj logikę otwierania modali.
9.  **Modale (`SwapModal`, `RecipePreviewModal`)**: Stwórz komponenty modali, logikę pobierania danych dla `SwapModal` i podłącz je do stanu widoczności w `PlanDayView`.
10. **Stylowanie i testowanie**: Użyj Tailwind CSS i shadcn/ui do ostylowania wszystkich komponentów zgodnie z designem. Przetestuj wszystkie interakcje, przypadki brzegowe i obsługę błędów.
