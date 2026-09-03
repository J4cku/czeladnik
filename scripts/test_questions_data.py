import json
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class QuestionsDataTest(unittest.TestCase):
    def test_updated_categories_include_all_source_difficulties(self):
        data = json.loads((ROOT / "lib" / "questions.json").read_text(encoding="utf-8"))

        expected = {
            "bhp": Counter(latwe=30, srednie=26, trudne=15),
            "srodowisko": Counter(latwe=29, srednie=29, trudne=14),
        }

        for category, difficulties in expected.items():
            with self.subTest(category=category):
                actual = Counter(
                    question["difficulty"]
                    for question in data["questions"]
                    if question["category"] == category and "difficulty" in question
                )
                self.assertEqual(difficulties, actual)


if __name__ == "__main__":
    unittest.main()
