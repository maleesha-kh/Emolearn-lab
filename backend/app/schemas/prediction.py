from pydantic import BaseModel

class PredictionResponse(BaseModel):
    predicted_emotion: str
    confidence: float