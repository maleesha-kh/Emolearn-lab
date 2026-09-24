from typing import Dict, List, Optional

from pydantic import BaseModel


class BranchResult(BaseModel):
    emotion: str
    probs: Dict[str, float]


class Weights(BaseModel):
    face: float
    pose: float


class ExplanationResult(BaseModel):
    # Child-facing sentence built from this image's own evidence
    reason: str
    # Facial region the Grad-CAM heat was strongest on (eyebrows, eyes, mouth, forehead, other)
    face_focus: str
    face_region_scores: Dict[str, float]
    face_cue: Optional[str] = None
    # Body-language cues seen in the pose landmarks (hands_by_face, arms_crossed, ...)
    pose_cues: List[str] = []
    # Body part whose occlusion hurt the pose prediction most (head, arms, ...)
    pose_focus: Optional[str] = None
    pose_group_scores: Dict[str, float] = {}
    # Short technical lines for the "how did the AI decide?" panel
    evidence: List[str] = []


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
    explanation: Optional[ExplanationResult] = None