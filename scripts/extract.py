"""Reads data/Czeladnik_optyk_pytania_odpowiedzi.xlsx -> lib/questions.json"""
import hashlib, json, re, unicodedata
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "Czeladnik_optyk_pytania_odpowiedzi.xlsx"
OUT = ROOT / "lib" / "questions.json"

# sheet title -> (id, kind, short label, description)
SHEETS = {
    "1. Rachunkowość":      ("rachunkowosc", "abc", "Rachunkowość", "Obliczenia optyczne, moce soczewek, pryzmaty, ekwiwalent sferyczny."),
    "2. Dokumentacja":      ("dokumentacja", "abc", "Dokumentacja", "Dokumenty, podatki, ewidencja, formy prawne działalności."),
    "3. Rysunek zawodowy":  ("rysunek", "open", "Rysunek zawodowy", "Anatomia oka, symbole i przekroje soczewek, bieg promieni."),
    "4. BHP i ppoż.":       ("bhp", "abc", "BHP i ppoż.", "Bezpieczeństwo pracy, pierwsza pomoc, ochrona przeciwpożarowa."),
    "5. Ochrona środowiska":("srodowisko", "abc", "Ochrona środowiska", "Odpady, emisje, ekologia i gospodarka obiegu zamkniętego."),
    "6. Prawo pracy":       ("prawo-pracy", "abc", "Prawo pracy", "Kodeks pracy, umowy, pracownicy młodociani, urlopy."),
    "7. Działalność gosp.": ("dzialalnosc", "abc", "Działalność gospodarcza", "Ekonomia, podatki, ZUS, prowadzenie firmy."),
    "USTNY 1. Technologia": ("ustny-technologia", "open", "Technologia", "Pytania ustne: oko, refrakcja, wykonanie i centracja okularów."),
    "USTNY 2. Materiałozn.":("ustny-materialy", "open", "Materiałoznawstwo", "Pytania ustne: materiały soczewek, opraw, powłoki."),
    "USTNY 3. Maszynozn.":  ("ustny-maszyny", "open", "Maszynoznawstwo", "Pytania ustne: narzędzia i urządzenia pracowni optycznej."),
    "Zadania praktyczne":   ("praktyka", "task", "Zadania praktyczne", "Zadania na część praktyczną egzaminu wraz z czasem wykonania."),
}

DIFFICULTY = {
    "Ł": "latwe",
    "ŁATWY": "latwe",
    "LATWY": "latwe",
    "Ś": "srednie",
    "S": "srednie",
    "ŚREDNI": "srednie",
    "SREDNI": "srednie",
    "T": "trudne",
    "TRUDNY": "trudne",
}


def clean(v):
    if v is None:
        return None
    s = str(v).replace(" ", " ").strip()
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s)
    return s or None


def as_index(v):
    """'1.0' -> 1"""
    s = clean(v)
    if s is None:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    categories, questions = [], []
    seen_ids = set()

    for ws in wb.worksheets:
        if ws.title not in SHEETS:
            raise SystemExit(f"Nieznany arkusz: {ws.title}")
        cat_id, kind, label, description = SHEETS[ws.title]
        header = [clean(c.value) for c in ws[1]]
        count = 0

        for row_number, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            cells = dict(zip(header, row))
            prompt = clean(cells.get("Pytanie") or cells.get("Zadanie"))
            if not prompt:
                continue
            source_nr = as_index(cells.get("Nr"))
            official = as_index(cells.get("Nr pytania") or cells.get("ID"))
            nr = source_nr or count + 1
            q = {"category": cat_id, "kind": kind, "nr": nr, "prompt": prompt}

            if kind == "abc":
                options = [clean(cells.get(k)) for k in ("A", "B", "C")]
                if any(o is None for o in options):
                    raise SystemExit(f"Brak odpowiedzi w {qid}")
                letter = (clean(cells.get("Odpowiedź")) or "").upper()
                if letter not in "ABC":
                    raise SystemExit(f"Zła litera odpowiedzi w {qid}: {letter!r}")
                q["options"] = options
                q["answer"] = "ABC".index(letter)
            elif kind == "open":
                q["answer"] = (
                    clean(cells.get("Odpowiedź z klucza"))
                    or clean(cells.get("Odpowiedz z klucza"))
                    or clean(cells.get("Odpowiedź"))
                    or "Brak opisu odpowiedzi."
                )
            else:
                q["time"] = clean(cells.get("Czas"))

            if official:
                qid = f"{cat_id}-{official}"
            else:
                identity = json.dumps(
                    {key: value for key, value in q.items() if key != "nr"},
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                digest = hashlib.sha256(identity.encode()).hexdigest()[:16]
                qid = f"{cat_id}-h-{digest}"
            if qid in seen_ids:
                raise SystemExit(f"Duplikat id: {qid} (wiersz {row_number})")
            seen_ids.add(qid)
            q = {"id": qid, **q}

            difficulty = clean(cells.get("Trudność") or cells.get("Poziom")) or ""
            diff = DIFFICULTY.get(difficulty.upper())
            if diff:
                q["difficulty"] = diff
            if official:
                q["officialNr"] = official

            questions.append(q)
            count += 1

        categories.append({"id": cat_id, "kind": kind, "label": label,
                           "description": description, "count": count})

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"categories": categories, "questions": questions},
                              ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    for c in categories:
        print(f"{c['kind']:5} {c['id']:20} {c['count']:4}")
    print("razem:", len(questions))


if __name__ == "__main__":
    main()
