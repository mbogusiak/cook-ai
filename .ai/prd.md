# Planer Żywieniowy - PRD

## 1. Wprowadzenie i Cele Biznesowe

### 1.1. Wizja produktu

Stworzenie inteligentnego i intuicyjnego asystenta planowania diety dla użytkowników urządzenia Thermomix, który automatyzuje proces tworzenia spersonalizowanych jadłospisów, promując zdrowe nawyki żywieniowe, oszczędność czasu i pełne wykorzystanie ekosystemu Cookido.

###  1.2. Cele Produktu
Cel 1: Uproszczenie i oszczędność czasu.
Stworzenie narzędzia, które w sposób odczuwalny skraca czas i wysiłek potrzebny do zaplanowania zbilansowanej diety. Produkt ma przejąć na siebie ciężar myślenia o kaloriach, posiłkach i organizacji, dając użytkownikowi gotowe, spersonalizowane rozwiązanie.

Cel 2: Zwiększenie różnorodności i walka z monotonią.
Dostarczenie narzędzia, które inspiruje i pomaga odkrywać nowe smaki. Celem jest przełamanie rutyny żywieniowej, aby zdrowe odżywianie było smaczną przygodą, a nie nudnym obowiązkiem.

Cel 3: Promowanie praktyczności i oszczędności.
Wspieranie inteligentnego zarządzania domową kuchnią. Dzięki funkcjom takim jak planowanie posiłków wieloporcjowych, produkt ma bezpośrednio pomagać użytkownikom oszczędzać czas na gotowaniu i pieniądze, ograniczając marnowanie żywności.

## 2. Przegląd produktu

Planer Żywieniowy to aplikacja internetowa zaprojektowana dla użytkowników urządzenia Thermomix, mająca na celu uproszczenie procesu tworzenia i zarządzania spersonalizowanymi planami dietetycznymi. Aplikacja, bazując na bogatej bibliotece ponad 6000 przepisów z platformy Cookido, automatycznie generuje plany żywieniowe na podstawie celów kalorycznych i preferencji użytkownika. Kluczowe funkcje obejmują inteligentne generowanie planu z opcją posiłków wieloporcjowych, elastyczną wymianę dań, śledzenie postępów oraz intuicyjny interfejs. Celem produktu jest dostarczenie użytkownikom narzędzia, które oszczędza czas, redukuje monotonię diety i wspiera ich w osiąganiu celów żywieniowych.

## 3. Problem użytkownika

Wiele osób, które chcą świadomie zarządzać swoją dietą, napotyka na szereg trudności. Główne problemy to:

- **Czasochłonność i złożoność**: Ręczne planowanie posiłków, liczenie kalorii i makroskładników jest pracochłonne, wymaga wiedzy i konsekwencji.
- **Monotonia diety i marnowanie jedzenia**: Użytkownicy często gotują w kółko te same potrawy, co prowadzi do spadku motywacji. Jednocześnie, gotowanie codziennie nowych potraw dla jednej osoby często prowadzi do marnowania składników.
- **Brak elastyczności**: Statyczne plany dietetyczne nie uwzględniają zmiennych preferencji, dostępności składników czy nagłej zmiany planów.
- **Trudność w śledzeniu postępów**: Bez prostego systemu monitorowania, użytkownikom ciężko jest ocenić, w jakim stopniu realizują swoje cele.
- **Niewykorzystany potencjał urządzenia**: Posiadacze Thermomixa mają dostęp do tysięcy przepisów, ale brakuje im narzędzia, które układałoby je w spójne, zbilansowane plany.

## 4. Założenia i Zależności

- **Dostęp do danych Cookido**: Zakładamy, że mamy stały i niezawodny dostęp do bazy danych przepisów Cookido, w tym do kluczowych informacji: nazwa, kaloryczność, czas przygotowania, zdjęcie oraz liczba porcji.
- **Jakość danych**: Zakładamy, że dane dotyczące kaloryczności i liczby porcji w Cookido są dokładne i wiarygodne.
- **Użytkownik posiada Thermomix**: Produkt jest skierowany do osób, które posiadają urządzenie Thermomix i mają dostęp do platformy Cookido.

## 5. Wymagania funkcjonalne

### 5.1. Uwierzytelnianie użytkownika

- Rejestracja i logowanie wyłącznie za pośrednictwem dostawców zewnętrznych: Google i Facebook.
- Utrzymywanie sesji użytkownika po pomyślnym zalogowaniu.
- Brak trybu gościa.

### 5.2. Onboarding i tworzenie planu

Nowy użytkownik przechodzi przez dwuetapowy kreator w celu stworzenia pierwszego planu:

