"""Child replies and parent tips for diary entries, keyed by emotion and reason
(and sentiment for surprised).

Child replies stay general enough to still fit if the reason was guessed a
little wrong. The pets entries cover any animal or insect, and the other
entries cover illness, injury, weather, food, gifts and lost things.
"""
import random
from typing import Dict, List, Optional, Tuple, TypedDict

from app.services.safety import CONCERN_REPLY


class Entry(TypedDict):
    child_replies: List[str]
    parent_summary: str
    tips: List[str]
    talk_starter: str


def _entry(child_replies, parent_summary, tips, talk_starter) -> Entry:
    return {
        "child_replies": child_replies,
        "parent_summary": parent_summary,
        "tips": tips,
        "talk_starter": talk_starter,
    }


TIP_BANK: Dict[Tuple[str, ...], Entry] = {
    # --- happy -------------------------------------------------------------
    ("happy", "school"): _entry(
        [
            "Yay, good things at school feel so great! 🌟",
            "I love hearing that school made you smile today.",
            "Good news from school makes the whole day brighter!",
        ],
        "Your child is feeling happy about something that went well at school, such as learning, "
        "praise from a teacher or a class activity.",
        [
            "Ask your child to show or tell you exactly what went well at school, and listen with real interest.",
            "Praise the effort behind it, for example \"You practised hard for that\", so they link good "
            "feelings with trying.",
            "Help them remember the moment by writing it down together or sharing it with another family "
            "member at dinner.",
        ],
        "What was the best part of your school day today?",
    ),
    ("happy", "friends"): _entry(
        [
            "Friends can make a day feel so bright! 😊",
            "It sounds like you had a lovely time with your friends.",
            "Having good friends and being a good friend feels wonderful.",
        ],
        "Your child is happy because of a good moment with a friend, like playing together, being "
        "included or sharing.",
        [
            "Ask what they did together and what their friend said or did that made them feel good.",
            "Point out the kind things your child did too, so they see how they help friendships grow.",
            "If you can, offer a chance to meet that friend again, such as a visit or time together at the park.",
        ],
        "What did you and your friend enjoy doing together?",
    ),
    ("happy", "family"): _entry(
        [
            "Happy times with family are so special! 💛",
            "That sounds like a really lovely time together.",
            "I'm so glad your family time made you smile.",
        ],
        "Your child is feeling happy because of time or something special shared with family.",
        [
            "Tell your child you enjoyed it too, and name what you liked about the time together.",
            "Ask which part they liked best, so you learn what kind of family time means most to them.",
            "Plan a small repeat of this moment soon, even something simple like a story or a walk together.",
        ],
        "What was your favourite part of being together today?",
    ),
    ("happy", "playing"): _entry(
        [
            "Playing and having fun is the best! 🎈",
            "Wow, that sounds like so much fun!",
            "I love that you had a happy time playing today.",
        ],
        "Your child is happy because of a game, a toy, a sport, drawing or another fun activity.",
        [
            "Ask your child to teach you the game or show you what they made, and let them lead.",
            "Notice out loud what they were good at, such as being patient, creative or trying again.",
            "Keep a little time in the week for this activity, since it clearly brings them joy.",
        ],
        "Can you show me or tell me how you play it?",
    ),
    ("happy", "pets"): _entry(
        [
            "Animals can make our hearts so happy! 🐾",
            "What a lovely moment with an animal friend.",
            "I'm so glad an animal made you smile today.",
        ],
        "Your child is happy because of an animal, which could be a pet, a stray, a bird, an insect or "
        "an animal they saw somewhere.",
        [
            "Ask what the animal did and how it made them feel, and share their delight.",
            "Talk about how animals show they feel happy or safe, which builds your child's care and empathy.",
            "Look up a fun fact about that animal together or draw it, so the good feeling lasts.",
        ],
        "What did the animal do that made you smile?",
    ),
    ("happy", "other"): _entry(
        [
            "Yay, something nice happened today! 😊",
            "That sounds like a really happy moment.",
            "I'm so glad something good made your day brighter.",
        ],
        "Your child is happy about something else in their day, such as a treat, the weather, a gift, "
        "feeling better or finding something.",
        [
            "Ask your child to tell you what happened and what the very best moment was.",
            "Help them notice small good things, for example by each naming one happy thing at bedtime.",
            "If another person was part of it, like someone who gave a gift, suggest a simple thank you together.",
        ],
        "What made today feel good for you?",
    ),
    # --- sad ---------------------------------------------------------------
    ("sad", "school"): _entry(
        [
            "School can feel really hard sometimes, and I'm here with you. 💙",
            "That sounds tough, want to take 3 big breaths with me?",
            "It's okay to feel sad about school, your feelings matter.",
        ],
        "Your child is feeling sad about something at school, such as marks, a mistake, a comment from a "
        "teacher or work that felt hard.",
        [
            "Start with comfort: sit close and say something like \"That sounded hard today\" before asking "
            "questions or trying to fix it.",
            "Once they feel calmer, gently find out what happened, without pointing to anyone as the cause.",
            "Lift the mood by recalling one thing they did well at school recently and planning a small next "
            "step together.",
        ],
        "What part of school felt hard today?",
    ),
    ("sad", "friends"): _entry(
        [
            "It hurts when things go wrong with friends, and your feelings are important. 💙",
            "Friend troubles can feel so heavy, want to take 3 slow breaths with me?",
            "I'm sorry today was hard with friends, tomorrow can feel different.",
        ],
        "Your child is sad about a friendship, perhaps feeling left out, having an argument or missing a "
        "friend.",
        [
            "Comfort first by listening to the whole story without rushing to decide who was right or wrong.",
            "Help them name what they need, such as wanting to be included, and think of one kind thing to try "
            "tomorrow.",
            "Gently lift the mood by remembering a happy time with a friend or doing a small fun activity "
            "together.",
        ],
        "How did it feel when that happened with your friend?",
    ),
    ("sad", "family"): _entry(
        [
            "Family things can make us feel sad sometimes, and that's okay. 💙",
            "That sounds hard, want to snuggle a soft toy or pillow for a bit?",
            "Your feelings matter, and your grown-up would love to hear about them.",
        ],
        "Your child is feeling sad about something in the family, such as missing someone, a disagreement "
        "or feeling less noticed.",
        [
            "Give comfort first with a hug or by sitting together, and tell them their feelings make sense.",
            "Ask gently what happened, and if it was about you, listen without defending yourself straight away.",
            "Plan a small moment of one-to-one time soon, like a walk or a story, so they feel close to you again.",
        ],
        "Is there something at home that has been making you feel sad?",
    ),
    ("sad", "playing"): _entry(
        [
            "It's disappointing when a game or toy doesn't go your way. 💙",
            "Want to shake out your arms and take a slow breath with me?",
            "It's sad when fun things end or break, maybe something fun comes next.",
        ],
        "Your child is sad because a game, toy, sport or activity did not go the way they hoped.",
        [
            "Acknowledge the disappointment first, for example \"You really wanted to win\", before offering "
            "any solutions.",
            "If something broke or ended, work out together whether it can be fixed, replaced later or done "
            "another day.",
            "Lift the mood gently by choosing a different small activity together, such as drawing or a simple "
            "game.",
        ],
        "What were you hoping would happen when you were playing?",
    ),
    ("sad", "pets"): _entry(
        [
            "Animals are so special, and it's okay to feel sad about them. 🐾",
            "I'm sorry about what happened with the animal, want a hug from your grown-up?",
            "Your caring heart is lovely, and your feelings are important.",
        ],
        "Your child is sad about an animal, for example a pet that is unwell or missing, a stray that needs "
        "help, or an animal or insect that upset them.",
        [
            "Comfort them first and let them talk about the animal, even if the worry seems small to an adult.",
            "Explain simply and honestly what is happening, and if an animal has died, say \"died\" rather than "
            "\"went to sleep\" or \"went away\", which can confuse young children.",
            "Turn their care into something they can do, such as making a drawing or talking about how animals "
            "are looked after.",
        ],
        "What happened with the animal, and how did it make you feel?",
    ),
    ("sad", "other"): _entry(
        [
            "I'm sorry today had something sad in it, I'm here with you. 💙",
            "Want to breathe in like smelling a flower, then blow out a candle?",
            "Sad days happen to everyone, and your feelings are okay.",
        ],
        "Your child is sad about something else, such as feeling unwell or hurt, losing something, the "
        "weather or a disappointment.",
        [
            "Offer comfort first, such as a hug or a quiet moment, and let them tell you what happened in "
            "their own way.",
            "If they feel unwell or hurt, check on them and look after their body first, asking a doctor if you "
            "are unsure.",
            "Once they feel a bit better, lift the mood with something small they enjoy, like a favourite song "
            "or a story.",
        ],
        "What happened today that made you feel sad?",
    ),
    # --- angry -------------------------------------------------------------
    ("angry", "school"): _entry(
        [
            "School things can make us really cross, and that feeling is okay. 💪",
            "Let's squeeze our fists tight and then let go slowly, want to try?",
            "It's okay to feel angry, your grown-up can help you sort it out.",
        ],
        "Your child is feeling angry about something at school, such as something that felt unfair, a rule, "
        "schoolwork or being told off.",
        [
            "Help them calm down first with slow breaths or a drink of water before talking about what happened.",
            "Then help them name it, for example \"It sounds like that felt unfair to you\", so they feel "
            "understood.",
            "Once they are calm, think together about one step, such as how to explain their side to the "
            "teacher politely.",
        ],
        "What happened at school that made you feel so cross?",
    ),
    ("angry", "friends"): _entry(
        [
            "It's really annoying when friends upset us, and your feelings make sense.",
            "Want to stamp your feet like a big elephant, then take a slow breath? 🐘",
            "Being angry is okay, let's find a kind way to fix it.",
        ],
        "Your child is angry with a friend, perhaps after an argument, being teased, something being taken "
        "or a broken promise.",
        [
            "Let them cool down first with a short break or some movement, like a quick walk, before discussing "
            "the friend.",
            "Name the feeling with them, for example \"You felt angry because it didn't feel fair\", without "
            "calling the friend bad.",
            "Solve it together by practising words they could use next time, such as \"Please give it back\" or "
            "\"I don't like that\".",
        ],
        "What would you like your friend to understand about how you felt?",
    ),
    ("angry", "family"): _entry(
        [
            "Sometimes family things make us cross, and that's a normal feeling.",
            "Let's pretend to blow out five birthday candles, ready? 🎂",
            "Your feelings are important, and your grown-up wants to listen.",
        ],
        "Your child is angry about something in the family, such as sharing, fairness between children, "
        "rules or plans changing.",
        [
            "Stay calm yourself and give them a quiet place to settle before talking it through.",
            "Help them say what they felt and why, for example \"I felt cross when my things were used without "
            "asking\".",
            "Then agree on a fair plan together, like a turn-taking rule or a sharing plan everyone can follow.",
        ],
        "What felt unfair or upsetting for you at home?",
    ),
    ("angry", "playing"): _entry(
        [
            "Losing or things breaking can make anyone cross, that's okay. 💪",
            "Want to count slowly to ten with me, then try again?",
            "Games can be frustrating, and you can take a break and come back.",
        ],
        "Your child is angry because a game, toy, sport or activity felt frustrating, unfair or did not work.",
        [
            "Pause the activity and help them calm down with a few deep breaths or a stretch before going back.",
            "Put the feeling into words, such as \"It's frustrating when you try hard and it doesn't work\", to "
            "show you understand.",
            "Solve it together by agreeing on game rules, taking turns or trying a slightly easier version first.",
        ],
        "What part of the game made you feel so frustrated?",
    ),
    ("angry", "pets"): _entry(
        [
            "It's okay to feel cross when an animal does something annoying.",
            "Let's take a slow breath in and a big breath out together, okay?",
            "Your feelings matter, and your grown-up can help keep you and the animal safe.",
        ],
        "Your child is angry about an animal, perhaps one that scratched, stung, chased them, broke or ate "
        "something, or would not do what they wanted.",
        [
            "First make sure your child is safe and calm, and check any scratch, bite or sting with care.",
            "Name the feeling for them, such as \"You were angry and maybe a bit scared when that happened\".",
            "Explain simply why animals sometimes act that way, and agree together on safe ways to be around them.",
        ],
        "What did the animal do, and how did you feel right then?",
    ),
    ("angry", "other"): _entry(
        [
            "Some days things just go wrong, and feeling cross is okay.",
            "Want to press your hands together hard, count to five, then relax? ✋",
            "Your grown-up can help you with what made you angry.",
        ],
        "Your child is angry about something else, such as feeling unwell, the weather spoiling a plan, a "
        "lost or broken item, or a disappointing gift.",
        [
            "Help them settle first with a calm voice and something soothing, like a cool drink or sitting "
            "together.",
            "Name what might be under the anger, for example tiredness or disappointment, and check with them "
            "if that is right.",
            "Work on a small fix together, such as looking for a lost item as a team or making a new plan for a "
            "spoiled day.",
        ],
        "What happened that made today feel so annoying?",
    ),
    # --- surprised, positive -------------------------------------------------
    ("surprised", "school", "positive"): _entry(
        [
            "Wow, what a happy surprise at school! 🎉",
            "That sounds so exciting, I love good surprises!",
            "What a fun surprise, you must have been so pleased!",
        ],
        "Your child had a pleasant surprise at school, such as unexpected praise, a prize or a special "
        "activity.",
        [
            "Share the excitement by asking them to tell you the surprise from the very beginning.",
            "Ask how they felt in that moment, to help them name mixed feelings like shy and proud.",
            "Celebrate in a small way, for example by putting their work on the wall or telling a relative.",
        ],
        "What happened at school that surprised you?",
    ),
    ("surprised", "friends", "positive"): _entry(
        [
            "Yay, a surprise from a friend is the best! 🎉",
            "Wow, that sounds like a lovely friendly surprise!",
            "Good surprises with friends make us feel so warm inside.",
        ],
        "Your child had a happy surprise with a friend, such as a kind gesture, a new friend or a friend "
        "coming back.",
        [
            "Show your excitement and ask what the friend did and what they said.",
            "Talk about how the friend's kindness made them feel, and how they might do something kind in return.",
            "Help them make a small card or note to say thank you to the friend.",
        ],
        "What was the surprise, and what did your friend say?",
    ),
    ("surprised", "family", "positive"): _entry(
        [
            "What a wonderful family surprise! 🎉",
            "Wow, surprises with family can be so exciting!",
            "That sounds like a really happy surprise together.",
        ],
        "Your child had a happy surprise in the family, such as a visitor, a special outing or good news.",
        [
            "Share their excitement openly, and let them see that you are happy about it too.",
            "Ask them to describe the moment they found out, which helps them enjoy it all over again.",
            "Take a photo, draw a picture or keep a small memory of the day together.",
        ],
        "How did you feel when you found out about the surprise?",
    ),
    ("surprised", "playing", "positive"): _entry(
        [
            "Wow, what a fun surprise! 🎉",
            "That's so exciting, surprises while playing are the best!",
            "What a happy surprise, I bet you were so excited!",
        ],
        "Your child had a fun surprise while playing, such as winning unexpectedly, a new toy or learning a "
        "new skill.",
        [
            "Join in the excitement and ask them to show you the game, toy or skill.",
            "Talk about what they did that helped it happen, like practising or being brave enough to try.",
            "Give them a chance to enjoy it again soon, for example by playing it together this week.",
        ],
        "What was the surprise when you were playing?",
    ),
    ("surprised", "pets", "positive"): _entry(
        [
            "Wow, what a lovely animal surprise! 🐾",
            "Animals can surprise us in the best ways!",
            "That sounds so exciting, animals are amazing!",
        ],
        "Your child had a happy surprise with an animal, such as seeing an unusual animal or insect, baby "
        "animals or a pet coming back.",
        [
            "Share their wonder and ask exactly what they saw and what the animal did.",
            "Find a picture or a fun fact about that animal together to keep the excitement going.",
            "Talk about how to watch animals kindly and safely, so future surprises stay happy ones.",
        ],
        "What did you see, and what did the animal do?",
    ),
    ("surprised", "other", "positive"): _entry(
        [
            "Wow, what a nice surprise! 🎉",
            "That sounds like a really happy surprise!",
            "Surprises like that can make a whole day feel special.",
        ],
        "Your child had a pleasant surprise, such as a gift, a treat, a change in the weather or finding "
        "something they had lost.",
        [
            "Match their excitement and let them tell you the whole story.",
            "Ask what the best part of the surprise was, to help them notice what they enjoy.",
            "Talk about how they could plan a nice surprise for someone else and pass the good feeling on.",
        ],
        "What was the surprise, and what was the best part?",
    ),
    # --- surprised, negative -------------------------------------------------
    ("surprised", "school", "negative"): _entry(
        [
            "Oh, that surprise sounds hard, I'm here with you. 💙",
            "Unexpected things at school can feel scary, let's take a slow breath.",
            "That sounds like a big surprise, your grown-up can help you understand it.",
        ],
        "Your child was upset by something unexpected at school, such as a surprise test, a change of plan "
        "or being told off.",
        [
            "Reassure them first that surprises like this happen, and that feeling upset about it is okay.",
            "Explain calmly what probably happened and why, for example why a test or plan was changed.",
            "Help them feel ready for next time, such as checking the school diary together each evening.",
        ],
        "What happened at school that you did not expect?",
    ),
    ("surprised", "friends", "negative"): _entry(
        [
            "Oh no, that sounds like a hard surprise. 💙",
            "It's confusing when friends do something unexpected, your feelings make sense.",
            "That must have felt strange, want to take a deep breath with me?",
        ],
        "Your child was upset by something unexpected with a friend, such as a friend leaving, changing "
        "or not saying goodbye.",
        [
            "Reassure them that it is normal to feel confused when a friend acts in an unexpected way.",
            "Help them think about what might have happened from the friend's side, without deciding who is "
            "to blame.",
            "Plan together how they could talk to the friend, or who else they could play with in the meantime.",
        ],
        "What did your friend do that surprised you?",
    ),
    ("surprised", "family", "negative"): _entry(
        [
            "Oh, that sounds like an upsetting surprise. 💙",
            "Unexpected changes can feel wobbly, your grown-up is here for you.",
            "That was a lot to take in, want a cosy hug?",
        ],
        "Your child was upset by something unexpected in the family, such as a change in plans, someone "
        "going away or news they did not expect.",
        [
            "Reassure them with a hug and tell them it is okay to feel upset when things change suddenly.",
            "Explain what happened in simple, honest words suited to their age, and what will stay the same "
            "for them.",
            "Keep familiar routines like meals and bedtime steady, which helps children feel safe after a "
            "surprise.",
        ],
        "Was there something at home that surprised you or worried you?",
    ),
    ("surprised", "playing", "negative"): _entry(
        [
            "Oh no, that surprise wasn't fun at all. 💙",
            "Unexpected things during play can be upsetting, want to take a break?",
            "That sounds disappointing, we can find a new way to have fun.",
        ],
        "Your child was upset by something unexpected while playing, such as a toy breaking, a game ending "
        "suddenly or a sudden loss.",
        [
            "Reassure them that it is okay to be upset when play goes wrong all of a sudden.",
            "Explain what happened in a simple way, such as why a toy broke or why the game had to stop.",
            "Help them move on by fixing what can be fixed or choosing another activity together.",
        ],
        "What happened while you were playing that you did not expect?",
    ),
    ("surprised", "pets", "negative"): _entry(
        [
            "Oh, that sounds like a scary surprise, your grown-up can help.",
            "Animals can surprise us sometimes, let's take a slow breath together.",
            "That must have been a shock, and your feelings are okay.",
        ],
        "Your child was upset by something unexpected with an animal, such as being chased, stung or "
        "scratched, or an animal going missing.",
        [
            "Check gently that they are safe and not hurt, then reassure them, and look for any scratch, bite "
            "or sting.",
            "Explain in simple words why the animal may have acted that way, for example feeling scared or "
            "protecting its home.",
            "Teach one easy safety rule together, such as staying still near bees or not touching animals you "
            "do not know.",
        ],
        "What happened with the animal, and how are you feeling now?",
    ),
    ("surprised", "other", "negative"): _entry(
        [
            "Oh no, that sounds like an unhappy surprise. 💙",
            "Surprises like that can feel upsetting, want to take 3 big breaths?",
            "That sounds hard, your grown-up can help make it better.",
        ],
        "Your child was upset by something unexpected, such as suddenly feeling unwell or hurt, bad "
        "weather, a lost item or a disappointing gift.",
        [
            "Reassure them calmly, and if they are hurt or unwell, check first that they are okay.",
            "Explain what happened in simple words, for example that weather can change quickly or that things "
            "sometimes get lost.",
            "Help them feel in control again with a small plan, like a safe place for special things or ideas "
            "for rainy days.",
        ],
        "What happened that you were not expecting?",
    ),
}

