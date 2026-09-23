import pytest

from app.core import config
from app.core.fusion import fuse_predictions


class FakeLandmark:
    def __init__(self, visibility, x=0.5, y=0.5):
        self.visibility = visibility
        self.x = x
        self.y = y


def make_landmarks(visibility, x=0.5, y=0.5):
    return [FakeLandmark(visibility, x, y) for _ in range(33)]


def test_fused_when_both_branches_favour_sad():
    face_probs = {"angry": 0.1, "happy": 0.1, "sad": 0.7, "surprised": 0.1}
    pose_probs = {"angry": 0.05, "happy": 0.05, "sad": 0.8, "surprised": 0.1}
    landmarks = make_landmarks(0.9)

    result = fuse_predictions(face_probs, pose_probs, landmarks)

    assert result.mode == "fused"
    assert result.emotion == "sad"
    assert result.weights["face"] + result.weights["pose"] == pytest.approx(1.0)


def test_face_only_when_pose_probs_is_none():
    face_probs = {"angry": 0.1, "happy": 0.6, "sad": 0.2, "surprised": 0.1}

    result = fuse_predictions(face_probs, None, None)

    assert result.mode == "face_only"
    assert result.emotion == "happy"
    assert result.confidence == face_probs["happy"]


def test_face_only_when_landmarks_have_low_visibility():
    face_probs = {"angry": 0.1, "happy": 0.6, "sad": 0.2, "surprised": 0.1}
    pose_probs = {"angry": 0.1, "happy": 0.1, "sad": 0.1, "surprised": 0.7}
    landmarks = make_landmarks(0.1)

    result = fuse_predictions(face_probs, pose_probs, landmarks)

    assert result.mode == "face_only"
    assert result.weights == {"face": 1.0, "pose": 0.0}


def test_face_only_when_hips_are_outside_the_frame():
    face_probs = {"angry": 0.1, "happy": 0.6, "sad": 0.2, "surprised": 0.1}
    pose_probs = {"angry": 0.1, "happy": 0.1, "sad": 0.1, "surprised": 0.7}

    # Arms fully in frame, but hips cropped out — the pose model only ever
    # saw full-body training images, so this partial pose isn't reliable.
    landmarks = make_landmarks(0.9)
    landmarks[23].y = 1.4
    landmarks[24].y = 1.4

    result = fuse_predictions(face_probs, pose_probs, landmarks)

    assert result.mode == "face_only"


def test_missing_class_raises_value_error():
    face_probs = {"angry": 0.1, "happy": 0.6, "sad": 0.2, "surprised": 0.1}
    pose_probs = {"angry": 0.1, "happy": 0.1, "sad": 0.1}  # missing "surprised"
    landmarks = make_landmarks(0.9)

    with pytest.raises(ValueError):
        fuse_predictions(face_probs, pose_probs, landmarks)
