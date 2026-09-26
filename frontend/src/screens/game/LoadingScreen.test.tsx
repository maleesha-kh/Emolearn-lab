import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LoadingScreen } from "./LoadingScreen";
import { getPrediction, PredictionError } from "../../lib/predictionClient";
import { deferred, makePrediction } from "../../test/fixtures";

vi.mock("../../lib/predictionClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/predictionClient")>()),
  getPrediction: vi.fn(),
}));

const getPredictionMock = vi.mocked(getPrediction);
const IMAGE = "/images/characters/sad/sad_v2_5.png";

function renderLoading() {
  const onDone = vi.fn();
  const onBack = vi.fn();
  const view = render(<LoadingScreen imageUrl={IMAGE} trueEmotion="sad" onDone={onDone} onBack={onBack} />);
  return { onDone, onBack, ...view };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  getPredictionMock.mockReset();
});

describe("LoadingScreen", () => {
  it("asks for a prediction of the tapped image", () => {
    getPredictionMock.mockReturnValue(new Promise(() => {}));
    renderLoading();
    expect(getPredictionMock).toHaveBeenCalledWith({ imageUrl: IMAGE, trueEmotion: "sad" });
    expect(screen.getByText(/Emo is thinking/)).toBeInTheDocument();
  });

  it("waits the 1.5s minimum even when the prediction is instant", async () => {
    const result = makePrediction();
    getPredictionMock.mockResolvedValue(result);
    const { onDone } = renderLoading();

    await advance(1499);
    expect(onDone).not.toHaveBeenCalled();
    await advance(1);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith(result);
  });

  it("waits for a prediction that is slower than the minimum", async () => {
    const pending = deferred<ReturnType<typeof makePrediction>>();
    getPredictionMock.mockReturnValue(pending.promise);
    const { onDone } = renderLoading();

    await advance(5000);
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => pending.resolve(makePrediction()));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("shows the error's message when the prediction fails", async () => {
    getPredictionMock.mockRejectedValue(new PredictionError("too_large"));
    const { onDone } = renderLoading();
    await advance(0);
    expect(screen.getByText(/too big for Emo to see/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("shows the server message for an unexpected error", async () => {
    getPredictionMock.mockRejectedValue(new SyntaxError("Unexpected token <"));
    renderLoading();
    await advance(0);
    expect(screen.getByText(/Emo got a bit confused/)).toBeInTheDocument();
  });

  it("Try Again sends the same image again", async () => {
    const result = makePrediction();
    getPredictionMock.mockRejectedValueOnce(new PredictionError("network")).mockResolvedValueOnce(result);
    const { onDone } = renderLoading();
    await advance(0);

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(screen.getByText(/Emo is thinking/)).toBeInTheDocument();
    expect(getPredictionMock).toHaveBeenCalledTimes(2);
    expect(getPredictionMock).toHaveBeenLastCalledWith({ imageUrl: IMAGE, trueEmotion: "sad" });

    await advance(1500);
    expect(onDone).toHaveBeenCalledWith(result);
  });

  it("Pick Again goes back to the cards", async () => {
    getPredictionMock.mockRejectedValue(new PredictionError("no_character"));
    const { onBack } = renderLoading();
    await advance(0);
    fireEvent.click(screen.getByRole("button", { name: "Pick Again" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(getPredictionMock).toHaveBeenCalledOnce();
  });

  it("ignores a result that arrives after the screen is gone", async () => {
    const pending = deferred<ReturnType<typeof makePrediction>>();
    getPredictionMock.mockReturnValue(pending.promise);
    const { onDone, unmount } = renderLoading();
    unmount();
    await act(async () => pending.resolve(makePrediction()));
    await advance(2000);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("ignores a late failure after the screen is gone", async () => {
    const pending = deferred<ReturnType<typeof makePrediction>>();
    getPredictionMock.mockReturnValue(pending.promise);
    const errorSpy = vi.spyOn(console, "error");
    const { unmount } = renderLoading();
    unmount();
    await act(async () => pending.reject(new PredictionError("server")));
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
