import type { GameRound } from "../types";
import { ROUNDS } from "../data/rounds";
import { rollRoundImages } from "./imageBank";

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Call once per game: round order, card order and images are all fixed here. */
export function buildGameRounds(): GameRound[] {
  return shuffle(ROUNDS).map((round) => {
    const opts = shuffle(round.opts);
    return { ...round, opts, images: rollRoundImages(opts) };
  });
}
