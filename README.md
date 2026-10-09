# Ostrość

Nauka do egzaminu czeladniczego z optyki okularowej. Losowane testy ABC, fiszki
do części ustnej i lista zadań praktycznych. Wszystko działa po stronie
przeglądarki — bez logowania i bez backendu.

- **Test ABC** — 461 pytań zamkniętych z 6 działów pisemnych. Losowana kolejność
  pytań i odpowiedzi, tryb nauki (odpowiedź od razu) albo egzaminu (wynik na
  końcu), powtórka samych błędów.
- **Arkusz egzaminacyjny** — 49 pytań z 7 działów, po 3 łatwe, 2 średnie
  i 2 trudne z każdego. Pytania z rysunku zawodowego mają odpowiedzi opisowe
  oceniane samodzielnie; pytania ABC są sprawdzane automatycznie.
- **Egzamin ustny** — 9 pytań: po 1 łatwym, średnim i trudnym z technologii,
  materiałoznawstwa i maszynoznawstwa. Ta sama zasada dla czeladnika i mistrza.
- **Fiszki** — 241 pytań opisowych z części ustnej i rysunku zawodowego.
  Samoocena „umiem / do powtórki”.
- **Zadania praktyczne** — 30 zadań wraz z czasem wykonania, z losowaniem.

Postępy zapisują się w `localStorage` pod kluczem `ostrosc.progress.v2`.

## Uruchomienie

```bash
npm install
npm run dev
```

## Dane

Pytania i rysunki pochodzą z `data/Czeladnik_optyk_pytania_odpowiedzi.xlsx`
oraz `data/Mistrz_optyk_pytania_odpowiedzi.xlsx`. Przed przeliczeniem danych
zainstaluj zależności Pythona (openpyxl i Pillow) z `requirements.txt`:

```bash
python3 -m pip install -r requirements.txt
npm run data
```

Skrypt (`scripts/extract.py`) waliduje dane po drodze — przerywa, gdy w pytaniu
ABC brakuje wariantu odpowiedzi, litera odpowiedzi jest inna niż A/B/C albo
powtórzy się identyfikator pytania. Bez obsługi obrazów Pillow przerywa przed
zmianą `lib/questions.json` i plików `public/question-images/`.

## Ograniczenia danych

Arkusz zawiera poziomy trudności potrzebne do podziału 3/2/2 we wszystkich
7 działach pisemnych oraz do zestawu ustnego.

**Rysunek zawodowy** (dział 3) zawiera treści pytań i opisy odpowiedzi, ale
rysunki nie zostały jeszcze dodane. Pytania pozostają dostępne w arkuszu
49 pytań i na fiszkach; odpowiedzi są oceniane samodzielnie.

**Egzamin mistrzowski** powinien obejmować 9 działów po 7 pytań (63 pytania,
podział 3/2/2). Ten skoroszyt zawiera bazę dla czeladnika, bez danych dla
pełnego 9-działowego arkusza mistrzowskiego. Wspólny zestaw ustny jest dostępny.

## Deploy

Zwykła aplikacja Next.js — na Vercelu wystarczy zaimportować repo, bez zmiennych
środowiskowych i bez dodatkowej konfiguracji.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · TypeScript.
