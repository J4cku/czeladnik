# Ostrość

Nauka do egzaminu czeladniczego z optyki okularowej. Losowane testy ABC, fiszki
do części ustnej i lista zadań praktycznych. Wszystko działa po stronie
przeglądarki — bez logowania i bez backendu.

- **Test ABC** — 431 pytań zamkniętych z 6 działów pisemnych. Losowana kolejność
  pytań i odpowiedzi, tryb nauki (odpowiedź od razu) albo egzaminu (wynik na
  końcu), powtórka samych błędów.
- **Arkusz egzaminacyjny** — 48 pytań, 8 z każdego tematu pisemnego, temat po
  temacie, z wynikiem w rozbiciu na tematy. Zobacz „Ograniczenia danych” niżej.
- **Fiszki** — 240 pytań opisowych z części ustnej i rysunku zawodowego.
  Samoocena „umiem / do powtórki”.
- **Zadania praktyczne** — 30 zadań wraz z czasem wykonania, z losowaniem.

Postępy zapisują się w `localStorage` pod kluczem `ostrosc.progress.v1`.

## Uruchomienie

```bash
npm install
npm run dev
```

## Dane

Pytania pochodzą z `data/Czeladnik_optyk_pytania_odpowiedzi.xlsx`. Po zmianie
arkusza przelicz `lib/questions.json`:

```bash
npm run data     # wymaga pythona z openpyxl
```

Skrypt (`scripts/extract.py`) waliduje dane po drodze — przerywa, gdy w pytaniu
ABC brakuje wariantu odpowiedzi, litera odpowiedzi jest inna niż A/B/C albo
powtórzy się identyfikator pytania.

## Ograniczenia danych

Dwie rzeczy, których nie da się odtworzyć z arkusza źródłowego:

1. **Trudność pytań** jest oznaczona (Ł/Ś/T) w Rachunkowości, Dokumentacji,
   BHP i ppoż., Ochronie środowiska oraz Działalności gospodarczej. Tam arkusz
   egzaminacyjny trzyma podział 3 łatwe / 3 średnie / 2 trudne — w Prawie pracy
   losuje 8 pytań z całego działu. Aplikacja pokazuje aktualny podział na ekranie
   składu arkusza. Poziomy trudności z Technologii są widoczne na fiszkach.
2. **Rysunek zawodowy** (oficjalnie temat 3) nie ma w arkuszu wariantów
   A/B/C — same treści pytań i opis prawidłowej odpowiedzi. Nie da się go
   punktować w teście zamkniętym, więc arkusz ma 48 pytań z 6 tematów, a rysunek
   przerabia się na fiszkach.

Jeśli dojdą oznaczenia trudności dla Prawa pracy albo warianty odpowiedzi dla
rysunku, wystarczy uzupełnić kolumny w xlsx i przeliczyć dane — `lib/exam.ts`
sam zacznie trzymać podział 3/3/2 wszędzie.

## Deploy

Zwykła aplikacja Next.js — na Vercelu wystarczy zaimportować repo, bez zmiennych
środowiskowych i bez dodatkowej konfiguracji.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · TypeScript.
