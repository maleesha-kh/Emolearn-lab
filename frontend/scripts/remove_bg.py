"""
Removes the flat gray studio background from the EmoLearn character dataset
so the PNGs composite cleanly onto colored UI cards.

Usage:
    pip install pillow numpy scipy --break-system-packages
    python3 scripts/remove_bg.py <path-to-test-folder> <output-folder>

Example:
    python3 scripts/remove_bg.py ../dataset/test public/images/characters

<path-to-test-folder> should contain happy/, sad/, angry/, surprised/
subfolders (i.e. the same layout as the dataset's test.zip). This script
only READS from that folder and writes new files elsewhere — it never
modifies your original dataset, so nothing in the MediaPipe/model training
pipeline is affected.

Approach: the background is a near-uniform light gray with no existing
alpha. Pixels close in color to the sampled corner color are marked
background (including gaps enclosed by limbs/hair, e.g. between a raised
arm and the head — not just regions touching the image border). The mask
is grown by a couple pixels to eat the gray/skin anti-aliased fringe along
edges (cheap chroma-key defringe), then feathered for a soft edge.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

EMOTIONS = ["happy", "sad", "angry", "surprised"]
THRESHOLD = 22
FEATHER_PX = 2
TARGET_MAX_DIM = 900


def bg_mask_for(arr: np.ndarray) -> np.ndarray:
    h, w, _ = arr.shape
    rgb = arr[:, :, :3].astype(np.int16)

    corner_pts = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
    corner_colors = np.array([rgb[y, x] for y, x in corner_pts])
    bg_color = np.median(corner_colors, axis=0)

    dist = np.abs(rgb - bg_color).sum(axis=2)
    mask = dist <= THRESHOLD
    mask = ndimage.binary_dilation(mask, iterations=2)
    return mask


def process_one(src_path: str, dst_path: str):
    im = Image.open(src_path).convert("RGB")
    arr = np.array(im)
    bg_mask = bg_mask_for(arr)

    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L").filter(
        ImageFilter.GaussianBlur(FEATHER_PX)
    )

    rgba = np.dstack([arr, np.array(alpha_img)])
    out = Image.fromarray(rgba, mode="RGBA")

    w, h = out.size
    scale = TARGET_MAX_DIM / max(w, h)
    if scale < 1:
        out = out.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    out.save(dst_path, "PNG", optimize=True)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    src_root, dst_root = sys.argv[1], sys.argv[2]
    for emo in EMOTIONS:
        src_dir = os.path.join(src_root, emo)
        if not os.path.isdir(src_dir):
            print(f"skipping missing folder: {src_dir}")
            continue
        for fname in sorted(os.listdir(src_dir)):
            src_path = os.path.join(src_dir, fname)
            dst_path = os.path.join(dst_root, emo, fname)
            process_one(src_path, dst_path)
            print(f"processed {emo}/{fname}")


if __name__ == "__main__":
    main()
