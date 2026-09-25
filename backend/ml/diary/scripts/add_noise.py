"""Add child-style noise (misspellings and casing) to diary sentences.

Each row gets its own random generator, seeded from the file seed plus a
hash of the row's clean text, so editing or adding one row never changes
the noise on any other row.

  train  train_clean.csv in, train.csv out. About 20% of rows end up with a
         child misspelling and about 55% (3+ words) are capitalised and
         punctuated. Seed 7.

  noisy  test.csv in, test_noisy.csv out. About 30% of rows get a
         misspelling and/or are lowercased with punctuation stripped.
         Seed 11.

Run from backend/ after editing train_clean.csv or test.csv:
  python ml/diary/scripts/add_noise.py --mode train
  python ml/diary/scripts/add_noise.py --mode noisy
"""
import argparse
import csv
import hashlib
import random
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

MODES = {
    "train": {"seed": 7, "input": DATA_DIR / "train_clean.csv", "output": DATA_DIR / "train.csv"},
    "noisy": {"seed": 11, "input": DATA_DIR / "test.csv", "output": DATA_DIR / "test_noisy.csv"},
}

# Chance for a row without a hand-written misspelling; together with those
# rows this gives about 20% misspelled rows in train.csv.
TRAIN_MISSPELL_CHANCE = 0.25
TRAIN_STYLE_CHANCE = 0.55
NOISY_CHANCE = 0.3

NAMES = ["nimal", "sara", "kavindu", "amaya"]

CHILD_SPELLING = {
    "because": "becuz", "friend": "frend", "friends": "frends", "teacher": "techer", "school": "skool",
    "happy": "hapy", "really": "realy", "said": "sed", "they": "thay", "played": "playd", "when": "wen",
    "brother": "bruther", "sister": "sistr", "little": "litle", "tomorrow": "tomoro", "every": "evry",
    "house": "hous", "puppy": "pupy", "dinner": "diner", "finished": "finishd", "cousin": "cusin",
    "grandma": "granma", "pencil": "pensil", "picture": "pictur", "again": "agen", "chocolate": "choclate",
    "rabbit": "rabit", "homework": "homwork", "football": "futball", "cricket": "criket", "bicycle": "bicycel",
    "favorite": "favrite", "favourite": "favrite", "birthday": "birthdey", "kitten": "kiten", "was": "wus",
    "lunch": "lunsh", "angry": "angrey", "caught": "cot", "people": "peple", "night": "nite", "new": "nu",
    "went": "whent", "with": "wit", "some": "sum", "suddenly": "sudenly", "doesnt": "dosnt",
    "cat": "kat", "animals": "aminals", "monkey": "monky", "monkeys": "monkys", "elephant": "elefant",
    "parrot": "parot", "hamster": "hamstar", "tortoise": "tortis", "turtle": "turtel", "baby": "babby",
    "garden": "gardan", "chased": "chasd", "barked": "barkd", "kittens": "kitens", "goldfish": "goldfsh",
    "dog": "dogg", "fish": "fis", "bird": "brid", "zoo": "zu", "kite": "kyte", "puzzle": "puzzel",
    "game": "gaem", "drawing": "drawring", "tower": "towr",
}

# Misspellings written by hand into train_clean.csv, so those rows are not
# given a second one.
HANDWRITTEN_MISSPELLINGS = {
    "techer", "skool", "becuz", "answerd", "finaly", "forgeting", "experment", "hapy", "homwork", "exm",
    "tution", "frend", "freind", "frends", "suprised", "sholders", "calld", "sistr", "evry", "peices",
    "favrite", "stoped", "squirel", "lizzard", "kiten", "wether", "umbrela", "trafic",
}
MISSPELLED = set(CHILD_SPELLING.values()) | HANDWRITTEN_MISSPELLINGS

WORD = re.compile(r"[A-Za-z']+")


def is_misspelled(text):
    return bool(MISSPELLED & set(re.findall(r"[a-z]+", text.lower())))


def row_rng(seed, text):
    digest = hashlib.sha256(f"{seed}:{text}".encode("utf-8")).digest()
    return random.Random(int.from_bytes(digest[:8], "big"))


def misspell(text, rng):
    """Swap one known word for its child spelling. Returns the text unchanged
    if no word has a child spelling."""
    hits = [m for m in WORD.finditer(text) if m.group().lower() in CHILD_SPELLING]
    if not hits:
        return text
    m = rng.choice(hits)
    new = CHILD_SPELLING[m.group().lower()]
    if m.group()[0].isupper():
        new = new.capitalize()
    return text[: m.start()] + new + text[m.end():]


def capitalise(text, rng, sentiment):
    words = ["I" if w == "i" else w.capitalize() if w in NAMES else w for w in text.split()]
    text = " ".join(words)
    text = text[0].upper() + text[1:]
    return text + ("!" if sentiment == "positive" and rng.random() < 0.3 else ".")


def roughen(text):
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s']", "", text.lower())).strip()


def noise_train_text(text, sentiment, seed):
    rng = row_rng(seed, text)
    if rng.random() < TRAIN_MISSPELL_CHANCE and not is_misspelled(text):
        text = misspell(text, rng)
    if rng.random() < TRAIN_STYLE_CHANCE and len(text.split()) > 2:
        text = capitalise(text, rng, sentiment)
    return text


def noise_test_text(text, seed):
    rng = row_rng(seed, text)
    if rng.random() >= NOISY_CHANCE:
        return text
    noisy = misspell(text, rng)
    if rng.random() < 0.5 or noisy == text:
        noisy = roughen(noisy)
    return noisy


def apply_noise(rows, mode, seed=None):
    seed = MODES[mode]["seed"] if seed is None else seed
    out = []
    for row in rows:
        row = dict(row)
        if mode == "train":
            row["text"] = noise_train_text(row["text"], row["sentiment"], seed)
        else:
            row["text"] = noise_test_text(row["text"], seed)
        out.append(row)
    return out


def read_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mode", choices=list(MODES), default="noisy")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--seed", type=int)
    args = parser.parse_args()

    mode = MODES[args.mode]
    input_path = args.input or mode["input"]
    output_path = args.output or mode["output"]
    seed = mode["seed"] if args.seed is None else args.seed

    fieldnames, rows = read_csv(input_path)
    rows = apply_noise(rows, args.mode, seed)

    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows)} rows to {output_path} (mode={args.mode}, seed={seed})")


if __name__ == "__main__":
    main()
