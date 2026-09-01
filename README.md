# Ostrość

Nauka do egzaminu czeladniczego z optyki okularowej. Losowane testy ABC, fiszki
do części ustnej i lista zadań praktycznych. Wszystko działa po stronie
przeglądarki — bez logowania i bez backendu.

- **Test ABC** — 431 pytań zamkniętych z 6 działów pisemnych. Losowana kolejność
  pytań i odpowiedzi, tryb nauki (odpowiedź od razu) albo egzaminu (wynik na
  końcu), powtórka samych błędów.
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

## Deploy

Zwykła aplikacja Next.js — na Vercelu wystarczy zaimportować repo, bez zmiennych
środowiskowych i bez dodatkowej konfiguracji.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · TypeScript.
