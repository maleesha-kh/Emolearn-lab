"""Text rules for the Ask Emo matcher only.

The diary models depend on app/services/text_preprocess.py, so matcher-only
steps live here: synonym groups, stop words and a rule-based topic gate.
"""
import re
from typing import Iterable, List

from app.services.text_preprocess import preprocess

# canonical word -> other ways a child might write it (multi-word entries are allowed)
SYNONYMS = {
    "scared": ["frightened", "afraid", "scard", "skared", "scary", "fear", "feared", "terrified"],
    "angry": ["mad", "cross", "angree", "angrey", "anger", "furious"],
    "cry": ["crying", "tears", "cried", "cries", "crys"],
    "worried": ["worry", "worries", "worrying", "nervous", "anxious"],
    "lonely": ["alone", "left out", "lonley"],
    "happy": ["glad", "hapy", "happiness", "joyful"],
    "sad": ["unhappy", "upset", "sadness"],
    "surprised": ["surprise", "surprises", "suprised", "suprise", "shock", "shocked", "unexpected"],
    "jealous": ["jealousy", "jelous"],
    "sorry": ["apologise", "apologize", "apology"],
    "calm": ["relax", "calmer", "calming"],
    "feel": ["feels", "feeling", "feelings", "felt", "emotion", "emotions"],
    "embarrassed": ["embarassed", "embarrassing"],
    "bored": ["boring", "boredom"],
    "dream": ["dreams", "nightmare", "nightmares"],
    "breathe": ["breathing", "breath", "breaths"],
    "miss": ["missing", "missed"],
    "lose": ["losing", "loses"],
    "disappointed": ["dissapointed", "disappointing", "let down"],
    "tease": ["teased", "teasing", "make fun"],
    "friend": ["friends", "frend", "frends", "freind"],
    "nobody": ["no one", "noone", "no body"],
}

# Common English and question words, including kid spellings. They are removed
# before both the word and the character features, so they can't dominate a match.
STOP_WORDS = {
    "what", "wat", "whats", "is", "are", "am", "was", "were", "be", "being", "been",
    "can", "could", "you", "your", "u", "ur", "do", "does", "did", "doing",
    "how", "why", "y", "when", "wen", "where", "who", "which",
    "the", "a", "an", "i", "im", "me", "my", "mine", "myself", "to", "too", "it", "its",
    "and", "or", "of", "in", "on", "at", "for", "with", "about", "that", "this", "these", "those",
    "so", "if", "then", "there", "they", "them", "their", "he", "she", "him", "her", "his",
    "we", "us", "our", "get", "gets", "got", "some", "something", "someone", "thing", "things",
    "will", "would", "should", "shall", "just", "really", "very", "much", "many", "any",
    "all", "tell", "please", "like", "okay", "ok",
}

# Rule-based topic gate: a question with none of these words (after synonyms)
# is treated as off-topic without being scored.
FEELING_WORDS = {
    "happy", "sad", "angry", "scared", "surprised", "worried", "lonely", "jealous", "shy",
    "cry", "feel", "calm", "sorry", "miss", "hug", "excited", "embarrassed", "proud", "bored",
    "disappointed", "dream", "breathe", "lose", "tease", "mean", "friend", "nobody", "bad",
    "love", "smile", "laugh", "brave", "kind", "emo", "robot",
    "cheer", "fight", "talk", "dark", "face", "faces", "butterflies",
}

_SINGLE = {variant: canon for canon, variants in SYNONYMS.items() for variant in variants if " " not in variant}
_PHRASES = [
    (re.compile(r"\b" + re.escape(variant) + r"\b"), canon)
    for canon, variants in SYNONYMS.items() for variant in variants if " " in variant
]


def prepare(text: str) -> str:
    text = preprocess(text)
    for pattern, canon in _PHRASES:
        text = pattern.sub(canon, text)
    words = [_SINGLE.get(w, w) for w in text.split()]
    return " ".join(w for w in words if w not in STOP_WORDS)


def prepare_texts(texts: Iterable[str]) -> List[str]:
    return [prepare(t) for t in texts]


def passes_topic_gate(text: str) -> bool:
    return any(w in FEELING_WORDS for w in prepare(text).split())
