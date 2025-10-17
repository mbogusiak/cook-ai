# Planer Żywieniowy - PRD

## 1. Wprowadzenie i Cele Biznesowe

### 1.1. Wizja produktu

Stworzenie inteligentnego i intuicyjnego asystenta planowania diety, który automatyzuje proces tworzenia spersonalizowanych jadłospisów, promując zdrowe nawyki żywieniowe i  oszczędność czasu.

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
- **Wieloslotowość przepisów**: Jeden przepis z Cookido może być dostępny dla wielu meal slotów (np. sałatka może być przypisana zarówno do obriad jak i kolacji). W momencie generowania planu algorytm wybiera przepis dla konkretnego slotu na podstawie kryteriów kalorycznych dla tego slotu. Ten sam przepis może zatem być zaplanowany w różnych dniach dla różnych slotów (np. w czwartek jako obiad, w piątek jako kolacja).

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

### Uwierzytelnianie

#### ID: US-001

**Tytuł**: Logowanie przez Google

**Opis**: Jako nowy lub powracający użytkownik, chcę zalogować się do aplikacji za pomocą mojego konta Google, aby uzyskać szybki i bezpieczny dostęp do moich planów.

**Kryteria akceptacji**:
- Na stronie logowania znajduje się przycisk "Zaloguj się przez Google".
- Po kliknięciu przycisku użytkownik jest przekierowywany do standardowego okna uwierzytelniania Google.
- Po pomyślnym uwierzytelnieniu w Google, użytkownik jest zalogowany w aplikacji i przekierowany do głównego widoku (lub kreatora planu, jeśli loguje się po raz pierwszy).
- W przypadku błędu uwierzytelnienia, użytkownik widzi stosowny komunikat.

#### ID: US-002

**Tytuł**: Logowanie przez Facebook

**Opis**: Jako nowy lub powracający użytkownik, chcę zalogować się do aplikacji za pomocą mojego konta Facebook, aby uzyskać szybki i bezpieczny dostęp do moich planów.

**Kryteria akceptacji**:
- Na stronie logowania znajduje się przycisk "Zaloguj się przez Facebook".
- Po kliknięciu przycisku użytkownik jest przekierowywany do standardowego okna uwierzytelniania Facebook.
- Po pomyślnym uwierzytelnieniu w Facebooku, użytkownik jest zalogowany w aplikacji i przekierowany do głównego widoku.
- W przypadku błędu uwierzytelnienia, użytkownik widzi stosowny komunikat.

#### ID: US-003

**Tytuł**: Wylogowanie z aplikacji

**Opis**: Jako zalogowany użytkownik, chcę mieć możliwość wylogowania się z aplikacji, aby zabezpieczyć swoje konto na współdzielonym urządzeniu.

**Kryteria akceptacji**:
- W interfejsie aplikacji (np. w menu użytkownika) znajduje się przycisk/link "Wyloguj".
- Po kliknięciu "Wyloguj", sesja użytkownika zostaje zakończona, a on sam jest przekierowany na stronę logowania.

### Onboarding i generowanie planu

#### ID: US-004

**Tytuł**: Konfiguracja celu kalorycznego i długości planu

**Opis**: Jako nowy użytkownik, po pierwszym zalogowaniu, chcę w prosty sposób zdefiniować moje dzienne zapotrzebowanie kaloryczne i długość planu, aby stworzyć plan dopasowany do moich potrzeb.

**Kryteria akceptacji**:
- Użytkownik widzi pierwszy krok kreatora z polem do wpisania liczby kalorii i wyboru długości planu.
- Domyślna długość planu jest ustawiona na 7 dni.
- Pola formularza mają walidację (np. kalorie muszą być liczbą dodatnią).
- Po wypełnieniu danych użytkownik może przejść do następnego kroku.

#### ID: US-005

**Tytuł**: Wybór daty rozpoczęcia planu

**Opis**: Jako nowy użytkownik, po zdefiniowaniu celów, chcę wybrać datę rozpoczęcia mojego planu, aby dopasować go do mojego harmonogramu.

**Kryteria akceptacji**:
- Użytkownik widzi drugi krok kreatora z opcjami wyboru daty startu: "Dzisiaj", "Jutro", "Najbliższy poniedziałek".
- Opcja "Najbliższy poniedziałek" jest domyślnie zaznaczona.
- Po wybraniu daty, widoczny jest przycisk "Generuj plan".




#### ID: US-006

**Tytuł**: Generowanie planu żywieniowego

**Opis**: Jako użytkownik, po skonfigurowaniu parametrów planu, chcę jednym kliknięciem wygenerować kompletny plan żywieniowy, który inteligentnie wykorzystuje posiłki wieloporcjowe, abym mógł oszczędzić czas na gotowaniu.

