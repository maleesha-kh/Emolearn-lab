import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mood } from "../types";

// lastShown is module state, so each test gets a fresh copy
let bank: typeof import("./imageBank");
beforeEach(async () => {
  vi.resetModules();
  bank = await import("./imageBank");
});

const MOODS: Mood[] = ["happy", "sad", "angry", "surprised"];
// Math.random value that makes randInt1toN(18) return the given variant
const randomFor = (variant: number) => (variant - 1 + 0.5) / 18;

describe("image naming", () => {
  it("uses dataset names up to variant 8 and game names from 9 to 18", () => {
    expect(bank.imagePath("happy", 1)).toBe("/images/characters/happy/happy_v1_5.png");
    expect(bank.imagePath("happy", 8)).toBe("/images/characters/happy/happy_v8_5.png");
    expect(bank.imagePath("sad", 9)).toBe("/images/characters/sad/sad_game_01.png");
    expect(bank.imagePath("angry", 18)).toBe("/images/characters/angry/angry_game_10.png");
  });

  it("lists 18 unique paths per emotion, all in that emotion's folder", () => {
    for (const mood of MOODS) {
      const paths = bank.characterImages(mood);
      expect(paths).toHaveLength(18);
      expect(new Set(paths).size).toBe(18);
      expect(paths.every((p) => p.startsWith(`/images/characters/${mood}/${mood}_`))).toBe(true);
    }
  });
});

describe("random picks", () => {
  it("stays within 1..18 at both ends of Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(bank.pickRandomVariant("happy")).toBe(1);
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(bank.pickRandomVariant("sad")).toBe(18);
  });

  it("always returns a known image path", () => {
    for (const mood of MOODS) {
      const known = bank.characterImages(mood);
      for (let i = 0; i < 30; i++) expect(known).toContain(bank.pickRandomImage(mood));
    }
  });

  it("rolls one image per option, in option order", () => {
    const opts: Mood[] = ["surprised", "happy", "angry"];
    const images = bank.rollRoundImages(opts);
    expect(images).toHaveLength(3);
    images.forEach((src, i) => expect(bank.characterImages(opts[i])).toContain(src));
  });

  it("rolls one image per emotion for the mood check-in", () => {
    const moodBank = bank.rollMoodBank();
    for (const mood of MOODS) expect(bank.characterImages(mood)).toContain(moodBank[mood]);
  });
});

describe("repeat avoidance", () => {
  it("re-rolls when the same variant comes up twice in a row", () => {
    const random = vi.spyOn(Math, "random");
    random.mockReturnValueOnce(randomFor(4));
    expect(bank.pickRandomVariant("happy")).toBe(4);

    random.mockReturnValueOnce(randomFor(4)).mockReturnValueOnce(randomFor(7));
    expect(bank.pickRandomVariant("happy")).toBe(7);
  });

  it("tracks each emotion separately", () => {
    vi.spyOn(Math, "random").mockReturnValue(randomFor(5));
    expect(bank.pickRandomVariant("happy")).toBe(5);
    expect(bank.pickRandomVariant("sad")).toBe(5);
  });

  it("gives up after 5 retries, so a repeat is still possible", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(randomFor(3));
    expect(bank.pickRandomVariant("angry")).toBe(3);
    random.mockClear();

    expect(bank.pickRandomVariant("angry")).toBe(3);
    // first roll plus 5 retries
    expect(random).toHaveBeenCalledTimes(6);
  });
});

describe("emotionForPose", () => {
  it("maps real emotions to themselves and decorative poses to a real folder", () => {
    for (const mood of MOODS) expect(bank.emotionForPose(mood)).toBe(mood);
    expect(bank.emotionForPose("jumping")).toBe("happy");
    expect(bank.emotionForPose("calm")).toBe("sad");
  });
});
