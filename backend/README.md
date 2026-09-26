# Backend

FastAPI service that fuses a face-branch (MobileNetV2) and a pose-branch
(MediaPipe + Random Forest) prediction into one emotion label.

## Setup

```
python -m venv venv
venv\Scripts\pip install -r requirements.txt
```

Always run Python through `venv\Scripts\python.exe` (or `venv\Scripts\pip.exe`),
not the system interpreter.

## Model files

- `app/ml/face_branch/models/face_branch_v4_clean.weights.h5` — face branch weights.
- `app/ml/pose_branch/models/random_forest_pose_model_bg_removed.pkl` and
  `label_encoder_bg_removed.pkl` — pose branch model and label encoder (the
  ones `config.py` points at by default).

## Running the server

```
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

`POST /predict` with an image file (`multipart/form-data`) returns the fused
prediction. See `app/schemas/prediction.py` for the response shape.

## Tests

```
venv\Scripts\python.exe -m pytest tests
```

Tests marked `slow` load the real models and are skipped by default. They
check that all 72 bundled characters are accepted by `/predict` and that
plain images and simple shapes get 422 (about 2.5 minutes):

```
venv\Scripts\python.exe -m pytest tests -m slow
```

Or set `EMOLEARN_SLOW_TESTS=1` to include them in a full run.

## Parent PIN

If a parent forgets their PIN and their recovery code, delete both so
`/parent/pin/setup` can be used again:

```
venv\Scripts\python.exe reset_pin.py
```

## Fusion evaluation

Compares face-only, pose-only and fused accuracy on a held-out test set:

```
venv\Scripts\python.exe eval_fusion.py --test_dir eval_data/fusion_test
```

Prints a per-image table and per-branch metrics, and writes confusion-matrix
PNGs plus `eval_data/fusion_results.json`.
