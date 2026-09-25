"""Text cleanup shared by the diary classifier training script and the backend.

The saved pipelines reference preprocess_texts by its import path, so it
must stay in this module with this name.
"""
import re
from typing import Iterable, List


def preprocess(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"([^\W\d_])\1{2,}", r"\1\1", text)
    # Punctuation is dropped so "!" or "?" can't act as a sentiment shortcut.
    # Apostrophes go without a space so "can't" and "cant" look the same.
    text = re.sub(r"['’‘`]", "", text)
    text = re.sub(r"[^\w\s]|_", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def preprocess_texts(texts: Iterable[str]) -> List[str]:
    return [preprocess(t) for t in texts]
