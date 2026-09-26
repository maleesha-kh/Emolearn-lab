import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import type { Mood } from "../types";
import { EMOTION_DICTIONARY } from "../data/emotionDictionary";

export type ExplorePart = "face" | "body" | "facts" | "action";

const button = (name: string) => screen.getByRole("button", { name: new RegExp(escape(name)) });
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Does every completion part on an EmotionPage, optionally leaving one out. */
export async function explore(user: UserEvent, emotion: Mood, skip?: ExplorePart) {
  const entry = EMOTION_DICTIONARY[emotion];
  if (skip !== "face") {
    await user.click(screen.getByRole("tab", { name: /Face/ }));
    for (const clue of entry.faceClues) await user.click(button(clue));
  }
  if (skip !== "body") {
    await user.click(screen.getByRole("tab", { name: /Body/ }));
    for (const clue of entry.bodyClues) await user.click(button(clue));
  }
  if (skip !== "facts") {
    for (const card of screen.getAllByRole("button", { name: "Did you know? Tap to flip" })) await user.click(card);
  }
  if (skip !== "action") {
    await user.click(button(entry.actions[0].text));
  }
}
