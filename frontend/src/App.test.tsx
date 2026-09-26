import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import * as api from "./lib/api";
import { getPrediction } from "./lib/predictionClient";
import type { Mood, Player, RoundOut } from "./types";
import { deferred, makePrediction, makeRound } from "./test/fixtures";

vi.mock("./lib/api", () => ({
  getPlayer: vi.fn(),
  getPlayers: vi.fn(),
  createPlayer: vi.fn(),
  startSession: vi.fn(),
  saveRound: vi.fn(),
  finishSession: vi.fn(),
  getProfile: vi.fn(),
  getDictionaryProgress: vi.fn(),
}));

vi.mock("./lib/predictionClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/predictionClient")>()),
  getPrediction: vi.fn(),
}));

// Fixed round order, card order and images
vi.mock("./lib/game", async () => {
  const { makeRound } = await import("./test/fixtures");
  return {
    buildGameRounds: () => [
      makeRound("happy", ["happy", "sad", "surprised"]),
      makeRound("sad", ["angry", "sad", "happy"]),
      makeRound("angry", ["surprised", "happy", "angry"]),
      makeRound("surprised", ["sad", "surprised", "angry"]),
    ],
  };
});

const mia: Player = { id: "p1", nickname: "Mia", avatar_id: "cat" };
const kai: Player = { id: "p2", nickname: "Kai", avatar_id: "dog" };

const m = vi.mocked(api);
const predictionMock = vi.mocked(getPrediction);

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const flush = () => advance(0);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const text = () => document.body.textContent ?? "";

const savedRound = (): api.ApiResult<RoundOut> => ({ kind: "ok", data: {} as RoundOut });

// Refreshing mid-game restores to Play for this player, which starts a fresh game
async function startGameAsMia() {
  sessionStorage.setItem(
    "emolearn_session_state",
    JSON.stringify({ playerId: mia.id, screen: "gameround", parentView: "overview", parentEntry: "profile", mood: null })
  );
  render(<App />);
  await flush();
  click(/Start the Game/);
  await advance(600);
}

/** Taps the card showing `pick`, lets the AI answer `ai`, and moves past the result screen. */
async function playRound(pick: Mood, ai: Mood) {
  predictionMock.mockResolvedValueOnce(makePrediction({ emotion: ai }));
  fireEvent.click(screen.getByAltText(`${pick} character`).closest("button")!);
  click(/Tell the AI/);
  await advance(1500);
  const chip = text().match(/⭐ (\d)\/4/)?.[1];
  await advance(2500);
  click(/Next Round|See My Results/);
  return Number(chip);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const fn of Object.values(m)) vi.mocked(fn).mockReset();
  predictionMock.mockReset();

  m.getPlayer.mockImplementation(async (id) => ({ kind: "ok", data: id === kai.id ? kai : mia }));
  m.getPlayers.mockResolvedValue({ kind: "ok", data: [mia, kai] });
  m.getProfile.mockReturnValue(new Promise(() => {}));
  m.getDictionaryProgress.mockReturnValue(new Promise(() => {}));
  m.startSession.mockImplementation(async ({ player_id }) => ({
    kind: "ok",
    data: { id: `session-${player_id}`, player_id, mood_checkin: null, started_at: "", finished_at: null, score: null, stars: null },
  }));
  m.saveRound.mockResolvedValue(savedRound());
  m.finishSession.mockResolvedValue({ kind: "ok", data: { session: {} as never, new_badges: [] } });
});

