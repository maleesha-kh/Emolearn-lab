"""Two-level keyword safety filter for diary notes: HIGH phrases get the
"tell a grown-up" reply, WATCH phrases are only recorded for the parent."""
import re
from typing import Dict, List, Tuple

FEAR_OF_MY = ["scared of my", "scard of my", "afraid of my"]

# Caregivers and adults at home, including Sinhala and Tamil family words.
HOME_ADULTS = [
    "dad", "daddy", "father", "mom", "mum", "mommy", "mummy", "mother",
    "stepdad", "step dad", "stepfather", "step father",
    "stepmom", "step mom", "stepmum", "step mum", "stepmother", "step mother",
    "uncle", "aunty", "aunt", "grandpa", "grandma", "grandfather", "grandmother",
    "amma", "thaththa", "appa", "achchi", "seeya", "mama", "nanda", "bappa",
    "punchi amma", "loku amma",
    "babysitter", "nanny", "cousin",
]

# Lowercase, no apostrophes ("dont tell" also matches "don't tell").
HIGH_PHRASES: Dict[str, List[str]] = {
    "hurt_by_someone": [
        "hit me", "hits me", "hitting me", "hitted me",
        "hurt me", "hurts me", "hurted me", "hurting me",
        "kick me", "kicks me", "kicked me", "kicking me", "kickd me",
        "punch me", "punches me", "punched me", "punching me", "punchd me",
        "slap me", "slaps me", "slapped me", "slaped me", "slapping me",
        "smack me", "smacks me", "smacked me", "smackd me",
        "beat me", "beats me", "beat me up", "beated me", "beating me",
        "choke me", "choked me", "chokes me",
        "whip me", "whipped me", "whiped me",
        "burn me", "burned me", "burnt me",
        "threw things at me", "throws things at me",
        "bully me", "bullies me", "bullied me", "bullying me",
    ],
    "self_harm": [
        "want to die", "wanna die", "want too die",
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
        "scared of him", "scared of her", "scared of them",
        "scard of him", "scard of her", "scard of them",
        "skared of him", "skared of her",
        "afraid of him", "afraid of her", "afraid of them",
        "he scares me", "she scares me", "they scare me",
        "scared to go home", "scard to go home", "scared of going home",
        "dont want to go home", "dont wanna go home",
        "threatened me", "threatens me", "threatning me",
        *[f"{start} {adult}" for start in FEAR_OF_MY for adult in HOME_ADULTS],
    ],
    "secrets_or_touching": [
        "dont tell", "do not tell", "not tell anyone", "not to tell", "never tell",
        "our secret", "keep it secret", "keep it a secret", "said dont tell", "told me not to tell",
        "touch me", "touched me", "touches me", "touching me", "touchd me", "tuched me",
        "touched my private", "touched my privates",
        "private parts", "private part", "privates", "my private",
        "bad touch", "made me touch", "make me touch",
        "no clothes", "take off my clothes", "took off my clothes", "take my clothes off",
        "took my clothes off", "undress", "undressed",
    ],
    "danger": [
        "stab", "stabbed", "stabbing",
        "locked me", "lock me", "locks me", "locked in", "locked up",
        "set fire", "house fire",
        "cant breathe", "cant breath",
        "want to run away", "wanna run away", "going to run away", "gonna run away",
        "kidnap", "kidnapped", "kidnaped", "took me away",
    ],
}

WATCH_PHRASES: Dict[str, List[str]] = {
    "hurt_by_someone": [
        "hurt by",
        "bite me", "bit me", "bites me", "biting me",
        "push me", "pushes me", "pushed me", "pushd me", "shoved me",
        "pinch me", "pinches me", "pinched me",
        "grab me", "grabbed me", "grabed me", "grabs me",
        "pulls my hair", "pulled my hair", "pull my hair",
        "bruise", "bruises", "bruised",
    ],
    "self_harm": [
        "going to die",
    ],
    "fear_of_a_person": [
        "scared of my", "scard of my", "afraid of my",
        "frightened of", "terrified of",
        "scares me", "makes me scared", "makes me scard", "make me scared",
        "yells at me", "yelled at me", "yelling at me",
        "shouts at me", "shouted at me", "screams at me", "screamed at me",
        "follows me", "followed me", "following me",
        "stranger",
    ],
    "secrets_or_touching": [
        "secret", "secrets",
        "touched my", "touches my", "touch my",
        "kissed me", "kisses me", "kiss me",
        "sit on his lap", "sit on her lap",
        "in my bed", "in the bath with",
        "naked",
    ],
    "danger": [
        "knife", "knifes", "knives",
        "gun", "guns", "weapon",
        "bleeding", "bleed", "blood",
        "on fire",
        "poison", "poisoned",
        "run away", "ran away", "running away",
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
    # Squash every repeated letter so "hiit me" still matches "hit me".
    return re.sub(r"([^\W\d_])\1+", r"\1", normalize(text).replace("'", ""))


def _phrase_pattern(phrase: str) -> re.Pattern:
    words = _match_form(phrase).split()
    return re.compile(r"(?<!\w)" + r"\s+".join(re.escape(w) for w in words) + r"(?!\w)")


def _compile(phrases: Dict[str, List[str]]) -> Dict[str, List[re.Pattern]]:
    return {category: [_phrase_pattern(p) for p in items] for category, items in phrases.items()}


_HIGH_PATTERNS = _compile(HIGH_PHRASES)
_WATCH_PATTERNS = _compile(WATCH_PHRASES)


def _matched(patterns: Dict[str, List[re.Pattern]], cleaned: str) -> List[str]:
    return [category for category, items in patterns.items() if any(p.search(cleaned) for p in items)]


def check_concern(text: str) -> Tuple[str, List[str]]:
    if not text:
        return "none", []
    cleaned = _match_form(text)
    high = _matched(_HIGH_PATTERNS, cleaned)
    watch = _matched(_WATCH_PATTERNS, cleaned)
    categories = [c for c in HIGH_PHRASES if c in high or c in watch]
    if high:
        return "high", categories
    if watch:
        return "watch", categories
    return "none", []
