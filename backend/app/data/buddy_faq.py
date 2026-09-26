"""Questions and answers for Ask Emo, the feelings FAQ bot for children aged
5-10. Each item's phrasings are extra ways a child might ask the question,
including kid spellings and Sri Lankan kid English; the matcher is fitted on
the question and all phrasings.
"""
from typing import Dict, List, TypedDict


class FaqItem(TypedDict):
    id: str
    question: str
    phrasings: List[str]
    answer: str


FAQ: List[FaqItem] = [
    {
        "id": "what-is-happy",
        "question": "What does happy mean?",
        "phrasings": ["what is happy", "wat is hapy feeling", "how do i know im happy", "what happens when we feel happy"],
        "answer": "Happy is a warm, bright feeling you get when something good happens. "
                  "You might smile, laugh or feel like jumping! 😊",
    },
    {
        "id": "what-is-sad",
        "question": "What does sad mean?",
        "phrasings": ["what is sad", "wat is sad feeling", "how do i know if im sad", "what is feeling sad like"],
        "answer": "Sad is a heavy feeling when something hurts or we miss something. "
                  "You might feel quiet or want to cry, and that's okay. 💙",
    },
    {
        "id": "what-is-angry",
        "question": "What does angry mean?",
        "phrasings": ["what is angry", "wat is angry feeling", "what is being cross", "what does mad mean"],
        "answer": "Angry is a hot, strong feeling when something feels unfair or goes wrong. "
                  "Your face might feel hot and your hands might want to squeeze.",
    },
    {
        "id": "what-is-surprised",
        "question": "What does surprised mean?",
        "phrasings": ["what is surprise", "wat is suprised", "what is getting a shock",
                      "what does it mean when something is unexpected"],
        "answer": "Surprised is the feeling when something happens that you did not expect. "
                  "Surprises can be happy ones or worrying ones! 😮",
    },
    {
        "id": "why-do-we-cry",
        "question": "Why do we cry?",
        "phrasings": ["y do we cry", "why do tears come", "why do i cry so much", "why do people cry when they are sad",
                      "where do tears come from", "what makes people cry"],
        "answer": "Crying is one way our body lets big feelings out. "
                  "Everyone cries sometimes, even grown-ups, and it can help you feel a little better.",
    },
    {
        "id": "happy-tears",
        "question": "Why do people cry when they are happy?",
        "phrasings": ["can you cry when you are happy", "why do happy tears come", "my amma cried at the wedding why",
                      "why tears when happy",
                      "tears of joy", "is it normal to cry at good news"],
        "answer": "Sometimes a happy feeling is so big that it comes out as tears. Those are called happy tears! 😊",
    },
    {
        "id": "why-get-angry",
        "question": "Why do we get angry?",
        "phrasings": ["y do i get angry", "why do i get cross so fast", "why do people get mad", "what makes us angry",
                      "where does anger come from", "what causes anger"],
        "answer": "We often get angry when something feels unfair, when we are tired, or when things don't go our way. "
                  "Anger tells us that something is bothering us.",
    },
    {
        "id": "when-angry",
        "question": "What can I do when I feel angry?",
        "phrasings": ["how can i feel less angry", "wat to do wen im angry", "i am so angry what should i do",
                      "how to calm my anger",
                      "how to deal with anger", "what to do with angry feelings"],
        "answer": "Try taking three big, slow breaths, or squeeze a pillow. "
                  "When you feel calmer, tell a grown-up what made you angry. 💪",
    },
    {
        "id": "when-sad",
        "question": "What can I do when I feel sad?",
        "phrasings": ["how to feel better when sad", "wat to do wen im sad", "i feel sad what do i do",
                      "how can i cheer myself up",
                      "what helps sadness go away", "how to feel good again when im sad"],
        "answer": "You could get a hug, draw a picture, or talk to someone you love. "
                  "It's okay to feel sad, and the feeling will get smaller with time. 💙",
    },
    {
        "id": "feeling-scared",
        "question": "What should I do when I feel scared?",
        "phrasings": ["i am scared what do i do", "what to do when im afraid", "wat to do wen i feel scard",
                      "how to be brave when scared"],
        "answer": "Being scared is your body's way of saying be careful. "
                  "Hold a grown-up's hand, take slow breaths, and tell them what scares you.",
    },
    {
        "id": "feeling-worried",
        "question": "What does worried mean?",
        "phrasings": ["what is worry", "why do i worry so much", "i keep thinking about bad things",
                      "what to do when im worried"],
        "answer": "Worry is when your mind keeps thinking about something that might go wrong. "
                  "Telling a grown-up about your worry can make it feel much smaller.",
    },
    {
        "id": "scared-of-dark",
        "question": "Why am I scared of the dark?",
        "phrasings": ["i dont like the dark", "why is dark scary", "im scared at night", "how to be brave in the dark"],
        "answer": "Lots of children feel scared in the dark because we can't see well. "
                  "A small night light or a cuddly toy can help, and a grown-up can check the room with you. 🌙",
    },
    {
        "id": "left-out",
        "question": "What can I do if I feel left out?",
        "phrasings": ["nobody plays with me", "no one wants to play with me what do i do", "i feel alone at interval",
                      "my friends didnt let me play",
                      "everyone plays without me and i feel lonely", "i am never picked and i feel left out"],
        "answer": "Feeling left out really hurts. "
                  "You could ask to join, find another friend to play with, or tell your teacher or a grown-up.",
    },
    {
        "id": "missing-someone",
        "question": "What can I do when I miss someone?",
        "phrasings": ["i miss my thaththa", "i miss my grandma so much", "why do i miss people",
                      "how to feel better when i miss someone"],
        "answer": "Missing someone shows how much you love them. "
                  "You could draw them a picture, look at photos, or call them with a grown-up's help. 💛",
    },
    {
        "id": "feeling-jealous",
        "question": "What does jealous mean?",
        "phrasings": ["why do i feel jealous", "i feel bad when my malli gets new toys", "what is jealousy",
                      "i want what my friend has"],
        "answer": "Jealous is the feeling when you want something someone else has. "
                  "It's a normal feeling, and talking about it with a grown-up can help.",
    },
    {
        "id": "feeling-shy",
        "question": "Why do I feel shy?",
        "phrasings": ["what is shy", "i feel shy to talk", "why am i shy in class", "how to be less shy"],
        "answer": "Shy is when you feel a bit nervous around new people or places. "
                  "It's okay to take your time, and a small smile or hello is a great start.",
    },
    {
        "id": "cheer-up-friend",
        "question": "How can I cheer up a sad friend?",
        "phrasings": ["my friend is sad what do i do", "how to make my friend happy", "how can i help a sad friend",
                      "my frend is crying",
                      "how to comfort a friend", "what to do when a friend is upset"],
        "answer": "You can sit with them, ask if they are okay, or share something that makes them smile. "
                  "Just being there is very kind. 😊",
    },
    {
        "id": "say-sorry",
        "question": "How do I say sorry?",
        "phrasings": ["how to say sorry to my friend", "how to apologise", "i did something wrong how to say sorry",
                      "how to make up after a fight"],
        "answer": "Look at the person and say sorry for what happened. Then ask how you can make it better.",
    },
    {
        "id": "okay-to-be-sad",
        "question": "Is it okay to feel sad?",
        "phrasings": ["is it bad to be sad", "can i be sad", "is sad a bad feeling", "is it wrong to cry",
                      "is being sad normal", "is it fine to have sad days"],
        "answer": "Yes, it is okay to feel sad. All feelings are okay, and sad feelings show us what we care about. 💙",
    },
    {
        "id": "okay-to-be-angry",
        "question": "Is it okay to feel angry?",
        "phrasings": ["is it bad to be angry", "am i bad when i get angry", "can i be angry", "is angry a bad feeling"],
        "answer": "Yes, feeling angry is okay. "
                  "What matters is what we do with it, like using words instead of hurting anyone.",
    },
    {
        "id": "grown-ups-feelings",
        "question": "Do grown-ups have feelings too?",
        "phrasings": ["do adults get sad", "does amma get angry", "do teachers have feelings", "do big people cry",
                      "do mums and dads get sad", "do elders have feelings"],
        "answer": "Yes! Grown-ups feel happy, sad, angry and surprised too. "
                  "They keep learning about feelings all their lives, just like you.",
    },
    {
        "id": "mixed-feelings",
        "question": "Can I feel two feelings at once?",
        "phrasings": ["can i be happy and sad at the same time", "why do i feel mixed up", "two feelings together",
                      "i feel happy and scared both"],
        "answer": "Yes, you can! Like feeling excited and nervous on your first day. Having mixed feelings is normal.",
    },
    {
        "id": "calm-down",
        "question": "How can I calm down?",
        "phrasings": ["how to calm my body", "how do i relax", "wat can i do to be calm",
                      "my heart is going fast how to calm"],
        "answer": "Try smelling a pretend flower and blowing out a pretend candle, slowly, five times. "
                  "Counting to ten or hugging a soft toy can help too.",
    },
    {
        "id": "tell-feelings",
        "question": "How do I tell someone how I feel?",
        "phrasings": ["how to say my feelings", "how can i tell amma im sad", "how to talk about feelings",
                      "i dont know how to tell my feelings"],
        "answer": "Start with I feel and then say why, like I feel sad because my toy broke. "
                  "A grown-up you trust will want to listen.",
    },
    {
        "id": "who-to-talk-to",
        "question": "Who can I talk to about my feelings?",
        "phrasings": ["who should i tell", "who can help me when im sad", "who do i talk to",
                      "is there someone i can tell",
                      "who helps kids with their feelings", "which grown up can i talk to when i feel bad"],
        "answer": "You can talk to a parent, a family member, a teacher, or any grown-up you trust. "
                  "They are there to help you. 💛",
    },
    {
        "id": "why-feelings",
        "question": "Why do we have feelings?",
        "phrasings": ["what are feelings for", "why do people have emotions", "what are emotions", "why do i feel things",
                      "why do emotions exist", "what good are feelings"],
        "answer": "Feelings are messages from inside us. "
                  "They help us know what we like, what we need, and when something is wrong.",
    },
    {
        "id": "feelings-pass",
        "question": "Do feelings go away?",
        "phrasings": ["will i always feel sad", "how long do feelings last", "does anger go away", "when will i feel better",
                      "will i feel like this always", "does sadness go away"],
        "answer": "Feelings come and go, like clouds in the sky. "
                  "Even big feelings get smaller with time, especially when you talk about them. ☁️",
    },
    {
        "id": "bad-dream",
        "question": "What can I do after a bad dream?",
        "phrasings": ["i had a scary dream", "i had a nightmare", "bad dreams make me scared",
                      "what to do when i wake up scared"],
        "answer": "Bad dreams can feel very real, but they are only pictures in your sleeping mind. "
                  "Tell a grown-up, get a cuddle, and think of something happy. 🌙",
    },
    {
        "id": "friend-angry-at-me",
        "question": "What should I do if my friend is angry with me?",
        "phrasings": ["my friend is cross with me", "my frend is not talking to me", "my best friend is mad at me",
                      "what to do when a friend is angry",
                      "my friend is ignoring me", "my friend is upset with me"],
        "answer": "Give them a little time to calm down, then ask what happened and listen. "
                  "Saying sorry, if you did something, can help fix it.",
    },
    {
        "id": "losing-a-game",
        "question": "Why do I feel bad when I lose a game?",
        "phrasings": ["i lost the game and im sad", "why is losing so hard", "i dont like losing", "what to do when i lose"],
        "answer": "Losing can feel disappointing because you really wanted to win. "
                  "Every game helps you learn, and you can try again next time. 🎮",
    },
    {
        "id": "nervous-new-things",
        "question": "Why do I feel nervous about new things?",
        "phrasings": ["im nervous about my new school", "first day nervous", "why do i get butterflies in my tummy",
                      "new class makes me scared"],
        "answer": "New things can feel scary because we don't know what will happen yet. "
                  "That wobbly feeling is normal, and it usually gets smaller after the first day.",
    },
    {
        "id": "feeling-proud",
        "question": "What does proud mean?",
        "phrasings": ["what is proud", "why do i feel proud", "wat is feeling proud",
                      "what is the good feeling when i do well"],
        "answer": "Proud is the happy feeling you get when you work hard or do something well. "
                  "You can feel proud of yourself and of others too! 🌟",
    },
    {
        "id": "feeling-bored",
        "question": "What can I do when I feel bored?",
        "phrasings": ["im bored", "nothing to do", "wat to do when bored", "why do i feel bored",
                      "i feel bored and there is nothing to do", "im so bored today"],
        "answer": "Bored means your mind wants something new to do. "
                  "You could draw, read, build something, or ask a grown-up for an idea.",
    },
    {
        "id": "feeling-lonely",
        "question": "What does lonely mean?",
        "phrasings": ["i feel lonely", "why do i feel alone", "what is lonely", "i have no one to be with"],
        "answer": "Lonely is when you wish you had someone with you. "
                  "Telling a grown-up can help, and they can help you find ways to be with others. 💛",
    },
    {
        "id": "embarrassed",
        "question": "What does embarrassed mean?",
        "phrasings": ["why do i feel embarrassed", "everyone laughed at me and i felt bad", "why does my face go red",
                      "what is feeling embarrassed"],
        "answer": "Embarrassed is when you feel shy or silly because others saw something happen. "
                  "It happens to everyone, and it passes quickly.",
    },
    {
        "id": "reading-faces",
        "question": "How can I tell how someone feels?",
        "phrasings": ["how do i know how my friend feels", "how to know if someone is sad", "what do faces show",
                      "how can i see feelings",
                      "how do i know what others feel", "how to understand how people feel"],
        "answer": "Look at their face, their body, and listen to their voice. "
                  "If you are not sure, you can kindly ask how they are feeling.",
    },
    {
        "id": "who-is-emo",
        "question": "Who are you, Emo?",
        "phrasings": ["who are you", "are you a real robot", "are you real", "who is emo",
                      "what are you emo", "are you a robot or a human"],
        "answer": "I'm Emo, a friendly helper robot who loves talking about feelings! "
                  "I'm not a real person, so please share big things with a grown-up too. 🤖",
    },
    {
        "id": "someone-mean",
        "question": "What can I do if someone is mean to me?",
        "phrasings": ["a boy was mean to me", "someone teased me", "what to do when kids make fun of me",
                      "someone said bad words to me",
                      "kids at school are mean to me", "a classmate is mean to me"],
        "answer": "That doesn't feel nice at all. Walk away if you can, and always tell a grown-up you trust so they can help.",
    },
    {
        "id": "belly-breathing",
        "question": "How do I do belly breathing?",
        "phrasings": ["how to breathe to feel calm", "what is deep breathing", "how to take big breaths",
                      "breathing exercise"],
        "answer": "Put your hand on your tummy and breathe in slowly so it grows, then breathe out slowly like a balloon "
                  "going down. Try it three times! 🎈",
    },
    {
        "id": "disappointed",
        "question": "What does disappointed mean?",
        "phrasings": ["why do i feel disappointed", "what is disappointed", "when things dont happen how i wanted",
                      "my trip got cancelled and i feel bad"],
        "answer": "Disappointed is the sad feeling when something doesn't happen the way you hoped. "
                  "It's okay to feel it, and you can talk about what you wished for.",
    },
]

FAQ_BY_ID: Dict[str, FaqItem] = {item["id"]: item for item in FAQ}

# Simple questions shown as suggestion chips
SUGGESTED_IDS = [
    "what-is-happy",
    "what-is-sad",
    "what-is-angry",
    "what-is-surprised",
    "why-do-we-cry",
    "calm-down",
    "cheer-up-friend",
    "say-sorry",
]
