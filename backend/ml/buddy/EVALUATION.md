# Ask Emo matcher evaluation

Data:
- `eval.csv`: 60 on-topic questions (expected FAQ id) and 20 off-topic questions (`none`). Development set.
- `eval_holdout.csv`: 20 on-topic and 10 off-topic questions, worded differently from the FAQ phrasings and from `eval.csv`. Used once, at the end.

Metrics, per threshold:
- On-topic accuracy: share of on-topic questions whose top match is the expected item and scores at or above the threshold.
- Off-topic rejection: share of off-topic questions that get no match.
- Balanced: the mean of the two.

Run from `backend/`: `python -m ml.buddy.evaluate` (use `--skip-holdout` during development).

## Method and bias

`eval.csv` shaped both the matcher design and the threshold:

1. **Baseline.** Word TF-IDF (1-2 grams) and char_wb TF-IDF (2-4 grams) on `text_preprocess`, cosine similarity.
2. **Round 1.** Stop words (including kid spellings) removed before both feature sets, synonym groups, and a rule-based topic gate: a question with no feelings word is not scored.
3. **Round 2.** 34 extra FAQ phrasings written from the patterns of the `eval.csv` mistakes, never copying them. This round slightly lowered `eval.csv` accuracy. Development stopped here as planned.
4. **Threshold.** Chosen on `eval.csv`: best balanced score, with the higher threshold on a tie. Result: **0.45**.

Because of this, the `eval.csv` numbers are optimistic. Only the holdout result is unbiased. One remaining limit: the holdout was written by the same author as the FAQ and `eval.csv`, before the redesign, and was not looked at while developing.

## Results on eval.csv (development set)

| threshold | baseline acc / rej / bal | round 1 acc / rej / bal | final acc / rej / bal |
|---|---|---|---|
| 0.30 | 60.0 / 20.0 / 40.0 | 61.7 / 100 / 80.8 | 60.0 / 100 / 80.0 |
| 0.35 | 55.0 / 55.0 / 55.0 | 61.7 / 100 / 80.8 | 60.0 / 100 / 80.0 |
| 0.40 | 53.3 / 80.0 / 66.7 | 61.7 / 100 / 80.8 | 60.0 / 100 / 80.0 |
| **0.45** | 45.0 / 80.0 / 62.5 | 61.7 / 100 / 80.8 | **60.0 / 100 / 80.0** |
| 0.50 | 36.7 / 90.0 / 63.3 | 61.7 / 100 / 80.8 | 56.7 / 100 / 78.3 |

All thresholds are in `reports/buddy_eval.csv` (final); the earlier rounds are in `buddy_eval_before.csv` and `buddy_eval_round1.csv`.

## Unbiased result on eval_holdout.csv (threshold 0.45, run once)

| on-topic accuracy | off-topic rejection | balanced |
|---|---|---|
| 65.0% (13/20) | 90.0% (9/10) | 77.5% |

## Known limitations

- "left out" and "alone" are in the lonely synonym group, so the left-out and lonely items can't be told apart: "I feel left out" and "I feel lonely" become the same text, and the tie goes to left-out.
- 6 FAQ phrasings (like "who are you" and "nothing to do") contain no feeling word, so the topic gate rejects them and a child typing them gets the not-sure reply. All 40 main questions pass the gate.
- Most on-topic misses land on a near-neighbour item in the same emotion (for example "is it okay to be sad" gets what-is-sad), so the answer is usually still relevant. Since this evaluation, a match also returns up to 2 "related" items (the next best items scoring above 0.2), For 12 of the 20 on-topic questions in eval.csv that got a wrong answer, the intended item is one of the 2 related items. This does not change which answer is chosen or the numbers above.
- The holdout was written by the same writer as eval.csv, so it shares that writer's wording habits even though it was not looked at during development.
