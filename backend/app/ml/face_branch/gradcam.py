"""
Grad-CAM explainability — generates a visual heatmap explaining "why" the
face branch made its prediction.
"""
import base64
import io

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image

from app.core import config
from app.ml.face_branch.inference import load_face_model, preprocess_image

# Module-level cache — rebuilding the feature_extractor/classifier_head
# split on every request would be very slow
_grad_cam_models = None


def _find_nested_base_model(model: tf.keras.Model) -> tf.keras.Model:
    """Returns the first nested tf.keras.Model layer (the MobileNetV2
    submodel) among the outer face model's layers."""
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            return layer
    raise ValueError("Face model has no nested base model (tf.keras.Model layer).")


def _build_grad_cam_models(model: tf.keras.Model):
    # Conv_1 lives inside the nested MobileNetV2 submodel's own graph, not on
    # the outer model, so we split it into a feature_extractor (up to Conv_1)
    # and a classifier_head rebuilt from the remaining top-level layers,
    # and run both under one GradientTape.
    base_model = _find_nested_base_model(model)

    feature_extractor = tf.keras.Model(
        base_model.inputs,
        base_model.get_layer(config.FACE_LAST_CONV_LAYER).output,
    )

    # Rebuilds the GlobalAveragePooling2D -> Dropout -> Dense chain that
    # follows base_model, on a new Input shaped like the Conv_1 output.
    classifier_input = tf.keras.Input(shape=feature_extractor.output.shape[1:])
    x = classifier_input
    past_base_model = False
    for layer in model.layers:
        if layer is base_model:
            past_base_model = True
            continue
        if not past_base_model:
            continue
        x = layer(x)
    classifier_head = tf.keras.Model(classifier_input, x)

    return feature_extractor, classifier_head


def _get_grad_cam_models():
    global _grad_cam_models
    if _grad_cam_models is None:
        model = load_face_model()
        _grad_cam_models = _build_grad_cam_models(model)
    return _grad_cam_models


def compute_gradcam(face_crop: Image.Image, class_index: int) -> np.ndarray:
    """
    Raw Grad-CAM map for class_index, normalised to 0..1 and resized to the
    face crop's (height, width). The explanation step scores facial regions
    on this; render_heatmap_base64() turns it into the overlay image.
    """
    feature_extractor, classifier_head = _get_grad_cam_models()
    batch = preprocess_image(face_crop)  # (1, H, W, 3)

    with tf.GradientTape() as tape:
        conv_output = feature_extractor(batch)
        tape.watch(conv_output)
        predictions = classifier_head(conv_output)
        loss = predictions[:, class_index]

    grads = tape.gradient(loss, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    heatmap = conv_output[0] @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0)  # ReLU
    max_value = tf.math.reduce_max(heatmap)
    if max_value > 0:
        heatmap = heatmap / max_value
    heatmap = heatmap.numpy()

    width, height = face_crop.size
    return np.clip(cv2.resize(heatmap, (width, height)), 0.0, 1.0)


def render_heatmap_base64(face_crop: Image.Image, cam: np.ndarray) -> str:
    """
    Blends a compute_gradcam() map over the face crop and returns it as a
    base64 data-URL string the frontend can drop straight into an
    <img src="..."> tag.
    """
    original = face_crop.convert("RGB")

    heatmap_uint8 = np.uint8(255 * cam)
    heatmap_color_bgr = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_color_rgb = cv2.cvtColor(heatmap_color_bgr, cv2.COLOR_BGR2RGB)
    heatmap_img = Image.fromarray(heatmap_color_rgb)

    overlay = Image.blend(original, heatmap_img, alpha=0.4)

    buffer = io.BytesIO()
    overlay.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def generate_heatmap_base64(face_crop: Image.Image, class_index: int) -> str:
    """Grad-CAM overlay for the predicted class. face_crop must be the crop used for prediction."""
    return render_heatmap_base64(face_crop, compute_gradcam(face_crop, class_index))