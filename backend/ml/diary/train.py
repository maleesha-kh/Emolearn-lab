"""Train and evaluate the diary reason and sentiment classifiers.

Run from backend/: python -m ml.diary.train
"""
import hashlib
import json
import subprocess
import sys
import textwrap
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402
import sklearn  # noqa: E402
from sklearn.calibration import CalibratedClassifierCV  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold  # noqa: E402
from sklearn.naive_bayes import MultinomialNB  # noqa: E402
from sklearn.pipeline import FeatureUnion, Pipeline  # noqa: E402
from sklearn.preprocessing import FunctionTransformer  # noqa: E402
from sklearn.svm import LinearSVC  # noqa: E402

from app.services.text_preprocess import preprocess_texts  # noqa: E402

SEED = 42
# Bump when starting a new round, after saving reports/metrics.json as
# reports/metrics_round<N>.json.
ROUND = 2
DIARY_DIR = Path(__file__).resolve().parent
BACKEND_DIR = DIARY_DIR.parents[1]
DATA_DIR = DIARY_DIR / "data"
MODELS_DIR = DIARY_DIR / "models"
REPORTS_DIR = DIARY_DIR / "reports"

TARGETS = {
    "reason": ["school", "friends", "family", "playing", "pets", "other"],
    "sentiment": ["positive", "negative"],
}
SOURCES = ["generated", "kidstyle", "handwritten"]
MIN_TEST_F1 = {"reason": 0.75, "sentiment": 0.80}
C_VALUES = [0.5, 1, 2, 5, 10, 20, 50]
ALPHA_VALUES = [0.01, 0.05, 0.1, 0.5, 1, 2]


def build_pipeline(classifier):
    features = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True)),
    ])
    return Pipeline([
        ("clean", FunctionTransformer(preprocess_texts)),
        ("features", features),
        ("clf", classifier),
    ])


def candidates():
    return {
        "logistic_regression": (
            LogisticRegression(max_iter=2000, class_weight="balanced", random_state=SEED),
            {"clf__C": C_VALUES},
        ),
        "linear_svc_calibrated": (
            CalibratedClassifierCV(LinearSVC(max_iter=5000, random_state=SEED)),
            {"clf__estimator__C": C_VALUES},
        ),
        "multinomial_nb": (
            MultinomialNB(),
            {"clf__alpha": ALPHA_VALUES},
        ),
    }


def select_model(train, target):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    results = {}
    searches = {}
    for name, (classifier, grid) in candidates().items():
        search = GridSearchCV(build_pipeline(classifier), grid, scoring="f1_macro", cv=cv)
        search.fit(train["text"], train[target])
        i = search.best_index_
        results[name] = {
            "cv_macro_f1_mean": round(float(search.cv_results_["mean_test_score"][i]), 4),
            "cv_macro_f1_std": round(float(search.cv_results_["std_test_score"][i]), 4),
            "best_params": {k.split("__")[-1]: v for k, v in search.best_params_.items()},
        }
        searches[name] = search
    best = max(results, key=lambda n: results[n]["cv_macro_f1_mean"])
    # GridSearchCV refits the best params on all of train.csv
    return best, searches[best].best_estimator_, results


def evaluation_sets(test, test_noisy):
    sets = {"test": test}
    for source in SOURCES:
        subset = test[test["source"] == source]
        if len(subset):
            sets[f"test[{source}]"] = subset
    sets["test_noisy"] = test_noisy
    return sets


def evaluate(model, frame, labels):
    predicted = model.predict(frame["text"])
    report = classification_report(frame["y"], predicted, labels=labels, output_dict=True, zero_division=0)
    return {
        "rows": len(frame),
        "accuracy": round(float(accuracy_score(frame["y"], predicted)), 4),
        "macro_f1": round(float(f1_score(frame["y"], predicted, labels=labels, average="macro", zero_division=0)), 4),
        "per_class": {
            label: {k: round(float(v), 4) for k, v in report[label].items()} for label in labels
        },
    }


def save_confusion(model, test, target, labels):
    matrix = confusion_matrix(test[target], model.predict(test["text"]), labels=labels)
    size = (8, 7) if len(labels) > 2 else (5.5, 4.5)
    fig, ax = plt.subplots(figsize=size, dpi=120)
    ConfusionMatrixDisplay(matrix, display_labels=labels).plot(ax=ax, cmap="Blues", colorbar=False, values_format="d")
    ax.set_title(f"{target} on test.csv (all {len(test)} rows)", fontsize=13)
    ax.set_xlabel("predicted", fontsize=12)
    ax.set_ylabel("true", fontsize=12)
    ax.tick_params(labelsize=11)
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / f"confusion_{target}.png")
    plt.close(fig)


def error_rows(model, frame, file_name, target):
    predicted = model.predict(frame["text"])
    confidence = model.predict_proba(frame["text"]).max(axis=1)
    rows = []
    for text, source, true, pred, conf in zip(frame["text"], frame["source"], frame[target], predicted, confidence):
        if true != pred:
            rows.append({
                "file": file_name, "target": target, "text": text, "source": source,
                "true_label": true, "predicted_label": pred, "confidence": round(float(conf), 3),
            })
    return rows


