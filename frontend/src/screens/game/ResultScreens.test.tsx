import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ResultCorrectScreen } from "./ResultCorrectScreen";
import { ResultWrongScreen } from "./ResultWrongScreen";
import { makeExplanation, makePrediction, makeRound } from "../../test/fixtures";
import type { PredictionResult } from "../../lib/predictionClient";

// Target is sad; cards are angry (0), sad (1), happy (2)
const round = makeRound("sad", ["angry", "sad", "happy"]);

function renderCorrect(prediction: PredictionResult, extra: { roundIndex?: number } = {}) {
  const onNext = vi.fn();
  render(
    <ResultCorrectScreen round={round} roundIndex={extra.roundIndex ?? 0} totalRounds={4} score={1} selectedIdx={1}
      prediction={prediction} onNext={onNext} onHome={vi.fn()} soundOn={false} onSound={vi.fn()} />
  );
  return { onNext };
}

function renderWrong(prediction: PredictionResult, selectedIdx = 2) {
  const onNext = vi.fn();
  render(
    <ResultWrongScreen round={round} roundIndex={0} totalRounds={4} score={0} selectedIdx={selectedIdx}
      prediction={prediction} onNext={onNext} onHome={vi.fn()} soundOn={false} onSound={vi.fn()} />
  );
  return { onNext };
}

const text = () => document.body.textContent ?? "";

beforeEach(() => {
  vi.useFakeTimers();
});

describe("ResultCorrectScreen", () => {
  it("shows the image the child picked", () => {
    renderCorrect(makePrediction({ emotion: "sad", heatmapBase64: null }));
    expect(screen.getByAltText("sad character")).toHaveAttribute("src", round.images[1]);
  });

  it("says the AI agrees when it predicted the same emotion", () => {
    renderCorrect(makePrediction({ emotion: "sad" }));
    expect(text()).toMatch(/The AI agrees with you/);
  });

  it("praises the child and names both emotions when the AI disagrees", () => {
    renderCorrect(makePrediction({ emotion: "angry" }));
    expect(text()).not.toMatch(/The AI agrees/);
    expect(text()).toMatch(/You were right — it's SAD! The AI thought it looked ANGRY/);
    expect(text()).toMatch(/AI says: .* ANGRY · 87%/);
  });

  it("shows the heatmap over the picked image and lets the child hide it", () => {
    renderCorrect(makePrediction({ emotion: "sad" }));
    expect(screen.getByAltText("AI vision heatmap")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide AI Vision" }));
    expect(screen.queryByAltText("AI vision heatmap")).not.toBeInTheDocument();
    expect(screen.getByAltText("sad character")).toHaveAttribute("src", round.images[1]);
  });

  it("works without a heatmap or explanation", () => {
    renderCorrect(makePrediction({ emotion: "sad", heatmapBase64: null, explanation: null }));
    expect(screen.queryByAltText("AI vision heatmap")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /AI Vision/ })).not.toBeInTheDocument();
    expect(screen.getByText("I think this character looks SAD.")).toBeInTheDocument();
    expect(screen.queryByText(/How did the AI decide/)).not.toBeInTheDocument();
  });

  it("shows the model's own reason and evidence when there is one", () => {
    renderCorrect(makePrediction({ emotion: "sad", explanation: makeExplanation({ reason: "The eyes look down." }) }));
    expect(screen.getByText("The eyes look down.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /How did the AI decide/ }));
    expect(screen.getByText("Smile detected")).toBeInTheDocument();
  });

  it("enables Continue only after 2.5s", async () => {
    const { onNext } = renderCorrect(makePrediction({ emotion: "sad" }));
    const button = screen.getByRole("button", { name: "Reading..." });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onNext).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(2499));
    expect(button).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent("Next Round →");
    fireEvent.click(button);
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("offers the results on the last round", async () => {
    renderCorrect(makePrediction({ emotion: "sad" }), { roundIndex: 3 });
    await act(() => vi.advanceTimersByTimeAsync(2500));
    expect(screen.getByRole("button", { name: /See My Results/ })).toBeEnabled();
  });
});

describe("ResultWrongScreen", () => {
  it("shows the image the child picked and points out the right one", () => {
    renderWrong(makePrediction({ emotion: "happy", heatmapBase64: null }));
    expect(screen.getByAltText("happy character")).toHaveAttribute("src", round.images[2]);
    expect(screen.getByAltText("sad character")).toHaveAttribute("src", round.images[1]);
    expect(text()).toMatch(/The SAD .* character was this one!/);
  });

  it("explains the pick when the AI agrees with the child", () => {
    renderWrong(makePrediction({ emotion: "happy" }));
    expect(text()).toMatch(/This character looks HAPPY, not SAD\./);
  });

  it("says the AI was fooled too when it predicted the target", () => {
    renderWrong(makePrediction({ emotion: "sad" }));
    expect(text()).toMatch(/The AI was fooled too — but this character is really HAPPY/);
  });

  it("says the AI is still learning when it picked a third emotion", () => {
    renderWrong(makePrediction({ emotion: "surprised" }));
    expect(text()).toMatch(/This character is really HAPPY — the AI is still learning/);
  });

  it("works without a heatmap or explanation", () => {
    renderWrong(makePrediction({ emotion: "angry", heatmapBase64: null, explanation: null }));
    expect(screen.queryByAltText("AI vision heatmap")).not.toBeInTheDocument();
    expect(screen.getByText("I think this character looks ANGRY.")).toBeInTheDocument();
  });

  it("enables Continue only after 2.5s", async () => {
    const { onNext } = renderWrong(makePrediction({ emotion: "happy" }));
    const button = screen.getByRole("button", { name: "Reading..." });
    await act(() => vi.advanceTimersByTimeAsync(2499));
    expect(button).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    fireEvent.click(button);
    expect(onNext).toHaveBeenCalledOnce();
  });
});
