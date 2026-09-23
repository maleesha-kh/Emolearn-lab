from typing import Dict, Optional

from pydantic import BaseModel


class BranchResult(BaseModel):
    emotion: str
    probs: Dict[str, float]


class Weights(BaseModel):
    face: float
    pose: float


class PredictionResponse(BaseModel):
    emotion: str
    confidence: float
    mode: str
    fused_probs: Dict[str, float]
    face: BranchResult
    pose: Optional[BranchResult] = None
    weights: Weights
    heatmap_base64: Optional[str] = None
    heatmap_emotion: str
