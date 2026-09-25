import type { EmotionInfo, Mood } from "../types";
import { EI } from "./emotions";
import { characterImages } from "../lib/imageBank";

export interface EmotionAction {
  text: string;
  emoji: string;
  image?: string;
}

export interface EmotionDictionaryEntry {
  emotion: Mood;
  info: EmotionInfo;
  meaning: string;
  faceClues: string[];
  bodyClues: string[];
  didYouKnow: string[];
  whenMightIFeel: string[];
  actions: EmotionAction[];
  characterImages: string[];
}

export const DICTIONARY_ORDER: Mood[] = ["happy", "sad", "angry", "surprised"];

function responseImage(emotion: Mood, step: number): string {
  return `/images/responses/${emotion}/${emotion}_screen${step}.png`;
}

export const EMOTION_DICTIONARY: Record<Mood, EmotionDictionaryEntry> = {
  happy: {
    emotion: "happy",
    info: EI.happy,
    meaning: "Happy is a warm, good feeling you get when something nice happens.",
    faceClues: ["Big smile", "Cheeks go up", "Eyes crinkle at the corners"],
    bodyClues: ["Bouncy moves", "Open arms", "Head held up"],
    didYouKnow: [
      "A real smile uses the muscles around your eyes too. That's why happy eyes crinkle!",
      "Smiles are catchy. When you smile, people near you often smile back.",
    ],
    whenMightIFeel: ["Playing with a friend", "Getting a hug", "Finishing something hard"],
    actions: [
      { text: "Laugh out loud and do a happy bounce", emoji: "😂", image: responseImage("happy", 1) },
      { text: "Open your arms wide and share your smile", emoji: "🤗", image: responseImage("happy", 2) },
      { text: "Give yourself a big hug", emoji: "💛", image: responseImage("happy", 3) },
    ],
    characterImages: characterImages("happy"),
  },
  sad: {
    emotion: "sad",
    info: EI.sad,
    meaning: "Sad is a heavy feeling you get when you lose something or things don't go your way.",
    faceClues: ["Inner eyebrows go up", "Eyes look down", "Mouth corners go down"],
    bodyClues: ["Shoulders droop", "Head goes down", "Slow moves"],
    didYouKnow: [
      "Crying is one way your body lets sad feelings out.",
      "Looking sad tells people around you that you might need a hug or some help.",
    ],
    whenMightIFeel: ["A friend moves away", "Losing a favourite toy", "Not being invited to play"],
    actions: [
      { text: "Take a deep breath in and out", emoji: "🌬️", image: responseImage("sad", 1) },
      { text: "Think of something that makes you smile", emoji: "💭", image: responseImage("sad", 2) },
      { text: "Tell someone you trust how you feel", emoji: "💬", image: responseImage("sad", 3) },
    ],
    characterImages: characterImages("sad"),
  },
  angry: {
    emotion: "angry",
    info: EI.angry,
    meaning: "Angry is a hot, strong feeling you get when something feels unfair.",
    faceClues: ["Eyebrows pull down and together", "Eyes get narrow", "Lips press tight"],
    bodyClues: ["Tight fists", "Stiff body", "Stomping feet"],
    didYouKnow: [
      "When you're angry, your heart beats faster and your face can feel hot.",
      "Slow, deep breaths help your heart calm down again.",
    ],
    whenMightIFeel: ["Someone breaks your toy", "You have to stop playing", "Someone isn't fair"],
    actions: [
      { text: "Shake your hands really fast, then let go", emoji: "🙌", image: responseImage("angry", 1) },
      { text: "Count slowly to 5", emoji: "🔢", image: responseImage("angry", 2) },
      { text: "Take one big breath in and out", emoji: "🌬️", image: responseImage("angry", 3) },
    ],
    characterImages: characterImages("angry"),
  },
  surprised: {
    emotion: "surprised",
    info: EI.surprised,
    meaning: "Surprised is a quick \"whoa!\" feeling when something happens that you didn't expect.",
    faceClues: ["Eyebrows shoot up", "Eyes open wide", "Mouth drops open"],
    bodyClues: ["Body jumps or leans back", "Hands fly up", "Body goes still for a moment"],
    didYouKnow: [
      "Surprise is the shortest feeling. It lasts just a moment, then turns into another feeling, like happy or scared.",
      "Wide eyes help you see more of what just happened.",
    ],
    whenMightIFeel: ["A surprise party", "A loud bang", "Finding a present"],
    actions: [
      { text: "Take a breath", emoji: "🌬️" },
      { text: "Say what you saw", emoji: "👀" },
      { text: "Ask a grown-up what happened", emoji: "🙋" },
    ],
    characterImages: characterImages("surprised"),
  },
};
