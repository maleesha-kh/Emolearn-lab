"""Type a diary sentence and see the predicted reason and sentiment.

Run from backend/ after training: python -m ml.diary.predict_demo
Press Enter on an empty line (or Ctrl+C) to quit.
"""
from pathlib import Path

import joblib

MODELS_DIR = Path(__file__).resolve().parent / "models"


def predict(model, text):
    probabilities = model.predict_proba([text])[0]
    best = probabilities.argmax()
    return model.classes_[best], probabilities[best]


def main():
    reason_model = joblib.load(MODELS_DIR / "reason.joblib")
    sentiment_model = joblib.load(MODELS_DIR / "sentiment.joblib")
    print("Type a sentence (empty line to quit).")
    while True:
        try:
            text = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not text:
            break
        reason, reason_conf = predict(reason_model, text)
        sentiment, sentiment_conf = predict(sentiment_model, text)
        print(f"  reason:    {reason:<9} ({reason_conf:.0%})")
        print(f"  sentiment: {sentiment:<9} ({sentiment_conf:.0%})")


if __name__ == "__main__":
    main()
