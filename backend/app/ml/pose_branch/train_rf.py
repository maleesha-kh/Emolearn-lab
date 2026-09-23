import pandas as pd
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix

df = pd.read_csv("data/pose_keypoints.csv")

X = df.drop(columns=["filename", "label"])
y = df["label"]

le = LabelEncoder()
y_encoded = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
cv_scores = cross_val_score(clf, X_train, y_train, cv=5)
print(f"Cross-val accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print("\nTest Set Performance:")
print(classification_report(y_test, y_pred, target_names=le.classes_))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

os.makedirs("models", exist_ok=True)
joblib.dump(clf, "models/random_forest_pose_model.pkl")
joblib.dump(le, "models/label_encoder.pkl")
print("\nModel saved to models/random_forest_pose_model.pkl")