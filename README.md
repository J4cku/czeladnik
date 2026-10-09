# Ostrość

Nauka do egzaminu czeladniczego i mistrzowskiego z optyki okularowej.
Losowane testy ABC, fiszki do części ustnej i lista zadań praktycznych. Wszystko działa po stronie
przeglądarki — bez logowania i bez backendu.

- **Poziom egzaminu** — przełącznik Czeladnik / Mistrz na ekranach testów,
  fiszek i działów. Baza zawiera 1585 pozycji: 732 dla czeladnika i 853 dla mistrza.
- **Test ABC** — 461 pytań zamkniętych z 6 działów czeladniczych lub 676 pytań
  z 9 działów mistrzowskich. Losowana kolejność
  pytań i odpowiedzi, tryb nauki (odpowiedź od razu) albo egzaminu (wynik na
  końcu), powtórka samych błędów.
- **Arkusz egzaminacyjny** — 49 pytań z 7 działów dla czeladnika lub 63 pytania
  z 9 działów dla mistrza, po 3 łatwe, 2 średnie i 2 trudne z każdego.
  Rysunek zawodowy czeladnika ma odpowiedzi opisowe oceniane samodzielnie;
  wszystkie pytania mistrzowskie w arkuszu są ABC i sprawdzane automatycznie.
- **Egzamin ustny** — 9 pytań: po 1 łatwym, średnim i trudnym z technologii,
  materiałoznawstwa i maszynoznawstwa. Każdy poziom korzysta z własnego skoroszytu.
- **Fiszki** — 241 pytań opisowych dla czeladnika (część ustna i rysunek zawodowy)
  lub 177 pytań z części ustnej dla mistrza.
  Samoocena „umiem / do powtórki”. Odpowiedź z klucza i rozwinięte objaśnienie
  są dostępne osobno. Talia priorytetowa zaczyna się od pytań nowych i do powtórki.
- **Rysunki** — ilustracje przy wszystkich 59 pytaniach rysunkowych czeladnika
  i 60 pytaniach rysunkowych mistrza, również w podsumowaniach powtórek.
- **Zadania praktyczne** — 30 zadań czeladniczych wraz z czasem wykonania, z losowaniem.

Postępy zapisują się w `localStorage` pod kluczem `ostrosc.progress.v2`.
Trafność ABC jest liczona osobno od samooceny fiszek i rysunków. Ekran główny
pokazuje pokrycie bazy, wyniki według trudności i ostatnie sesje z oznaczeniem trybu.
Wynik arkusza jest wynikiem treningowym, bez deklaracji oficjalnego zaliczenia egzaminu.
Zapis między kartami jest kolejkowany przez Web Locks w obsługujących go przeglądarkach.
Bez tego API zapis pozostaje lokalny i może kolidować przy jednoczesnej pracy w kilku kartach.
Jeśli przeglądarka blokuje zapis, aplikacja pokazuje komunikat i zachowuje wyniki w pamięci.
Dotychczasowe identyfikatory czeladnika pozostają bez zmian; identyfikatory mistrza
mają prefiks `mistrz-`. Statystyki i powtórka błędów ABC dotyczą wybranego poziomu.
Adresy bez parametru `poziom` domyślnie otwierają czeladnika; mistrza można otworzyć
np. przez `/test?poziom=mistrz&arkusz=1` lub `/fiszki?poziom=mistrz&egzamin=1`.

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

Skrypt (`scripts/extract.py`) generuje `lib/questions.json` i 82 unikalne pliki PNG
w `public/question-images/`. Przypisuje obrazy do pytań według wiersza zakotwiczenia
w arkuszu, zapisuje ich wymiary i współdzieli identyczne obrazy po hashu zawartości.
Waliduje dane po drodze — przerywa, gdy w pytaniu
ABC brakuje wariantu odpowiedzi, litera odpowiedzi jest inna niż A/B/C albo
powtórzy się identyfikator pytania. Bez obsługi obrazów Pillow przerywa przed
zmianą `lib/questions.json` i plików `public/question-images/`.

Oba skoroszyty zawierają poziomy trudności potrzebne do pełnych arkuszy pisemnych
i zestawów ustnych. Dwa pytania mistrzowskie z działalności gospodarczej bez
oznaczonej trudności są dostępne w zwykłym teście ABC, ale nie są losowane
do arkusza 63 pytań.

## Weryfikacja

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Testy sprawdzają zgodność katalogu ze skoroszytami, identyfikatory, rozkłady
trudności, mapowanie i wymiary obrazów oraz oba formaty egzaminów i wybór poziomu.

## Deploy

Zwykła aplikacja Next.js — na Vercelu wystarczy zaimportować repo, bez zmiennych
środowiskowych i bez dodatkowej konfiguracji.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · TypeScript.
