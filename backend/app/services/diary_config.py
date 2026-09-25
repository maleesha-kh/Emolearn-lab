"""Settings for the emotion diary classifiers.

Below these confidence thresholds the app should not trust the model's
prediction. See ml/diary/reports/confidence_*.png for how they were chosen.
"""

REASON_THRESHOLD = 0.50
SENTIMENT_THRESHOLD = 0.60
