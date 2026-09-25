# Diary classifier label guide

Each row in `train.csv`, `test.csv` and `test_noisy.csv` is a short diary
sentence written by a child (age 5-10) explaining why they feel happy, sad,
angry or surprised. Columns: `text`, `reason`, `sentiment`, `source`.

`source` is `generated` (written with Claude Code's help, see below),
`handwritten` (written by real people) or `kidstyle` (test rows in Sri Lankan
kid-style English, written separately, not by Claude Code).

## Editing the data

Edit `train_clean.csv`, not `train.csv`. `train.csv` is generated from it, so
after any change run (from `backend/`):

```
python ml/diary/scripts/add_noise.py --mode train
python ml/diary/scripts/check_data.py
```

After editing `test.csv`, also run `add_noise.py --mode noisy` to rebuild
`test_noisy.csv`. `check_data.py` fails if `train.csv` is out of date.

## reason

Label by the **main cause** of the feeling. If a sentence fits two reasons,
pick the one that caused the feeling.

| reason | covers |
|---|---|
| `school` | teacher, class, homework, exams, marks, school events |
| `friends` | friendships, being included or left out, arguments with friends |
| `family` | parents, siblings, grandparents, cousins, home life, family trips |
| `playing` | games, toys, TV, cartoons, sports, drawing, playing outside, when the activity is the main cause and not a person |
| `pets` | any animal or insect: own pet, stray, zoo animal, wild animal |
| `other` | food, weather, the child being sick or hurt, gifts, birthdays, lost things, anything else |

### Examples

**school**
- `i got full marks in my maths test` (positive)
- `techer said my writing is messy` (negative)
- `sir gave us a test without telling` (negative, surprise)

**friends**
- `nimal played with me at break` (positive)
- `she took my crayons` (negative, no obvious keyword)
- `my old friend moved back to our street` (positive, surprise)

**family**
- `my cousin came without telling us` (positive, surprise)
- `amma did not come to pick me` (negative)
- `thaththa took me to the beach` (positive)

**playing**
- `i scored a goal in football` (positive)
- `my kite got stuck in a tree` (negative)
- `i didnt win the game` (negative)

**pets**
- `my parrot said my name` (positive)
- `dog sick` (negative)
- `i saw an elephant at the zoo` (positive)

**other**
- `my tooth fell out suddenly` (negative, surprise)
- `it rained and we couldnt go out` (negative)
- `i got a watch as a gift` (positive)

### Main-cause tips

- A person doing something beats the object involved: `my brother broke my toy`
  is `family`, `my toy car broke` is `playing`.
- An activity with a named friend, where the friend is the point, is `friends`:
  `the boys let me join their game`.
- A school event is `school` even if it is fun: `our school concert went really well`.
- Any animal or insect is `pets`, including wild ones: `a bee stung me` is
  `pets`, and so is `i was surprised to see a snake in the garden`.
- Illness or injury goes to whoever is ill or hurt. Someone else's goes to
  that person's category: `grandma is in hospital` is `family`, `our dog hurt
  his leg` is `pets`. The child's own illness or injury is `other`: `i have a
  fever`, `i fell and hurt my knee`.
- Gifts and birthdays are `other` unless a person is clearly the cause
  (`my friends forgot my birthday` is `friends`).

## sentiment

Was the cause good or bad for the child?

| sentiment | meaning | examples |
|---|---|---|
| `positive` | the cause was good | `my dog learned to sit`, `the test was not hard at all`, `my team didnt lose` |
| `negative` | the cause was bad | `i lost my water bottle`, `i did not get a star today`, `nobody said hi to me` |

Watch for negation: `i didnt win` is negative, `amma was not angry about the spill` is positive.

## What is not in this data

No abuse, self-harm or violence. The keyword safety filter
(`app/services/safety.py`) handles those, not this model.
`ml/diary/scripts/check_data.py` fails if any sentence would be rated "high"
by that filter. "Watch" sentences such as `my dog ran away` are allowed.

## Files

- `train_clean.csv`: the train sentences before noise. This is the file to edit.
- `train.csv`: generated from `train_clean.csv`. 120 sentences per reason, 60
  positive and 60 negative. Simple diary lines, about 20% with small spelling
  mistakes (`frend`, `techer`, `becuz`), roughly half lowercase without
  punctuation, a few very short (`dog sick`).
- `test.csv`: 30 sentences per reason, 15 positive and 15 negative, in a
  different style: time openers and exclamations ("Yesterday...", "Guess what,
  ...", "Ugh, ...", "When ... I ..."), full punctuation, no spelling mistakes.
- `test_noisy.csv`: generated from `test.csv`. The same rows and labels, with
  about 30% of the sentences given a child misspelling and/or lowercased with punctuation
  removed. It shows how the model copes with messy input on unseen sentences.

## How the data was made

1. The clean sentences in `train_clean.csv` and `test.csv` were written with
   Claude Code's help, following the label rules above. The train sentences
   are all lowercase with no punctuation, and a few have spelling mistakes
   written in by hand.
2. `train.csv` is made with `ml/diary/scripts/add_noise.py --mode train`
   (seed 7). Using a fixed table of child spellings, a row without a
   hand-written mistake gets one misspelling with a 25% chance (about 20% of
   rows end up misspelled), and about 55% of rows are capitalised and
   punctuated.
3. `kidstyle` rows in `test.csv` are written separately in Sri Lankan kid-style
   English, not by Claude Code, to test the model on real local phrasing.
4. `test_noisy.csv` is made with `ml/diary/scripts/add_noise.py --mode noisy`
   (seed 11): about 30% of rows get a misspelling and/or are lowercased with
   punctuation removed.
5. Each row's noise comes from its own random generator, seeded from the seed
   plus a hash of the row's clean text. Editing or adding one row never
   changes the noise on any other row.
6. I reviewed the result. `ml/diary/scripts/check_data.py` must pass: labels
   and `source` are valid, `train.csv` matches a fresh run of `add_noise.py`,
   there are no exact or near-duplicates (difflib ratio above 0.85) within
   train, within test, or between train and either test file, no sentence is
   rated "high" by the safety filter, and `test_noisy.csv` matches `test.csv`
   row for row.

Run the scripts from `backend/`.