- **Krok 1**: Użytkownik podaje docelowe dzienne zapotrzebowanie kaloryczne oraz długość planu w dniach (domyślnie 7).
- **Krok 2**: Użytkownik wybiera datę rozpoczęcia planu: dzisiaj, jutro, najbliższy poniedziałek (domyślnie).

Po zakończeniu kreatora, użytkownik zatwierdza dane przyciskiem **"Generuj plan"**.

### 5.3. Baza danych posiłków

- Baza danych posiłków pochodzi z platformy Cookido (>6000 przepisów).
- Każdy posiłek w aplikacji jest powiązany z konkretnym przepisem z Cookido i zawiera informację o liczbie porcji.

### 5.4. Logika generowania planu

Plan jest generowany dla 4 posiłków dziennie w stałych slotach: śniadanie, obiad, kolacja, przekąska.

**Dzienne zapotrzebowanie kaloryczne jest rozdzielane procentowo:**

- Śniadanie: 20%
- Obiad: 30%
- Kolacja: 30%
- Przekąska: 20%

Algorytm dobiera posiłki z bazy, których kaloryczność na porcję mieści się w zakresie ±20% docelowej kaloryczności dla danego slotu.

**Obsługa posiłków wieloporcjowych:**

- **Cel**: Oszczędność czasu użytkownika przez gotowanie raz na dwa dni.
- **Zasada**: Jeśli wybrany przez algorytm przepis na obiad lub kolację ma więcej niż 1 porcję, ten sam posiłek jest automatycznie planowany w tym samym slocie na następny dzień.
- Kaloryczność całego dania (np. na 2 porcje) jest rozkładana równomiernie na dwa dni. Całkowity bilans kaloryczny planu musi pozostać zachowany.
- Śniadania i przekąski domyślnie pozostają unikalne każdego dnia, chyba że analiza danych wykaże inaczej.
- Algorytm dąży do braku powtórzeń tych samych przepisów w pozostałych slotach w ramach jednego planu.

### 5.5. Wyświetlanie planu i posiłków

- Plan jest prezentowany w widoku dziennym z nawigacją między dniami.
- Każdy posiłek jest wyświetlany jako karta zawierająca: nazwę, zdjęcie, liczbę kalorii na porcję, szacowany czas przygotowania, tag slotu.
- Link do oryginalnego przepisu na Cookido.

**Wizualne oznaczenie posiłków wieloporcjowych:**

- Posiłek, który jest przygotowywany pierwszego dnia, powinien mieć oznaczenie, np. **"Ugotuj na 2 dni"**.
- Posiłek w dniu następnym powinien mieć wyraźne oznaczenie, np. **"Resztki z wczoraj"** lub ikona odgrzewania, oraz wizualne powiązanie z dniem poprzednim.

### 5.6. Interakcje z planem

- **Zmiana statusu posiłku**: zaplanowany (domyślny), ukończony, pominięty.
- **Wymiana zaplanowanego posiłku**: System prezentuje do 3 alternatywnych posiłków z tego samego slotu, spełniających kryteria kaloryczne.

**Logika wymiany posiłków wieloporcjowych:**

- Jeśli użytkownik wymienia posiłek z dnia pierwszego (tego "do ugotowania"), posiłek z dnia drugiego ("resztki") jest również automatycznie usuwany, a w jego miejsce algorytm generuje nowy, unikalny posiłek.
- Jeśli użytkownik wymienia posiłek z dnia drugiego ("resztki"), nie ma to wpływu na posiłek z dnia pierwszego. W jego miejsce generowany jest nowy, unikalny posiłek.

Wszystkie zmiany są zapisywane automatycznie (autozapis).

### 5.7. Definicja ukończenia planu

Plan jest uznawany za ukończony, gdy co najmniej 90% posiłków zostanie oznaczonych jako **"ukończone"**.

## 6. Granice produktu

### W zakresie (In Scope)

- Aplikacja webowa (RWD).
- Uwierzytelnianie przez Google/Facebook.
- Wykorzystanie bazy Cookido.
- Generowanie planu z logiką posiłków wieloporcjowych.
- Funkcjonalność wymiany, pomijania i oznaczania posiłków.

### Poza zakresem (Out of Scope)

- Aplikacja natywna/PWA.
- Tryb gościa.
- Dodawanie własnych przepisów.
- Ręczna edycja posiłków.
- Generowanie listy zakupów.
- Zaawansowane filtry dietetyczne (np. wegańska, bezglutenowa).
- Integracje z trackerami fitness.

## 7. Historyjki użytkowników (User Stories)

