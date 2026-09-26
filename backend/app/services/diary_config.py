"""Settings for the emotion diary classifiers.

Below these confidence thresholds the app should not trust the model's
prediction. See ml/diary/reports/confidence_*.png for how they were chosen.
"""

REASON_THRESHOLD = 0.50
SENTIMENT_THRESHOLD = 0.60

# Ask Emo: minimum cosine similarity for an FAQ match (set from ml/buddy/evaluate.py)
BUDDY_MATCH_THRESHOLD = 0.45
