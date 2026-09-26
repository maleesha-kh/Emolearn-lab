"""Evaluate the Ask Emo matcher and choose its threshold.

The threshold is chosen on eval.csv only. The chosen threshold is then applied
once to eval_holdout.csv, which gives the unbiased result.

Run from backend/: python -m ml.buddy.evaluate
(--skip-holdout while working on eval.csv, so the holdout is not looked at)
"""
import argparse
import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.ticker import PercentFormatter  # noqa: E402

from app.services.buddy import best_match  # noqa: E402
from app.services.diary_config import BUDDY_MATCH_THRESHOLD  # noqa: E402

BUDDY_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BUDDY_DIR / "reports"
THRESHOLDS = [round(t, 2) for t in np.arange(0.15, 0.6001, 0.05)]

ON_TOPIC_COLOR = "#2a78d6"
REJECT_COLOR = "#eb6834"


def load(name):
    with open(BUDDY_DIR / name, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        item, score = best_match(row["question"])
        row["predicted_id"], row["score"] = (item["id"] if item else "none"), score
    return rows


def scores_at(rows, threshold):
    on = [r for r in rows if r["expected_id"] != "none"]
    off = [r for r in rows if r["expected_id"] == "none"]
    correct = sum(1 for r in on if r["score"] >= threshold and r["predicted_id"] == r["expected_id"])
    rejected = sum(1 for r in off if r["score"] < threshold)
    on_acc, off_rej = correct / len(on), rejected / len(off)
    return {
        "threshold": threshold, "on_topic_rows": len(on), "off_topic_rows": len(off),
        "on_topic_accuracy": round(on_acc, 4), "off_topic_rejection": round(off_rej, 4),
        "balanced": round((on_acc + off_rej) / 2, 4),
    }


def choose(results):
    # Highest balanced score; on a tie the higher threshold, since a wrong answer is worse than "I don't know"
    return max(results, key=lambda r: (r["balanced"], r["threshold"]))


def save_chart(results, chosen):
    fig, ax = plt.subplots(figsize=(8, 5), dpi=120)
    xs = [r["threshold"] for r in results]
    for key, label, color in [
        ("on_topic_accuracy", "on-topic top-1 accuracy", ON_TOPIC_COLOR),
        ("off_topic_rejection", "off-topic correctly rejected", REJECT_COLOR),
    ]:
        ys = [r[key] for r in results]
        ax.plot(xs, ys, color=color, linewidth=2, marker="o", markersize=5, label=label)
        ax.annotate(f"{ys[-1]:.0%}", (xs[-1], ys[-1]), xytext=(6, 0), textcoords="offset points",
                    va="center", fontsize=10, color="#333333")
    ax.axvline(chosen, color="#777777", linestyle="--", linewidth=1)
    ax.text(chosen, 0.5, f"chosen {chosen}", color="#444444", fontsize=10, ha="center",
            bbox={"facecolor": "white", "edgecolor": "none", "pad": 2})
    ax.set_ylim(0, 1.05)
    ax.set_xlim(THRESHOLDS[0] - 0.02, THRESHOLDS[-1] + 0.06)
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_xlabel("match threshold (cosine similarity)", fontsize=12)
    ax.set_title("Ask Emo matcher on eval.csv", fontsize=13)
    ax.grid(axis="y", color="#e5e5e5", linewidth=0.8)
    for side in ["top", "right"]:
        ax.spines[side].set_visible(False)
    ax.legend(loc="lower left", frameon=False, fontsize=10)
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "buddy_eval.png")
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-holdout", action="store_true")
    args = parser.parse_args()
    REPORTS_DIR.mkdir(exist_ok=True)

    eval_rows = load("eval.csv")
    results = [scores_at(eval_rows, t) for t in THRESHOLDS]
    chosen = choose(results)
    ranking = scores_at(eval_rows, 0.0)["on_topic_accuracy"]

    print("=== eval.csv (threshold chosen here) ===")
    print(f"{'threshold':>9}{'on-topic acc':>14}{'off-topic rej':>15}{'balanced':>10}")
    for r in results:
        mark = "  <- chosen" if r is chosen else ""
        print(f"{r['threshold']:>9.2f}{r['on_topic_accuracy']:>14.1%}{r['off_topic_rejection']:>15.1%}"
              f"{r['balanced']:>10.1%}{mark}")
    print(f"(top-1 accuracy on on-topic questions with no threshold: {ranking:.1%})")
    if chosen["threshold"] != BUDDY_MATCH_THRESHOLD:
        print(f"NOTE: diary_config.BUDDY_MATCH_THRESHOLD is {BUDDY_MATCH_THRESHOLD}, "
              f"the eval.csv choice is {chosen['threshold']}")

    table = [{"set": "eval", **r} for r in results]
    if not args.skip_holdout:
        holdout = {"set": "holdout", **scores_at(load("eval_holdout.csv"), chosen["threshold"])}
        table.append(holdout)
        print(f"\n=== eval_holdout.csv at the chosen threshold {chosen['threshold']} (unbiased) ===")
        print(f"on-topic accuracy {holdout['on_topic_accuracy']:.1%} ({holdout['on_topic_rows']} questions), "
              f"off-topic rejection {holdout['off_topic_rejection']:.1%} ({holdout['off_topic_rows']} questions), "
              f"balanced {holdout['balanced']:.1%}")

    with open(REPORTS_DIR / "buddy_eval.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(table[0]))
        writer.writeheader()
        writer.writerows(table)
    with open(REPORTS_DIR / "buddy_eval_predictions.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["question", "expected_id", "predicted_id", "score"])
        writer.writeheader()
        writer.writerows(eval_rows)
    save_chart(results, chosen["threshold"])


if __name__ == "__main__":
    main()
