import type { BuddySuggestion } from "../types";

// The simplest FAQ questions (the backend's SUGGESTED_IDS), in the exact
// wording of the FAQ so tapping one always gets its answer
export const STARTER_QUESTIONS: BuddySuggestion[] = [
  { id: "what-is-happy", question: "What does happy mean?" },
  { id: "what-is-sad", question: "What does sad mean?" },
  { id: "what-is-angry", question: "What does angry mean?" },
  { id: "what-is-surprised", question: "What does surprised mean?" },
  { id: "why-do-we-cry", question: "Why do we cry?" },
  { id: "calm-down", question: "How can I calm down?" },
  { id: "cheer-up-friend", question: "How can I cheer up a sad friend?" },
  { id: "say-sorry", question: "How do I say sorry?" },
];
