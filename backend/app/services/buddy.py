"""Ask Emo: matches a child's question to the feelings FAQ with TF-IDF cosine
similarity. No external AI; the matcher is fitted on the FAQ itself the first
time it is needed.

Before scoring, a rule-based topic gate (buddy_text.passes_topic_gate) turns
away questions with no feelings word, so off-topic questions that share
common words with the FAQ ("what is 5 plus 5") can't match.
"""
import random
import threading
from typing import List, Optional, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer

from app.data.buddy_faq import FAQ, FAQ_BY_ID, SUGGESTED_IDS, FaqItem
from app.services.buddy_text import passes_topic_gate, prepare_texts
from app.services.diary_config import BUDDY_MATCH_THRESHOLD

NO_MATCH_REPLY = "Hmm, I'm not sure what to say to that. You can tell your grown-up about it, or try one of these 👇"
RESTING_REPLY = "Emo is resting, come back tomorrow! 😴"
DAILY_LIMIT = 10
RELATED_COUNT = 2
RELATED_MIN_SCORE = 0.2

_matcher = None
_lock = threading.Lock()


class _Matcher:
    def __init__(self, faq: List[FaqItem]):
        texts, self.owners = [], []
        for item in faq:
            for text in [item["question"], *item["phrasings"]]:
                texts.append(text)
                self.owners.append(item)
        self.vectorizer = Pipeline([
            ("clean", FunctionTransformer(prepare_texts)),
            ("features", FeatureUnion([
                ("word", TfidfVectorizer(ngram_range=(1, 2))),
                ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4))),
            ])),
        ])
        self.matrix = self.vectorizer.fit_transform(texts)

    def best(self, question: str) -> Tuple[FaqItem, float]:
        scores = cosine_similarity(self.vectorizer.transform([question]), self.matrix)[0]
        i = int(scores.argmax())
        return self.owners[i], round(float(scores[i]), 4)

    def item_scores(self, question: str) -> List[Tuple[FaqItem, float]]:
        """Each FAQ item's best phrasing score, highest first (FAQ order on ties)."""
        scores = cosine_similarity(self.vectorizer.transform([question]), self.matrix)[0]
        best = {}
        for owner, score in zip(self.owners, scores):
            if owner["id"] not in best or score > best[owner["id"]][1]:
                best[owner["id"]] = (owner, float(score))
        return sorted(best.values(), key=lambda pair: -pair[1])


def _get_matcher() -> _Matcher:
    global _matcher
    if _matcher is None:
        with _lock:
            if _matcher is None:
                _matcher = _Matcher(FAQ)
    return _matcher


def best_match(question: str) -> Tuple[Optional[FaqItem], float]:
    """The closest FAQ item and its score, whatever the threshold. Questions that
    fail the topic gate are not scored: (None, 0.0)."""
    if not passes_topic_gate(question):
        return None, 0.0
    return _get_matcher().best(question)


def match(question: str, threshold: float = BUDDY_MATCH_THRESHOLD) -> Tuple[Optional[FaqItem], float]:
    item, score = best_match(question)
    return (item if item is not None and score >= threshold else None), score


def related(question: str, chosen_id: str) -> List[FaqItem]:
    """The next best items after the chosen one, for "you might also ask" links.
    Does not affect which answer is chosen."""
    if not passes_topic_gate(question):
        return []
    others = [
        item for item, score in _get_matcher().item_scores(question)
        if item["id"] != chosen_id and score > RELATED_MIN_SCORE
    ]
    return others[:RELATED_COUNT]


def suggestions(n: int = 3, rng: Optional[random.Random] = None) -> List[FaqItem]:
    ids = (rng or random).sample(SUGGESTED_IDS, n)
    return [FAQ_BY_ID[i] for i in ids]