def rounds_summary(metrics):
    rounds = {}
    for n in range(1, ROUND):
        path = REPORTS_DIR / f"metrics_round{n}.json"
        if path.exists():
            previous = json.loads(path.read_text(encoding="utf-8"))
            rounds[f"round{n}"] = _test_f1(previous)
    rounds[f"round{ROUND}"] = _test_f1(metrics)
    return rounds


def _test_f1(metrics):
    return {target: info["evaluation"]["test"]["macro_f1"] for target, info in metrics["targets"].items()}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_fresh_process_load():
    code = textwrap.dedent("""
        import sys
        import joblib
        reason = joblib.load("ml/diary/models/reason.joblib")
        sentiment = joblib.load("ml/diary/models/sentiment.joblib")
        texts = ["my teacher gave me a gold star", "my dog is sick"]
        print(list(reason.predict(texts)), list(sentiment.predict(texts)))
        loaded = [m for m in sys.modules if m == "ml" or m.startswith("ml.")]
        assert not loaded, f"models needed training code: {loaded}"
    """)
    result = subprocess.run([sys.executable, "-c", code], cwd=BACKEND_DIR, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"saved models failed to load in a fresh process:\n{result.stderr}")
    return result.stdout.strip()


def main():
    train = pd.read_csv(DATA_DIR / "train.csv", keep_default_na=False)
    test = pd.read_csv(DATA_DIR / "test.csv", keep_default_na=False)
    test_noisy = pd.read_csv(DATA_DIR / "test_noisy.csv", keep_default_na=False)
    MODELS_DIR.mkdir(exist_ok=True)
    REPORTS_DIR.mkdir(exist_ok=True)

    metrics = {
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearn_version": sklearn.__version__,
        "seed": SEED,
        "round": ROUND,
        "datasets": {
            "train.csv": {"rows": len(train), "sha256": sha256(DATA_DIR / "train.csv")},
            "test.csv": {
                "rows": len(test),
                "by_source": dict(Counter(test["source"])),
                "sha256": sha256(DATA_DIR / "test.csv"),
            },
            "test_noisy.csv": {"rows": len(test_noisy)},
        },
        "targets": {},
    }
    errors = []
    warnings = []

    for target, labels in TARGETS.items():
        print(f"\nSelecting model for {target}...")
        best, model, cv_results = select_model(train, target)
        joblib.dump(model, MODELS_DIR / f"{target}.joblib")

        results = {}
        for set_name, frame in evaluation_sets(test, test_noisy).items():
            results[set_name] = evaluate(model, frame.assign(y=frame[target]), labels)
        save_confusion(model, test, target, labels)
        errors += error_rows(model, test, "test.csv", target)
        errors += error_rows(model, test_noisy, "test_noisy.csv", target)

        metrics["targets"][target] = {
            "chosen_model": best,
            "best_params": cv_results[best]["best_params"],
            "cv": cv_results,
            "evaluation": results,
        }
        if results["test"]["macro_f1"] < MIN_TEST_F1[target]:
            warnings.append(
                f"WARNING: {target} macro F1 on test.csv is {results['test']['macro_f1']:.3f}, "
                f"below {MIN_TEST_F1[target]:.2f}"
            )

    metrics["rounds"] = {"test_macro_f1": rounds_summary(metrics)}
    (REPORTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    pd.DataFrame(errors, columns=[
        "file", "target", "text", "source", "true_label", "predicted_label", "confidence",
    ]).to_csv(REPORTS_DIR / "errors.csv", index=False)

    print_summary(metrics)
    for warning in warnings:
        print(warning)

    print(f"\nFresh-process load check: {check_fresh_process_load()}")
    print(f"Saved models to {MODELS_DIR} and reports to {REPORTS_DIR}")


def print_summary(metrics):
    print("\n=== Cross-validation (5-fold, macro F1 on train.csv) ===")
    print(f"{'target':<11}{'model':<24}{'mean':>7}{'std':>7}  best params")
    for target, info in metrics["targets"].items():
        for name, cv in info["cv"].items():
            mark = " *" if name == info["chosen_model"] else ""
            print(f"{target:<11}{name + mark:<24}{cv['cv_macro_f1_mean']:>7.3f}{cv['cv_macro_f1_std']:>7.3f}  "
                  f"{cv['best_params']}")
    print("(* = chosen)")

    print("\n=== Evaluation of chosen models ===")
    print(f"{'target':<11}{'set':<20}{'rows':>5}{'accuracy':>10}{'macro F1':>10}")
    for target, info in metrics["targets"].items():
        for set_name, result in info["evaluation"].items():
            print(f"{target:<11}{set_name:<20}{result['rows']:>5}{result['accuracy']:>10.3f}{result['macro_f1']:>10.3f}")

    for target, info in metrics["targets"].items():
        sets = list(info["evaluation"])
        print(f"\n=== Per-class F1: {target} ===")
        print(f"{'class':<11}" + "".join(f"{s:>18}" for s in sets))
        for label in TARGETS[target]:
            print(f"{label:<11}" + "".join(f"{info['evaluation'][s]['per_class'][label]['f1-score']:>18.3f}" for s in sets))


if __name__ == "__main__":
    main()
