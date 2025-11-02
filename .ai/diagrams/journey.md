stateDiagram-v2
    direction LR
    [*] --> StronaStartowa

    state "Strona Startowa" as StronaStartowa
    note right of StronaStartowa
        Brak trybu gościa.
        Użytkownik musi się zalogować
        lub zarejestrować.
    end note

    StronaStartowa --> Logowanie: Chcę się zalogować
    StronaStartowa --> Rejestracja: Chcę się zarejestrować

    state "Logowanie" as Logowanie {
        [*] --> FormularzLogowania
        FormularzLogowania: Użytkownik podaje e-mail i hasło
        FormularzLogowania --> Uwierzytelnianie
        Uwierzytelnianie --> if_logowanie <<choice>>
        if_logowanie --> Aplikacja: Sukces
        if_logowanie --> BłądLogowania: Błąd
        BłądLogowania --> FormularzLogowania: Spróbuj ponownie
    }

    state "Rejestracja" as Rejestracja {
        [*] --> FormularzRejestracji
        FormularzRejestracji: Użytkownik podaje e-mail i hasło
        FormularzRejestracji --> WalidacjaDanych
        WalidacjaDanych --> if_rejestracja <<choice>>
        if_rejestracja --> Onboarding: Sukces
        if_rejestracja --> BłądRejestracji: Błąd
        BłądRejestracji --> FormularzRejestracji: Popraw dane
    }

    state "Onboarding nowego użytkownika" as Onboarding {
        direction LR
        [*] --> Krok1_CelKaloryczny
        Krok1_CelKaloryczny: Podanie celu kalorycznego i długości planu
        Krok1_CelKaloryczny --> Krok2_DataStartu
        Krok2_DataStartu: Wybór daty rozpoczęcia
        Krok2_DataStartu --> GenerowaniePlanu
        GenerowaniePlanu: Generowanie planu
        GenerowaniePlanu --> [*]
    }

    Onboarding --> Aplikacja

    state "Główna aplikacja" as Aplikacja {
        direction LR
        [*] --> PanelGłówny
        PanelGłówny --> Wylogowanie: Użytkownik klika "Wyloguj"
        note left of PanelGłówny
            Główny widok aplikacji,
            np. lista planów lub widok dnia.
        end note
    }

    Wylogowanie --> StronaStartowa
    Aplikacja --> [*]