**Kryteria akceptacji**:
- Po kliknięciu "Generuj plan", system przetwarza dane i tworzy plan zgodnie z zadanymi kryteriami (kalorie, długość, podział na sloty).
- Dzienne zapotrzebowanie kaloryczne jest rozdzielane na 4 sloty: śniadanie (20%), obiad (30%), kolacja (30%), przekąska (20%).
- W trakcie generowania użytkownik widzi wskaźnik ładowania.
- Po pomyślnym wygenerowaniu, użytkownik jest przekierowywany do widoku swojego planu, na dzień startowy.
- Plan uwzględnia możliwość zaplanowania tego samego obiadu lub kolacji na dwa kolejne dni, jeśli przepis źródłowy ma >1 porcję.
- Po wygenerowaniu, użytkownik widzi plan, w którym niektóre posiłki mogą się powtarzać w kolejnych dniach (funkcja posiłków wieloporcjowych).

### Przeglądanie i interakcje z planem

#### ID: US-007

**Tytuł**: Przeglądanie planu dziennego

**Opis**: Jako użytkownik, chcę w przejrzysty sposób widzieć wszystkie posiłki zaplanowane na dany dzień, aby szybko zorientować się w moim jadłospisie.

**Kryteria akceptacji**:
- Główny widok aplikacji pokazuje posiłki na wybrany dzień.
- Widoczne są 4 sloty: śniadanie, obiad, kolacja, przekąska.
- Każdy posiłek jest wyświetlony jako karta z kluczowymi informacjami (nazwa, zdjęcie, kalorie na porcję, czas przygotowania, tag slotu).
- Każda karta posiłku zawiera link do oryginalnego przepisu na Cookido.
- Posiłki, które są zaplanowane na dwa dni, mają wyraźne oznaczenia wizualne (np. ikona "x2" pierwszego dnia i ikona "resztki" drugiego dnia).

#### ID: US-008

**Tytuł**: Nawigacja między dniami planu

**Opis**: Jako użytkownik, chcę łatwo przełączać się między kolejnymi dniami mojego planu, aby móc sprawdzić, co zaplanowano na przyszłość lub przejrzeć historię.

**Kryteria akceptacji**:
- W interfejsie znajdują się wyraźne elementy nawigacyjne (np. strzałki, kalendarz) do zmiany wyświetlanego dnia.
- Użytkownik może nawigować tylko w obrębie dat swojego aktywnego planu.
- Plan jest prezentowany w widoku dziennym z nawigacją między dniami.

#### ID: US-009

**Tytuł**: Oznaczanie posiłku jako 'Ukończony'

**Opis**: Jako użytkownik, po zjedzeniu posiłku, chcę oznaczyć go jako ukończony, aby śledzić realizację mojego planu.

**Kryteria akceptacji**:
- Na karcie każdego posiłku znajduje się przycisk/ikona do oznaczenia go jako "ukończony".
- Po kliknięciu status posiłku zmienia się, co jest wizualnie odzwierciedlone na karcie (np. zmiana koloru, ikona "ptaszka").
- Zmiana statusu jest automatycznie zapisywana (autozapis).
- Użytkownik może zmienić status posiłku na jeden z trzech: zaplanowany (domyślny), ukończony, pominięty.

#### ID: US-010

**Tytuł**: Oznaczanie posiłku jako 'Pominięty'

**Opis**: Jako użytkownik, jeśli zdecyduję się nie jeść danego posiłku, chcę oznaczyć go jako pominięty, aby odnotować to w moim planie.

**Kryteria akceptacji**:
- Na karcie każdego posiłku znajduje się opcja "Pomiń".
- Po jej wybraniu status posiłku zmienia się na "pominięty", co jest wizualnie zaznaczone (np. przekreślenie, zmiana przezroczystości).
- Zmiana statusu jest automatycznie zapisywana.
- Kalorie z pominiętego posiłku nie są dodawane do innych posiłków.

#### ID: US-011

**Tytuł**: Inicjowanie wymiany posiłku

**Opis**: Jako użytkownik, jeśli nie mam ochoty na zaplanowany posiłek, chcę mieć możliwość jego wymiany na inny.

**Kryteria akceptacji**:
- Na karcie każdego posiłku o statusie "zaplanowany" znajduje się przycisk "Wymień".
- Po kliknięciu przycisku, system wyświetla interfejs wyboru alternatywnego posiłku.
- Użytkownik może wymienić każdy zaplanowany posiłek.

#### ID: US-012

**Tytuł**: Wyświetlanie i wybór alternatyw dla posiłku

**Opis**: Jako użytkownik, po zainicjowaniu wymiany, chcę zobaczyć listę odpowiednich alternatyw, aby wybrać tę, która mi najbardziej odpowiada.

