"""Keyword safety filter for diary notes.

Over-flagging is fine here: missing a child who needs help is worse than
showing the "tell a grown-up" reply when it wasn't needed.

Phrases are written in lowercase without apostrophes ("dont tell" also
matches "don't tell" and "don’t tell"). Each phrase only matches as whole
words, so "hit me" never matches inside "white". For matching, every
repeated letter is also squashed to one in both the note and the phrases,
so "hiiit me" (normalized to "hiit me") still matches "hit me".
"""
import re
from typing import Dict, List, Tuple

CONCERN_PHRASES: Dict[str, List[str]] = {
    "hurt_by_someone": [
        "hit me", "hits me", "hitting me", "hitted me",
        "hurt me", "hurts me", "hurted me", "hurting me", "hurt by",
        "kick me", "kicks me", "kicked me", "kicking me", "kickd me",
        "punch me", "punches me", "punched me", "punching me", "punchd me",
        "slap me", "slaps me", "slapped me", "slaped me", "slapping me",
        "smack me", "smacks me", "smacked me", "smackd me",
        "beat me", "beats me", "beat me up", "beated me", "beating me",
        "bite me", "bit me", "bites me", "biting me",
        "push me", "pushes me", "pushed me", "pushd me", "shoved me",
        "pinch me", "pinches me", "pinched me",
        "choke me", "choked me", "chokes me",
        "grab me", "grabbed me", "grabed me", "grabs me",
        "whip me", "whipped me", "whiped me",
        "burn me", "burned me", "burnt me",
        "pulls my hair", "pulled my hair", "pull my hair",
        "threw things at me", "throws things at me",
        "bully me", "bullies me", "bullied me", "bullying me",
        "bruise", "bruises", "bruised",
    ],
    "self_harm": [
        "want to die", "wanna die", "want too die", "going to die",
        "wish i was dead", "wish i were dead", "want to be dead",
        "wish i wasnt born", "wish i was never born", "wish i wasnt alive",
        "kill myself", "kill my self", "killing myself", "kil myself",
        "hurt myself", "hurt my self", "hurting myself", "hurts myself",
        "cut myself", "cut my self", "cutting myself",
        "end my life", "suicide",
        "dont want to live", "dont wanna live", "dont want to be alive",
        "dont want to be here", "dont want to exist",
        "better off dead", "better off without me",
        "no one would miss me", "nobody would miss me", "no one loves me", "nobody loves me",
        "hate myself", "hate my self", "hate my life",
        "want to disappear", "wanna disappear",
    ],
    "fear_of_a_person": [
        "scared of him", "scared of her", "scared of them", "scared of my",
        "scard of him", "scard of her", "scard of them", "scard of my",
        "skared of him", "skared of her",
        "afraid of him", "afraid of her", "afraid of them", "afraid of my",
        "frightened of", "terrified of",
        "he scares me", "she scares me", "they scare me", "scares me",
        "makes me scared", "makes me scard", "make me scared",
        "scared to go home", "scard to go home", "scared of going home",
        "dont want to go home", "dont wanna go home",
        "yells at me", "yelled at me", "yelling at me",
        "shouts at me", "shouted at me", "screams at me", "screamed at me",
        "threatened me", "threatens me", "threatning me",
        "follows me", "followed me", "following me",
        "stranger",
    ],
    "secrets_or_touching": [
        "dont tell", "do not tell", "not tell anyone", "not to tell", "never tell",
        "secret", "secrets",
        "touch me", "touched me", "touches me", "touching me", "touchd me", "tuched me",
        "touched my", "touches my", "touch my",
        "private parts", "private part", "privates", "my private",
        "bad touch", "made me touch", "make me touch",
        "no clothes", "take off my clothes", "took off my clothes", "take my clothes off",
        "took my clothes off", "undress", "undressed", "naked",
        "kissed me", "kisses me", "kiss me",
        "sit on his lap", "sit on her lap",
        "in my bed", "in the bath with",
    ],
    "danger": [
        "knife", "knifes", "knives",
        "gun", "guns", "weapon",
        "stab", "stabbed", "stabbing",
        "bleeding", "bleed", "blood",
        "locked me", "lock me", "locks me", "locked in", "locked up",
        "on fire", "set fire", "house fire",
        "poison", "poisoned",
        "cant breathe", "cant breath",
        "run away", "ran away", "running away",
        "kidnap", "kidnapped", "kidnaped", "took me away",
        "home alone", "left me alone", "left alone",
        "no food", "nothing to eat",
    ],
}

CONCERN_REPLY = "Thank you for telling me. Please tell a grown-up you trust right away. 💙"

_CURLY_QUOTES = str.maketrans({"‘": "'", "’": "'", "‛": "'", "`": "'", "´": "'", "“": '"', "”": '"'})


def normalize(text: str) -> str:
    text = text.lower().translate(_CURLY_QUOTES)
    # Punctuation becomes a space so "hit-me" and "me,he" still split into words.
    text = re.sub(r"[^\w\s']|_", " ", text)
    text = re.sub(r"([^\W\d_])\1{2,}", r"\1\1", text)
    return re.sub(r"\s+", " ", text).strip()


def _match_form(text: str) -> str:
    return re.sub(r"([^\W\d_])\1+", r"\1", normalize(text).replace("'", ""))


def _phrase_pattern(phrase: str) -> re.Pattern:
    words = _match_form(phrase).split()
    return re.compile(r"(?<!\w)" + r"\s+".join(re.escape(w) for w in words) + r"(?!\w)")


_PATTERNS: Dict[str, List[re.Pattern]] = {
    category: [_phrase_pattern(p) for p in phrases] for category, phrases in CONCERN_PHRASES.items()
}


def has_concern(text: str) -> Tuple[bool, List[str]]:
    if not text:
        return False, []
    cleaned = _match_form(text)
    matched = [category for category, patterns in _PATTERNS.items() if any(p.search(cleaned) for p in patterns)]
    return bool(matched), matched
