import { describe, expect, it, vi } from "vitest";
import { buildGameRounds, shuffle } from "./game";
import { ROUNDS } from "../data/rounds";

const sorted = <T,>(items: T[]) => [...items].sort();

describe("shuffle", () => {
  it("keeps every item, including duplicates", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    const input = ["a", "b", "b", "c", "a"];
    expect(sorted(shuffle(input))).toEqual(sorted(input));
  });

  it("returns a new array and leaves the input untouched", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const input = [1, 2, 3, 4];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it("uses Math.random to pick swap positions", () => {
    // 0 always swaps with index 0: [1,2,3] -> [3,2,1] -> [2,3,1]
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(shuffle([1, 2, 3])).toEqual([2, 3, 1]);
  });

  it("handles empty and single-item arrays", () => {
    const random = vi.spyOn(Math, "random");
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["only"])).toEqual(["only"]);
    expect(random).not.toHaveBeenCalled();
  });
});

describe("buildGameRounds", () => {
  it("has four rounds with four different targets", () => {
    const rounds = buildGameRounds();
    expect(rounds).toHaveLength(4);
    expect(new Set(rounds.map((r) => r.emotion)).size).toBe(4);
  });

  it("gives each round three options with the target exactly once", () => {
    for (const round of buildGameRounds()) {
      expect(round.opts).toHaveLength(3);
      expect(round.opts.filter((o) => o === round.emotion)).toHaveLength(1);
    }
  });

  it("pairs each option with an image from that option's emotion folder", () => {
    for (const round of buildGameRounds()) {
      expect(round.images).toHaveLength(round.opts.length);
      round.opts.forEach((emotion, i) => {
        expect(round.images[i]).toMatch(new RegExp(`^/images/characters/${emotion}/${emotion}_`));
      });
    }
  });

  it("does not change the source round data", () => {
    const before = structuredClone(ROUNDS);
    buildGameRounds();
    buildGameRounds();
    expect(ROUNDS).toEqual(before);
    expect(ROUNDS.every((r) => !("images" in r))).toBe(true);
  });
});
