"""Confidence analysis for the frozen round 2 diary models.

Thresholds are studied on out-of-fold predictions from train.csv only.
test.csv is used once, to report the app's current thresholds.

Run from backend/: python -m ml.diary.confidence_analysis
"""
import json

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.ticker import PercentFormatter  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.model_selection import StratifiedKFold, cross_val_predict  # noqa: E402

from app.services.diary_config import REASON_THRESHOLD, SENTIMENT_THRESHOLD  # noqa: E402
from ml.diary.train import (  # noqa: E402
    DATA_DIR,
    MODELS_DIR,
    REPORTS_DIR,
    SEED,
    SOURCES,
    TARGETS,
    build_pipeline,
    candidates,
    sha256,
)

CURRENT_THRESHOLDS = {"reason": REASON_THRESHOLD, "sentiment": SENTIMENT_THRESHOLD}
THRESHOLDS = [round(t, 2) for t in np.arange(0.30, 0.9001, 0.05)]
FROZEN_METRICS = REPORTS_DIR / "metrics_round2.json"

COVERAGE_COLOR = "#2a78d6"
ACCURACY_COLOR = "#eb6834"


def frozen_pipeline(target, frozen):
    info = frozen["targets"][target]
    classifier, grid = candidates()[info["chosen_model"]]
    (param_name,) = grid
    params = {param_name: info["best_params"][param_name.split("__")[-1]]}
    return build_pipeline(classifier).set_params(**params)


def out_of_fold(train, target, frozen):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    proba = cross_val_predict(frozen_pipeline(target, frozen), train["text"], train[target], cv=cv,
                              method="predict_proba")
    classes = np.unique(train[target])
    return classes[proba.argmax(axis=1)], proba.max(axis=1)


def coverage_at(true, predicted, confidence, threshold):
    covered = confidence >= threshold
    n = int(covered.sum())
    return {
        "rows": len(true),
        "covered_rows": n,
        "coverage": round(n / len(true), 4) if len(true) else None,
        "accuracy_covered": round(float((predicted[covered] == true[covered]).mean()), 4) if n else None,
        "accuracy_all": round(float((predicted == true).mean()), 4) if len(true) else None,
    }


def save_chart(table, target):
    rows = table[table["target"] == target]
    current = CURRENT_THRESHOLDS[target]
    fig, ax = plt.subplots(figsize=(8, 5), dpi=120)
    for column, label, color in [
        ("coverage", "coverage (share of rows kept)", COVERAGE_COLOR),
        ("accuracy_covered", "accuracy on kept rows", ACCURACY_COLOR),
    ]:
        ax.plot(rows["threshold"], rows[column], color=color, linewidth=2, marker="o", markersize=5, label=label)
        last = rows.iloc[-1]
        ax.annotate(f"{last[column]:.0%}", (last["threshold"], last[column]), xytext=(6, 0),
                    textcoords="offset points", va="center", fontsize=10, color="#333333")
    ax.axvline(current, color="#777777", linestyle="--", linewidth=1)
    ax.text(current, 0.45, f"current {current}", color="#444444", fontsize=10, ha="center",
            bbox={"facecolor": "white", "edgecolor": "none", "pad": 2})
    ax.set_ylim(0, 1.05)
    ax.set_xlim(THRESHOLDS[0] - 0.02, THRESHOLDS[-1] + 0.06)
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_xlabel("confidence threshold", fontsize=12)
    ax.set_title(f"{target}: coverage vs accuracy (train.csv, 5-fold out-of-fold)", fontsize=13)
    ax.grid(axis="y", color="#e5e5e5", linewidth=0.8)
    for side in ["top", "right"]:
        ax.spines[side].set_visible(False)
    ax.legend(loc="lower left", frameon=False, fontsize=10)
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / f"confidence_{target}.png")
    plt.close(fig)


def main():
    frozen = json.loads(FROZEN_METRICS.read_text(encoding="utf-8"))
    train = pd.read_csv(DATA_DIR / "train.csv", keep_default_na=False)
    test = pd.read_csv(DATA_DIR / "test.csv", keep_default_na=False)
    for name in ["train.csv", "test.csv"]:
        if sha256(DATA_DIR / name) != frozen["datasets"][name]["sha256"]:
            raise SystemExit(f"{name} changed since round 2; the frozen models no longer match it")

    rows = []
    train_at_current = {}
    for target in TARGETS:
        true = train[target].to_numpy()
        predicted, confidence = out_of_fold(train, target, frozen)
        for threshold in THRESHOLDS:
            rows.append({"target": target, "threshold": threshold, **coverage_at(true, predicted, confidence, threshold)})
        train_at_current[target] = coverage_at(true, predicted, confidence, CURRENT_THRESHOLDS[target])
    table = pd.DataFrame(rows)
    table.to_csv(REPORTS_DIR / "confidence_train.csv", index=False)
    for target in TARGETS:
        save_chart(table, target)

    test_results = {}
    for target in TARGETS:
        model = joblib.load(MODELS_DIR / f"{target}.joblib")
        proba = model.predict_proba(test["text"])
        predicted, confidence = model.classes_[proba.argmax(axis=1)], proba.max(axis=1)
        true = test[target].to_numpy()
        per_source = {"all": coverage_at(true, predicted, confidence, CURRENT_THRESHOLDS[target])}
        for source in SOURCES:
            mask = (test["source"] == source).to_numpy()
            if mask.any():
                per_source[source] = coverage_at(true[mask], predicted[mask], confidence[mask],
                                                 CURRENT_THRESHOLDS[target])
        test_results[target] = per_source

    metrics_path = REPORTS_DIR / "metrics.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    metrics["confidence"] = {
        "thresholds": CURRENT_THRESHOLDS,
        "train_out_of_fold": train_at_current,
        "test": test_results,
    }
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print_summary(table, train_at_current, test_results)


def print_summary(table, train_at_current, test_results):
    for target in TARGETS:
        print(f"\n=== {target}: train.csv out-of-fold ===")
        print(f"{'threshold':>9}{'coverage':>10}{'acc kept':>10}{'kept':>7}")
        for row in table[table["target"] == target].itertuples():
            mark = "  <- current" if row.threshold == CURRENT_THRESHOLDS[target] else ""
            print(f"{row.threshold:>9.2f}{row.coverage:>10.1%}{row.accuracy_covered:>10.1%}{row.covered_rows:>7}{mark}")
        base = train_at_current[target]["accuracy_all"]
        print(f"(accuracy with no threshold: {base:.1%})")

    print("\n=== test.csv at the current thresholds ===")
    print(f"{'target':<10}{'threshold':>9}  {'source':<10}{'rows':>5}{'kept':>6}{'coverage':>10}{'acc kept':>10}{'acc all':>9}")
    for target, per_source in test_results.items():
        for source, r in per_source.items():
            acc = f"{r['accuracy_covered']:.1%}" if r["accuracy_covered"] is not None else "-"
            print(f"{target:<10}{CURRENT_THRESHOLDS[target]:>9}  {source:<10}{r['rows']:>5}{r['covered_rows']:>6}"
                  f"{r['coverage']:>10.1%}{acc:>10}{r['accuracy_all']:>9.1%}")


if __name__ == "__main__":
    main()