DEFAULTS: Dict[str, Entry] = {
    "happy": _entry(
        [
            "Yay, I'm so happy for you! 😊",
            "That sounds like a lovely thing to feel happy about.",
            "Happy feelings are wonderful, thank you for sharing yours.",
        ],
        "Your child is feeling happy about something in their day.",
        [
            "Ask your child what made them happy and listen with interest.",
            "Help them notice the feeling, for example \"You look so happy, what made today good?\".",
            "Share one happy moment from your own day, so talking about good feelings becomes a habit.",
        ],
        "What made you feel happy today?",
    ),
    "sad": _entry(
        [
            "I'm sorry you feel sad, and I'm here with you. 💙",
            "Want to take 3 big breaths with me?",
            "Sad feelings are okay, and your grown-up would love to give you a hug.",
        ],
        "Your child is feeling sad about something in their day.",
        [
            "Sit close and offer comfort before asking what happened.",
            "Let them talk or stay quiet, and tell them that feeling sad is okay.",
            "When they feel ready, do something calm and gentle together to lift their mood.",
        ],
        "Would you like to tell me what made you feel sad?",
    ),
    "angry": _entry(
        [
            "Feeling angry is okay, and your feelings matter. 💪",
            "Let's breathe in slowly and blow it out like a dragon, ready?",
            "Your grown-up can help you work out what to do next.",
        ],
        "Your child is feeling angry about something in their day.",
        [
            "Help your child calm their body first, with slow breathing or a short quiet break.",
            "Once they are calm, help them say what they felt and what caused it.",
            "Think together about one small thing that could make the situation better.",
        ],
        "What happened that made you feel angry?",
    ),
    "surprised_positive": _entry(
        [
            "Wow, what a great surprise! 🎉",
            "Surprises like that are so exciting!",
            "That sounds like a wonderful surprise.",
        ],
        "Your child had a happy surprise today.",
        [
            "Share their excitement and let them tell you all about it.",
            "Ask how they felt when it happened, and enjoy the moment together.",
            "Help them remember it with a drawing, a photo or a note in their diary.",
        ],
        "What was the surprise today?",
    ),
    "surprised_negative": _entry(
        [
            "Oh, that sounds like a hard surprise, I'm here with you. 💙",
            "Unexpected things can feel upsetting, want to take a slow breath with me?",
            "Your grown-up can help you understand what happened.",
        ],
        "Your child was upset by something unexpected today.",
        [
            "Check that your child is safe, then reassure them that feeling upset after a surprise is normal.",
            "Explain what happened in simple, honest words.",
            "Keep the rest of the day calm and predictable to help them settle.",
        ],
        "What happened today that you were not expecting?",
    ),
    "surprised_unsure": _entry(
        [
            "Wow, that was a surprise! Tell your grown-up all about it. 😮",
            "Surprises can feel all kinds of ways, and that's okay.",
            "What a surprise, your grown-up would love to hear about it!",
        ],
        "Your child had a surprise today, and it is not clear whether it felt good or bad.",
        [
            "Ask gently whether the surprise felt good, bad or a bit of both.",
            "Accept whatever answer they give, since surprises often bring mixed feelings.",
            "If it felt bad, reassure them and explain what happened; if it felt good, share the excitement.",
        ],
        "Was the surprise a happy one, a worrying one or a bit of both?",
    ),
}

WATCH_NOTE = "Your child used some words that may be worth gently asking about."

CONCERN_RESPONSE = {
    "child": CONCERN_REPLY,
    "parent_summary": "Your child wrote something that may need your attention.",
    "tips": [
        "Stay calm, listen carefully and do not blame your child for anything they share.",
        "Thank your child for telling you, and let them know they did the right thing.",
        "If you are worried, contact a professional you trust or call the 1929 child helpline (Sri Lanka).",
    ],
    "talk_starter": "Can you tell me more about what happened? You're not in trouble.",
}


def get_entry(emotion: str, reason: Optional[str], sentiment: Optional[str] = None) -> Entry:
    if emotion == "surprised":
        if sentiment not in ("positive", "negative"):
            return DEFAULTS["surprised_unsure"]
        return TIP_BANK.get((emotion, reason, sentiment), DEFAULTS[f"surprised_{sentiment}"])
    return TIP_BANK.get((emotion, reason), DEFAULTS[emotion])


def pick_child_reply(entry: Entry, rng: Optional[random.Random] = None) -> str:
    return (rng or random).choice(entry["child_replies"])


def intensity_note(intensity: str) -> str:
    return "Your child said this feeling was big." if intensity == "lot" else ""