_(Historyjki US-001 do US-006 pozostają bez zmian, ale ich kryteria akceptacji muszą uwzględniać nową logikę)_

### US-006 

**Tytuł**: Generowanie planu żywieniowego

**Opis**: Jako użytkownik, po skonfigurowaniu parametrów planu, chcę jednym kliknięciem wygenerować kompletny plan żywieniowy, który inteligentnie wykorzystuje posiłki wieloporcjowe, abym mógł oszczędzić czas na gotowaniu.

**Kryteria akceptacji**:
- _(poprzednie kryteria)_
- Plan uwzględnia możliwość zaplanowania tego samego obiadu lub kolacji na dwa kolejne dni, jeśli przepis źródłowy ma >1 porcję.
- Po wygenerowaniu, użytkownik widzi plan, w którym niektóre posiłki mogą się powtarzać w kolejnych dniach.

### US-007 

**Tytuł**: Przeglądanie planu dziennego

**Kryteria akceptacji**:
- _(poprzednie kryteria)_
- Posiłki, które są zaplanowane na dwa dni, mają wyraźne oznaczenia wizualne (np. ikona "x2" pierwszego dnia i ikona "resztki" drugiego dnia).

_(Historyjki US-008 do US-011 pozostają bez zmian)_

### US-013 

**Tytuł**: Wyświetlanie i wybór alternatyw dla posiłku

**Kryteria akceptacji**:
- _(poprzednie kryteria)_
- Po wymianie posiłku, który był zaplanowany na dwa dni (wymiana w dniu 1), posiłek w dniu 2 jest również usuwany i zastępowany nową propozycją.
- Po wymianie posiłku "resztkowego" (wymiana w dniu 2), posiłek z dnia 1 pozostaje bez zmian.

### US-015 (Nowa historyjka)

**Tytuł**: Oszczędność czasu dzięki posiłkom wieloporcjowym

**Opis**: Jako zapracowany użytkownik, chcę, aby planer proponował mi gotowanie jednego posiłku na dwa dni, abym nie musiał codziennie spędzać czasu w kuchni i mógł efektywnie wykorzystać składniki.

**Kryteria akceptacji**:
- W moim tygodniowym planie widzę co najmniej jedną parę obiadów lub kolacji, które są takie same dzień po dniu.
- Posiłek pierwszego dnia jest oznaczony jako ten "do ugotowania".
- Posiłek drugiego dnia jest wyraźnie oznaczony jako "resztki" lub "z wczoraj".
- Łączna kaloryczność obu dni pozostaje zgodna z moimi założeniami.

## 8. Metryki sukcesu

### 8.1. Główny wskaźnik sukcesu (North Star Metric)

**Procent ukończonych planów**: Odsetek planów, w których użytkownik oznaczył co najmniej 90% posiłków jako "ukończone". To mierzy, czy dostarczamy realną wartość i pomagamy w realizacji celów.

**Cel na Q1**: 15%

### 8.2. Metryki wspierające

- **Wskaźnik retencji (Tydzień 1 / Tydzień 4)**: Ilu użytkowników wraca do aplikacji tydzień i miesiąc po wygenerowaniu pierwszego planu.
- **Wskaźnik adopcji funkcji "Wymień"**: Jak często użytkownicy korzystają z opcji wymiany posiłku? (Wysoki wskaźnik może oznaczać, że pierwotne propozycje są nietrafione).
- **Średni odsetek wykorzystania posiłków wieloporcjowych**: W ilu wygenerowanych planach algorytm z powodzeniem zastosował logikę "gotuj raz na dwa dni". Mierzy to skuteczność nowej funkcji.

## 9. Kwestie Otwarte i Ryzyka

### Ryzyko: Brak danych o liczbie porcji

**Problem**: Co jeśli API Cookido nie udostępnia wiarygodnych danych o liczbie porcji dla wszystkich przepisów?

**Akcja**: Należy to zweryfikować technicznie przed rozpoczęciem developmentu.

### Pytanie: Przepisy z 3-4 porcjami

**Problem**: Jak obsługiwać przepisy z 3 lub 4 porcjami? Czy pozwalamy na jedzenie tego samego przez 3-4 dni?

**Decyzja (MVP)**: Na razie ograniczamy się do maksymalnie 2 dni.

### Pytanie: Wyłączenie funkcji posiłków wieloporcjowych

**Problem**: Czy dać użytkownikowi możliwość wyłączenia funkcji posiłków wieloporcjowych i zażądania zawsze unikalnych dań?

**Decyzja (MVP)**: W pierwszej wersji funkcja jest domyślnie włączona bez możliwości konfiguracji. Dodanie opcji rozważymy w przyszłych iteracjach.