import os

import numpy as np
import pandas as pd
import pytest

from app.ml import explain

CSV = os.path.join(os.path.dirname(__file__), "..", "app", "ml", "pose_branch", "data", "pose_keypoints_bg_removed.csv")


class FakeLandmark:
    def __init__(self, x, y, z=0.0, visibility=0.99):
        self.x, self.y, self.z, self.visibility = x, y, z, visibility


def landmarks_from_row(row):
    return [
        FakeLandmark(row[f"kp_{4 * i}"], row[f"kp_{4 * i + 1}"], row[f"kp_{4 * i + 2}"], row[f"kp_{4 * i + 3}"])
        for i in range(33)
    ]


def face_landmarks(image_size=(400, 800)):
    """Eyes at (180,120)/(220,120) and mouth at (200,170) in a 400x800 image."""
    w, h = image_size
    lms = [FakeLandmark(0.5, 0.5) for _ in range(33)]
    lms[explain.LEFT_EYE] = FakeLandmark(220 / w, 120 / h)
    lms[explain.RIGHT_EYE] = FakeLandmark(180 / w, 120 / h)
    lms[explain.MOUTH_LEFT] = FakeLandmark(210 / w, 170 / h)
    lms[explain.MOUTH_RIGHT] = FakeLandmark(190 / w, 170 / h)
    return lms


# --- face regions ----------------------------------------------------------

def test_regions_follow_the_landmarks():
    crop_box = (100, 50, 300, 250)
    regions = explain.face_regions_in_crop(face_landmarks(), (400, 800), crop_box)

    # Eyes at crop y=70, mouth at crop y=120
    eyes = regions["eyes"]
    mouth = regions["mouth"]
    assert eyes[1] < 70 < eyes[3]
    assert mouth[1] < 120 < mouth[3]
    assert regions["eyebrows"][3] <= eyes[1] + 1
    assert regions["forehead"][3] <= regions["eyebrows"][1] + 1


def test_regions_fall_back_when_face_landmarks_are_hidden():
    lms = face_landmarks()
    lms[explain.MOUTH_LEFT].visibility = 0.1
    regions = explain.face_regions_in_crop(lms, (400, 800), (0, 0, 200, 200))
    assert regions["mouth"] == (60, 132, 140, 160)


@pytest.mark.parametrize("hot_region", ["eyebrows", "eyes", "mouth"])
def test_focus_is_the_region_where_the_heat_is(hot_region):
    regions = explain.face_regions_in_crop(face_landmarks(), (400, 800), (100, 50, 300, 250))
    cam = np.zeros((200, 200))
    x1, y1, x2, y2 = regions[hot_region]
    cam[y1:y2, x1:x2] = 1.0

    scores = explain.score_face_regions(cam, regions)
    assert explain.focus_region(scores, cam) == hot_region


def test_focus_is_other_when_heat_is_on_the_hair():
    regions = explain.face_regions_in_crop(face_landmarks(), (400, 800), (100, 50, 300, 250))
    cam = np.zeros((200, 200))
    cam[0:15, :] = 1.0  # top strip, above the forehead

    scores = explain.score_face_regions(cam, regions)
    assert explain.focus_region(scores, cam) == "other"


# --- pose cues -------------------------------------------------------------

def _cue_rate(label, cue):
    df = pd.read_csv(CSV)
    rows = df[df.label == label]
    hits = sum(cue in explain.detect_pose_cues(landmarks_from_row(r)) for _, r in rows.iterrows())
    return hits / len(rows)


def test_head_down_is_common_for_sad_and_rare_for_happy():
    assert _cue_rate("sad", "head_down") > 0.6
    assert _cue_rate("happy", "head_down") == 0


def test_hands_by_face_shows_up_for_surprised():
    assert _cue_rate("surprised", "hands_by_face") > 0.2
    assert _cue_rate("sad", "hands_by_face") < 0.1


def test_no_cues_without_landmarks():
    assert explain.detect_pose_cues(None) == []


# --- pose occlusion --------------------------------------------------------

def test_occlusion_credits_the_group_the_model_depends_on():
    baseline = np.zeros(132)
    keypoints = np.zeros(132)
    wrist = explain.LEFT_WRIST
    keypoints[4 * wrist + 1] = 1.0

    # A fake model that only looks at the left wrist's y coordinate
    def predict_fn(kp):
        p = 0.2 + 0.7 * kp[4 * wrist + 1]
        return {"sad": p, "happy": 1 - p}

    scores = explain.pose_group_importance(keypoints, baseline, predict_fn, "sad")
    assert scores["arms"] == pytest.approx(1.0)
    assert scores["head"] == 0.0


def test_occlusion_all_zero_when_nothing_matters():
    scores = explain.pose_group_importance(np.ones(132), np.zeros(132), lambda kp: {"sad": 0.5}, "sad")
    assert set(scores.values()) == {0.0}


# --- sentences -------------------------------------------------------------

def _build(**overrides):
    args = dict(
        emotion="angry",
        confidence=0.9,
        mode="fused",
        face_emotion="angry",
        face_probs={"angry": 0.8, "happy": 0.05, "sad": 0.1, "surprised": 0.05},
        pose_emotion="angry",
        pose_probs={"angry": 0.95, "happy": 0.0, "sad": 0.05, "surprised": 0.0},
        region_scores={"eyebrows": 0.8, "eyes": 0.3, "mouth": 0.1, "forehead": 0.2, "other": 0.1},
        face_focus="eyebrows",
        pose_cues=["arms_crossed"],
        pose_group_scores={"head": 0.1, "shoulders": 0.0, "arms": 0.9, "hips": 0.0, "legs": 0.0},
    )
    args.update(overrides)
    return explain.build_explanation(**args)


def test_reason_uses_the_image_evidence():
    e = _build()
    assert "eyebrows" in e.reason and "frown" in e.reason
    assert "arms crossed" in e.reason
    assert e.reason.endswith("ANGRY!")
    assert e.pose_focus == "arms"


def test_reason_changes_when_the_evidence_changes():
    a = _build()
    b = _build(face_focus="mouth", pose_cues=["head_down"],
               pose_group_scores={"head": 0.9, "shoulders": 0, "arms": 0.1, "hips": 0, "legs": 0})
    assert a.reason != b.reason
    assert "mouth" in b.reason and "head tipped down" in b.reason


def test_reason_mentions_disagreement_between_branches():
    e = _build(emotion="surprised", face_emotion="angry", pose_emotion="surprised", pose_cues=["hands_by_face"])
    assert "but the body had hands up by the face" in e.reason
    assert "face said ANGRY and the body said SURPRISED, so I listened to the body more" in e.reason
    assert e.reason.endswith("SURPRISED!")


def test_face_only_mode_ignores_pose():
    e = _build(mode="face_only", confidence=0.5)
    assert "arms" not in e.reason
    assert e.pose_focus is None
    assert "not totally sure" in e.reason
    assert any("skipped" in line for line in e.evidence)


def test_off_face_focus_is_reported_honestly():
    e = _build(face_focus="other", mode="face_only")
    assert "hair" in e.reason
    assert e.face_cue is None