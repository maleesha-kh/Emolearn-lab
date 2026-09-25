"""Check the diary classifier dataset: label counts, invalid rows, exact and
near-duplicates, sentences the safety filter would rate "high", that
train.csv is up to date with train_clean.csv, and that test_noisy.csv lines
up row for row with test.csv.

Run from backend/: python ml/diary/scripts/check_data.py
Exits with status 1 if any problem is found.
"""
import csv
import re
import sys
from collections import Counter
from difflib import SequenceMatcher
from itertools import combinations
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from add_noise import apply_noise  # noqa: E402
from app.services.safety import check_concern  # noqa: E402

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
COLUMNS = ["text", "reason", "sentiment", "source"]
REASONS = ["school", "friends", "family", "playing", "pets", "other"]
SENTIMENTS = ["positive", "negative"]
SOURCES = ["generated", "handwritten", "kidstyle"]
FILES = ["train.csv", "test.csv", "test_noisy.csv"]
NEAR_DUPLICATE_RATIO = 0.85


def load(name):
    with open(DATA_DIR / name, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != COLUMNS:
            return None, [f"{name}: columns are {reader.fieldnames}, expected {COLUMNS}"]
        # Line 1 is the header
        return [(i, row) for i, row in enumerate(reader, start=2)], []


def comparable(text):
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", "", text.lower())).strip()


def is_near(a, b):
    matcher = SequenceMatcher(None, a, b)
    return (
        matcher.real_quick_ratio() > NEAR_DUPLICATE_RATIO
        and matcher.quick_ratio() > NEAR_DUPLICATE_RATIO
        and matcher.ratio() > NEAR_DUPLICATE_RATIO
    )


def check_rows(name, rows):
    problems = []
    for line, row in rows:
        text = (row["text"] or "").strip()
        if not text:
            problems.append(f"{name}:{line}: empty text")
        if row["reason"] not in REASONS:
            problems.append(f"{name}:{line}: invalid reason {row['reason']!r}")
        if row["sentiment"] not in SENTIMENTS:
            problems.append(f"{name}:{line}: invalid sentiment {row['sentiment']!r}")
        if row["source"] not in SOURCES:
            problems.append(f"{name}:{line}: invalid source {row['source']!r}")
        level, categories = check_concern(text)
        if level == "high":
            problems.append(f"{name}:{line}: safety filter rates this high {categories}: {text!r}")
    return problems


def train_up_to_date_problems(train_rows):
    if not (DATA_DIR / "train_clean.csv").exists():
        return ["train_clean.csv is missing"]
    clean_rows, errors = load("train_clean.csv")
    if errors:
        return errors
    expected = apply_noise([row for _, row in clean_rows], "train")
    if expected != [row for _, row in train_rows]:
        return ["train.csv is out of date, run add_noise.py --mode train"]
    return []


def noisy_problems(test_rows, noisy_rows):
    if len(test_rows) != len(noisy_rows):
        return [f"test_noisy.csv has {len(noisy_rows)} rows, test.csv has {len(test_rows)} (rerun add_noise.py)"]
    problems = []
    for (line, test_row), (_, noisy_row) in zip(test_rows, noisy_rows):
        for column in ["reason", "sentiment", "source"]:
            if test_row[column] != noisy_row[column]:
                problems.append(
                    f"test_noisy.csv:{line}: {column} is {noisy_row[column]!r}, test.csv has {test_row[column]!r}"
                )
    return problems


def print_counts(name, rows):
    reasons = Counter(row["reason"] for _, row in rows)
    sentiments = Counter(row["sentiment"] for _, row in rows)
    by_both = Counter((row["reason"], row["sentiment"]) for _, row in rows)
    sources = Counter(row["source"] for _, row in rows)
    print(f"\n{name}: {len(rows)} rows ({', '.join(f'{s}={sources[s]}' for s in SOURCES)})")
    print(f"  {'reason':<10}{'total':>7}{'positive':>10}{'negative':>10}")
    for reason in REASONS:
        print(f"  {reason:<10}{reasons[reason]:>7}{by_both[(reason, 'positive')]:>10}{by_both[(reason, 'negative')]:>10}")
    print(f"  {'all':<10}{len(rows):>7}{sentiments['positive']:>10}{sentiments['negative']:>10}")


def duplicate_problems(label, pairs):
    problems = []
    for (name_a, line_a, text_a), (name_b, line_b, text_b) in pairs:
        a, b = comparable(text_a), comparable(text_b)
        if a == b:
            problems.append(f"{label} exact duplicate: {name_a}:{line_a} {text_a!r} = {name_b}:{line_b} {text_b!r}")
        elif is_near(a, b):
            problems.append(f"{label} near-duplicate: {name_a}:{line_a} {text_a!r} ~ {name_b}:{line_b} {text_b!r}")
    return problems


def main():
    problems = []
    loaded = {}
    for name in FILES:
        rows, errors = load(name)
        problems += errors
        if rows is not None:
            loaded[name] = rows
            print_counts(name, rows)
            problems += check_rows(name, rows)

    entries = {name: [(name, line, row["text"] or "") for line, row in rows] for name, rows in loaded.items()}
    train = entries.get("train.csv", [])
    test = entries.get("test.csv", [])
    noisy = entries.get("test_noisy.csv", [])
    problems += duplicate_problems("train", combinations(train, 2))
    problems += duplicate_problems("test", combinations(test, 2))
    problems += duplicate_problems("train/test", ((a, b) for a in train for b in test))
    # test_noisy.csv is test.csv with noise, so it is only compared with train
    problems += duplicate_problems("train/test_noisy", ((a, b) for a in train for b in noisy))

    if "train.csv" in loaded:
        problems += train_up_to_date_problems(loaded["train.csv"])
    if "test.csv" in loaded and "test_noisy.csv" in loaded:
        problems += noisy_problems(loaded["test.csv"], loaded["test_noisy.csv"])

    if problems:
        print(f"\n{len(problems)} problem(s):")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print("\nNo problems found.")


if __name__ == "__main__":
    main()
