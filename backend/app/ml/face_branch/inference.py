"""
Face branch inference — gets an emotion probability for an uploaded image
from the fine-tuned MobileNetV2 model (v4).
"""
from typing import Dict

import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

from app.core import config

# Module-level caches — reloading the model on every request would be very slow
_face_model = None
_feature_model = None  # same model, cut at the pooling layer, before the dense head


def _build_architecture() -> tf.keras.Model:
    """
    Must match the layer order/shapes the v4 weights were trained with.
    """
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(config.FACE_IMG_SIZE, config.FACE_IMG_SIZE, 3),
        include_top=False,
        weights=None,  # load_weights() will overwrite these with the real weights anyway
    )
    inputs = tf.keras.Input(shape=(config.FACE_IMG_SIZE, config.FACE_IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d")(x)
    x = tf.keras.layers.Dropout(0.3, name="dropout")(x)
    outputs = tf.keras.layers.Dense(len(config.EMOTION_CLASSES), activation="softmax", name="dense")(x)
    return tf.keras.Model(inputs, outputs)


def load_face_model():
    """Call this during the FastAPI startup event."""
    global _face_model, _feature_model
    if _face_model is None:
        model = _build_architecture()
        model.load_weights(config.FACE_MODEL_PATH)
        _face_model = model
        _feature_model = tf.keras.Model(model.input, model.get_layer("global_average_pooling2d").output)
    return _face_model


def preprocess_image(face_rgb: Image.Image) -> np.ndarray:
    """
    Receives an already-cropped RGB face image. Does not crop.
    Uses tf.image.resize (not PIL's resize) to match the resizing the
    reference predictions in eval_data/face_parity were generated with.
    """
    arr = np.array(face_rgb).astype("float32")
    arr = tf.image.resize(arr, (config.FACE_IMG_SIZE, config.FACE_IMG_SIZE), method="bilinear").numpy()
    arr = preprocess_input(arr)  # MobileNetV2's own normalization
    return np.expand_dims(arr, axis=0)


def face_logits(face_rgb: Image.Image) -> np.ndarray:
    """Pre-softmax logits, from the pooled features run through the dense layer's own kernel and bias."""
    load_face_model()
    batch = preprocess_image(face_rgb)
    pooled = _feature_model.predict(batch, verbose=0)
    kernel, bias = _face_model.get_layer("dense").get_weights()
    return (pooled @ kernel + bias)[0]


def _softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - np.max(logits)
    exp = np.exp(shifted)
    return exp / exp.sum()


def predict_face(face_rgb: Image.Image) -> Dict[str, float]:
    logits = face_logits(face_rgb)
    probs = _softmax(logits / config.FACE_TEMPERATURE)
    return {label: float(p) for label, p in zip(config.EMOTION_CLASSES, probs)}