describe("App game flow", () => {
  it("gives stars for the child's choice, even when the AI disagrees", async () => {
    await startGameAsMia();
    expect(m.startSession).toHaveBeenCalledWith({ player_id: "p1", mood_checkin: null });

    // Right pick, AI says sad
    expect(await playRound("happy", "sad")).toBe(1);
    expect(text()).toMatch(/\+1 Star/);
    click(/Continue/);

    // Wrong pick, AI agrees with the target
    expect(await playRound("happy", "sad")).toBe(1);
    click(/Continue/);

    expect(m.saveRound).toHaveBeenNthCalledWith(1, "session-p1", expect.objectContaining({
      round_no: 1, target_emotion: "happy", child_correct: true, predicted_emotion: "sad", confidence: 0.87,
      chosen_image: "/images/characters/happy/happy_test.png",
    }));
    expect(m.saveRound).toHaveBeenNthCalledWith(2, "session-p1", expect.objectContaining({
      round_no: 2, target_emotion: "sad", child_correct: false, predicted_emotion: "sad",
      chosen_image: "/images/characters/happy/happy_test.png",
    }));
  });

  it("shows the child's results on the summary", async () => {
    await startGameAsMia();
    await playRound("happy", "happy");
    click(/Continue/);
    await playRound("angry", "angry");
    click(/Continue/);
    await playRound("angry", "sad");
    click(/Continue/);
    await playRound("surprised", "happy");
    click(/Continue/);
    await flush();

    expect(screen.getByText("Amazing job, Mia! 🎉")).toBeInTheDocument();
    expect(screen.getAllByText(/^[01]\/1$/).map((el) => el.textContent)).toEqual(["1/1", "0/1", "1/1", "1/1"]);
    expect(m.finishSession).toHaveBeenCalledWith("session-p1");
  });

  it("waits for pending round saves before finishing the session", async () => {
    const saves = [deferred<api.ApiResult<RoundOut>>(), deferred<api.ApiResult<RoundOut>>()];
    m.saveRound
      .mockReturnValueOnce(saves[0].promise)
      .mockResolvedValueOnce(savedRound())
      .mockResolvedValueOnce(savedRound())
      .mockReturnValueOnce(saves[1].promise);

    await startGameAsMia();
    for (const [pick, ai] of [["happy", "happy"], ["sad", "sad"], ["angry", "angry"], ["surprised", "surprised"]] as const) {
      await playRound(pick, ai);
      click(/Continue/);
    }
    await flush();
    expect(m.finishSession).not.toHaveBeenCalled();
    expect(screen.queryByText(/Amazing job/)).not.toBeInTheDocument();

    await act(async () => saves[1].resolve(savedRound()));
    expect(m.finishSession).not.toHaveBeenCalled();

    await act(async () => saves[0].resolve(savedRound()));
    expect(m.finishSession).toHaveBeenCalledOnce();
    expect(screen.getByText(/Amazing job/)).toBeInTheDocument();
  });

  it("finishes only once when Continue is tapped twice", async () => {
    await startGameAsMia();
    for (const pick of ["happy", "sad", "angry"] as const) {
      await playRound(pick, pick);
      click(/Continue/);
    }
    await playRound("surprised", "surprised");
    const continueButton = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueButton);
    fireEvent.click(continueButton);
    await flush();

    expect(m.finishSession).toHaveBeenCalledOnce();
    expect(screen.getByText(/Amazing job/)).toBeInTheDocument();
  });

  it("abandons the game when the player is switched", async () => {
    await startGameAsMia();
    await playRound("happy", "happy");
    click(/Continue/);
    expect(screen.getByText("Round 2 of 4")).toBeInTheDocument();

    click(/Me/);
    click("Switch Player");
    await flush();
    click(/Kai/);
    await flush();

    click(/Play/);
    await flush();
    expect(screen.getByRole("button", { name: /Start the Game/ })).toBeInTheDocument();
    expect(m.startSession).toHaveBeenCalledTimes(2);
    expect(m.startSession).toHaveBeenLastCalledWith({ player_id: "p2", mood_checkin: null });

    click(/Start the Game/);
    await advance(600);
    expect(screen.getByText("Round 1 of 4")).toBeInTheDocument();
    await playRound("happy", "happy");
    expect(m.saveRound).toHaveBeenLastCalledWith("session-p2", expect.objectContaining({ round_no: 1 }));
  });

  it("resumes the same game when the same player comes back to Play", async () => {
    await startGameAsMia();
    await playRound("happy", "happy");
    click(/Continue/);

    click(/Learn/);
    click(/Play/);
    await flush();
    expect(screen.getByText("Round 2 of 4")).toBeInTheDocument();
    expect(m.startSession).toHaveBeenCalledOnce();
  });
});
