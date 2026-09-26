"""Report which devices and execution providers the models load onto.

Loads the models through the app's own loaders, in a separate process with the
same environment as the benchmarked backend (set CUDA_VISIBLE_DEVICES=-1
before running). Prints JSON.
"""
import json
import os
import platform
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)


def main() -> None:
    import onnxruntime as ort
    import tensorflow as tf
    import mediapipe as mp

    from app.ml.face_branch.inference import load_face_model
    from app.ml.pose_branch.inference import load_pose_model
    from app.ml.preprocessing import load_rembg_session

    face_model = load_face_model()
    load_pose_model()
    rembg_session = load_rembg_session()

    result = {
        "platform": platform.platform(),
        "cuda_visible_devices": os.environ.get("CUDA_VISIBLE_DEVICES"),
        "tensorflow": {
            "version": tf.__version__,
            "built_with_cuda": tf.test.is_built_with_cuda(),
            "physical_devices": [d.device_type + ":" + d.name for d in tf.config.list_physical_devices()],
            "visible_gpus": [d.name for d in tf.config.list_physical_devices("GPU")],
            # Keras 3 variables keep the backing tf.Variable in .value
            "face_model_weight_devices": sorted({getattr(w, "value", w).device for w in face_model.weights}),
        },
        "onnxruntime": {
            "version": ort.__version__,
            "available_providers": ort.get_available_providers(),
            "rembg_session_providers": rembg_session.inner_session.get_providers(),
        },
        "mediapipe": {
            "version": mp.__version__,
            "pose_api": "mp.solutions.pose.Pose (legacy solutions graph, runs on CPU)",
        },
        "pose_classifier": "scikit-learn RandomForest (CPU only)",
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
