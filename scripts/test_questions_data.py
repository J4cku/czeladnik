import hashlib
import json
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class QuestionsDataTest(unittest.TestCase):
    def test_question_and_answer_content_is_unchanged(self):
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
            "873a62b11eac558defd4b3c102584a22c9c8060f9ffba2a0644640cbde987286",
            hashlib.sha256(content).hexdigest(),
        )

    def test_updated_categories_include_all_source_difficulties(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))

        expected = {
            "bhp": Counter(latwe=30, srednie=26, trudne=15),
            "dokumentacja": Counter(latwe=39, srednie=26, trudne=19),
            "dzialalnosc": Counter(latwe=25, srednie=25, trudne=11),
            "srodowisko": Counter(latwe=29, srednie=29, trudne=14),
            "ustny-technologia": Counter(latwe=27, srednie=27, trudne=24),
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
            "dzialalnosc": 61,
            "ustny-technologia": 77,
        }

        for category, count in expected.items():
            with self.subTest(category=category):
                actual = sum(
                    "officialNr" in question
                    for question in data["questions"]
                    if question["category"] == category
                )
                self.assertEqual(count, actual)


if __name__ == "__main__":
    unittest.main()
