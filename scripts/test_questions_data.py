import hashlib
import json
import re
import unittest
import unicodedata
from collections import Counter
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parent.parent


def clean(value):
    return re.sub(
        r"\s+",
        " ",
        unicodedata.normalize("NFC", str(value).replace("\xa0", " ").strip()),
    )


class QuestionsDataTest(unittest.TestCase):
    def test_question_content_matches_checked_workbook_snapshot(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))
        for question in data["questions"]:
            question.pop("difficulty", None)
            question.pop("officialNr", None)

        content = json.dumps(
            data,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode()

        self.assertEqual(
            "b0db7f3b773f78c5f78b6076a5fc463becde127743f3a490b9a185b243a5618b",
            hashlib.sha256(content).hexdigest(),
        )

    def test_updated_categories_include_all_source_difficulties(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))

        expected = {
            "rachunkowosc": Counter(latwe=20, srednie=20, trudne=20),
            "dokumentacja": Counter(latwe=39, srednie=26, trudne=19),
            "rysunek": Counter(latwe=20, srednie=19, trudne=20),
            "bhp": Counter(latwe=30, srednie=30, trudne=19),
            "srodowisko": Counter(latwe=30, srednie=27, trudne=21),
            "prawo-pracy": Counter(latwe=30, srednie=30, trudne=20),
            "dzialalnosc": Counter(latwe=30, srednie=30, trudne=20),
            "ustny-technologia": Counter(latwe=27, srednie=27, trudne=24),
            "ustny-materialy": Counter(latwe=22, srednie=22, trudne=21),
            "ustny-maszyny": Counter(latwe=13, srednie=13, trudne=13),
        }

        for category, difficulties in expected.items():
            with self.subTest(category=category):
                actual = Counter(
                    question["difficulty"]
                    for question in data["questions"]
                    if question["category"] == category and "difficulty" in question
                )
                self.assertEqual(difficulties, actual)

    def test_updated_categories_include_source_question_numbers(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))

        expected = {
            "rachunkowosc": 60,
            "dokumentacja": 73,
            "rysunek": 59,
            "bhp": 79,
            "srodowisko": 78,
            "prawo-pracy": 80,
            "dzialalnosc": 80,
            "ustny-technologia": 78,
            "ustny-materialy": 63,
            "ustny-maszyny": 39,
        }

        for category, count in expected.items():
            with self.subTest(category=category):
                actual = sum(
                    "officialNr" in question
                    for question in data["questions"]
                    if question["category"] == category
                )
                self.assertEqual(count, actual)

    def test_category_counts_match_checked_workbook(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))

        expected = {
            "rachunkowosc": 60,
            "dokumentacja": 84,
            "rysunek": 59,
            "bhp": 79,
            "srodowisko": 78,
            "prawo-pracy": 80,
            "dzialalnosc": 80,
            "ustny-technologia": 78,
            "ustny-materialy": 65,
            "ustny-maszyny": 39,
            "praktyka": 30,
        }

        actual = {category["id"]: category["count"] for category in data["categories"]}
        self.assertEqual(expected, actual)
        self.assertEqual(732, len(data["questions"]))

    def test_question_ids_are_unique(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))
        ids = [question["id"] for question in data["questions"]]

        self.assertEqual(len(ids), len(set(ids)))

    def test_question_ids_use_official_numbers_or_content_hashes(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))

        for question in data["questions"]:
            with self.subTest(question=question["id"]):
                if "officialNr" in question:
                    self.assertEqual(
                        f'{question["category"]}-{question["officialNr"]}',
                        question["id"],
                    )
                else:
                    identity = {
                        key: value
                        for key, value in question.items()
                        if key not in {"id", "nr", "difficulty", "officialNr"}
                    }
                    digest = hashlib.sha256(
                        json.dumps(
                            identity,
                            ensure_ascii=False,
                            sort_keys=True,
                            separators=(",", ":"),
                        ).encode()
                    ).hexdigest()[:16]
                    self.assertEqual(
                        f'{question["category"]}-h-{digest}',
                        question["id"],
                    )

    def test_oral_answers_match_the_checked_answer_key_columns(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))
        generated = {
            (question["category"], question["prompt"]): question["answer"]
            for question in data["questions"]
            if question["category"].startswith("ustny-")
        }
        workbook = openpyxl.load_workbook(
            ROOT / "data" / "Czeladnik_optyk_pytania_odpowiedzi.xlsx",
            data_only=True,
            read_only=True,
        )
        sheets = {
            "USTNY 1. Technologia": "ustny-technologia",
            "USTNY 2. Materiałozn.": "ustny-materialy",
            "USTNY 3. Maszynozn.": "ustny-maszyny",
        }

        for sheet_name, category in sheets.items():
            sheet = workbook[sheet_name]
            header = [clean(cell.value) if cell.value is not None else None for cell in sheet[1]]
            for row in sheet.iter_rows(min_row=2, values_only=True):
                cells = dict(zip(header, row))
                prompt = cells.get("Pytanie")
                answer = cells.get("Odpowiedź z klucza") or cells.get("Odpowiedz z klucza")
                if prompt and answer:
                    with self.subTest(sheet=sheet_name, prompt=prompt):
                        self.assertEqual(clean(answer), generated[(category, clean(prompt))])


if __name__ == "__main__":
    unittest.main()
