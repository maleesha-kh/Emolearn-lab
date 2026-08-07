from fastapi import APIRouter, UploadFile, File
from app.schemas.prediction import PredictionResponse

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
async def predict_emotion(file: UploadFile = File(...)):
    # TODO: replace this mock logic with real model inference later
    return PredictionResponse(
        predicted_emotion="happy",
        confidence=0.85
    )