**Kryteria akceptacji**:
- Po kliknięciu "Wymień" system prezentuje maksymalnie 3 alternatywne posiłki z tego samego slotu.
- Wszystkie propozycje należą do tego samego slotu (np. śniadanie za śniadanie) i spełniają kryterium kaloryczności (±20% docelowej kaloryczności dla danego slotu).
- Jeśli w bazie jest mniej niż 3 pasujące posiłki, wyświetlane są wszystkie dostępne.
- Użytkownik może wybrać jedną z propozycji, aby dokonać wymiany.
- Dostępny jest przycisk "Anuluj", który zamyka widok wymiany bez wprowadzania zmian.
- Po wymianie posiłku, który był zaplanowany na dwa dni (wymiana w dniu 1), posiłek w dniu 2 jest również usuwany i zastępowany nową propozycją.
- Po wymianie posiłku "resztkowego" (wymiana w dniu 2), posiłek z dnia 1 pozostaje bez zmian.

#### ID: US-013

**Tytuł**: Automatyczny zapis zmian w planie

**Opis**: Jako użytkownik, chcę, aby wszystkie moje działania (zmiana statusu, wymiana posiłku) były automatycznie zapisywane, abym nie musiał martwić się o utratę danych.

**Kryteria akceptacji**:
- Każda zmiana statusu posiłku (na ukończony/pominięty) jest natychmiast zapisywana na serwerze bez konieczności dodatkowej akcji ze strony użytkownika.
- Pomyślna wymiana posiłku jest natychmiast zapisywana i odzwierciedlona w widoku planu.
- Wszystkie zmiany w planie (zmiana statusu, wymiana posiłku) są zapisywane automatycznie.

#### ID: US-014

**Tytuł**: Oszczędność czasu dzięki posiłkom wieloporcjowym

**Opis**: Jako zapracowany użytkownik, chcę, aby planer proponował mi gotowanie jednego posiłku na dwa dni, abym nie musiał codziennie spędzać czasu w kuchni i mógł efektywnie wykorzystać składniki.

**Kryteria akceptacji**:
- W moim tygodniowym planie widzę co najmniej jedną parę obiadów lub kolacji, które są takie same dzień po dniu.
- Jeśli wybrany przez algorytm przepis na obiad lub kolację ma więcej niż 1 porcję, ten sam posiłek jest automatycznie planowany w tym samym slocie na następny dzień.
- Posiłek pierwszego dnia jest oznaczony jako ten "do ugotowania" (np. etykieta "Ugotuj na 2 dni").
- Posiłek drugiego dnia jest wyraźnie oznaczony jako "resztki" lub "z wczoraj" z ikoną odgrzewania oraz wizualnym powiązaniem z dniem poprzednim.
- Kaloryczność całego dania (np. na 2 porcje) jest rozkładana równomiernie na dwa dni.
- Łączna kaloryczność obu dni pozostaje zgodna z moimi założeniami - całkowity bilans kaloryczny planu musi pozostać zachowany.
- Śniadania i przekąski domyślnie pozostają unikalne każdego dnia, chyba że analiza danych wykaże inaczej.
- Algorytm dąży do braku powtórzeń tych samych przepisów w pozostałych slotach w ramach jednego planu.

## 8. Metryki sukcesu

### 8.1. Główny wskaźnik sukcesu (North Star Metric)

**Procent ukończonych planów**: Odsetek planów, w których użytkownik oznaczył co najmniej 90% posiłków jako "ukończone". To mierzy, czy dostarczamy realną wartość i pomagamy w realizacji celów.

**Cel na Q1**: 15%

### 8.2. Metryki wspierające

- **Wskaźnik retencji (Tydzień 1 / Tydzień 4)**: Ilu użytkowników wraca do aplikacji tydzień i miesiąc po wygenerowaniu pierwszego planu.
- **Wskaźnik adopcji funkcji "Wymień"**: Jak często użytkownicy korzystają z opcji wymiany posiłku? (Wysoki wskaźnik może oznaczać, że pierwotne propozycje są nietrafione).
- **Średni odsetek wykorzystania posiłków wieloporcjowych**: W ilu wygenerowanych planach algorytm z powodzeniem zastosował logikę "gotuj raz na dwa dni". Mierzy to skuteczność nowej funkcji.

## 9. Kwestie Otwarte i Ryzyka


### Pytanie: Przepisy z 3-4 porcjami

**Problem**: Jak obsługiwać przepisy z 3 lub 4 porcjami? Czy pozwalamy na jedzenie tego samego przez 3-4 dni?

**Decyzja (MVP)**: Akceptujemy takie przepisy. Zakładamy, że użytkownik zje 2 porcje

### Pytanie: Wyłączenie funkcji posiłków wieloporcjowych

**Problem**: Czy dać użytkownikowi możliwość wyłączenia funkcji posiłków wieloporcjowych i zażądania zawsze unikalnych dań?

**Decyzja (MVP)**: W pierwszej wersji funkcja jest domyślnie włączona bez możliwości konfiguracji. Dodanie opcji rozważymy w przyszłych iteracjach.