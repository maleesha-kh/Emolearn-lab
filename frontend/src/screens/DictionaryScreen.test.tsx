import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DictionaryScreen } from "./DictionaryScreen";
import { completeDictionaryEmotion, getDictionaryProgress, type ApiResult } from "../lib/api";
import type { DictionaryCompleteResult } from "../types";
import { deferred } from "../test/fixtures";
import { explore } from "../test/dictionary";

vi.mock("../lib/api", () => ({
  getDictionaryProgress: vi.fn(),
  completeDictionaryEmotion: vi.fn(),
}));

const progressMock = vi.mocked(getDictionaryProgress);
const completeMock = vi.mocked(completeDictionaryEmotion);

const completed = (newly: boolean, badges: string[] = []): ApiResult<DictionaryCompleteResult> => ({
  kind: "ok",
  data: { completed: [{ emotion: "happy", completed_at: "2026-09-01T10:00:00Z" }], new_badges: badges, newly_completed: newly },
});

function renderScreen() {
  const onNewBadges = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <DictionaryScreen playerId="p1" onHome={vi.fn()} soundOn={false} onSound={vi.fn()} onPractice={vi.fn()}
      onNewBadges={onNewBadges} onAskEmo={vi.fn()} />
  );
  return { onNewBadges, user, ...view };
}

async function openHappy(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Learn about Happy/ }));
}

beforeEach(() => {
  progressMock.mockReset().mockResolvedValue({ kind: "ok", data: { completed: [] } });
  completeMock.mockReset();
});

describe("DictionaryScreen", () => {
  it("marks feelings the child already explored", async () => {
    progressMock.mockResolvedValue({ kind: "ok", data: { completed: [{ emotion: "sad", completed_at: "2026-09-01T10:00:00Z" }] } });
    renderScreen();
    expect(await screen.findByRole("button", { name: "Learn about Sad (explored)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn about Happy" })).toBeInTheDocument();
    expect(progressMock).toHaveBeenCalledWith("p1");
  });

  it("saves completion once and celebrates a first-time sticker", async () => {
    completeMock.mockResolvedValue(completed(true));
    const { user, onNewBadges } = renderScreen();
    await openHappy(user);
    await explore(user, "happy");

    expect(await screen.findByText("New sticker! 🎉")).toBeInTheDocument();
    expect(completeMock).toHaveBeenCalledOnce();
    expect(completeMock).toHaveBeenCalledWith("p1", "happy");

    await user.click(screen.getByRole("button", { name: /Yay/ }));
    expect(screen.queryByText("New sticker! 🎉")).not.toBeInTheDocument();
    expect(onNewBadges).toHaveBeenCalledWith([]);
  });

  it("holds new badges until the sticker celebration closes", async () => {
    completeMock.mockResolvedValue(completed(true, ["feelings-explorer"]));
    const { user, onNewBadges } = renderScreen();
    await openHappy(user);
    await explore(user, "happy");
    await screen.findByText("New sticker! 🎉");
    expect(onNewBadges).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Yay/ }));
    expect(onNewBadges).toHaveBeenCalledOnce();
    expect(onNewBadges).toHaveBeenCalledWith(["feelings-explorer"]);
  });

  it("shows 'explored again' and passes badges straight on for a repeat visit", async () => {
    completeMock.mockResolvedValue(completed(false, ["feelings-explorer"]));
    const { user, onNewBadges } = renderScreen();
    await openHappy(user);
    await explore(user, "happy");

    expect(await screen.findByRole("status")).toHaveTextContent("You explored this feeling again!");
    expect(screen.queryByText("New sticker! 🎉")).not.toBeInTheDocument();
    expect(onNewBadges).toHaveBeenCalledWith(["feelings-explorer"]);
  });

  it("does not save again for extra taps after completion", async () => {
    completeMock.mockResolvedValue(completed(false));
    const { user } = renderScreen();
    await openHappy(user);
    await explore(user, "happy");
    await screen.findByRole("status");
    await user.click(screen.getByRole("button", { name: /Open your arms wide/ }));
    await user.click(screen.getByRole("tab", { name: /Face/ }));
    await user.click(screen.getByRole("button", { name: /Big smile/ }));
    expect(completeMock).toHaveBeenCalledOnce();
  });

  it("still hands on badges when the child left before the response arrived", async () => {
    const pending = deferred<ApiResult<DictionaryCompleteResult>>();
    completeMock.mockReturnValue(pending.promise);
    const { user, onNewBadges, unmount } = renderScreen();
    await openHappy(user);
    await explore(user, "happy");
    unmount();

    pending.resolve(completed(true, ["feelings-explorer"]));
    await waitFor(() => expect(onNewBadges).toHaveBeenCalledWith(["feelings-explorer"]));
  });

  it("shows nothing and hands on no badges when saving fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    completeMock.mockResolvedValue({ kind: "error", status: 500 });
    const { user, onNewBadges } = renderScreen();
    await openHappy(user);
    await explore(user, "happy");
    await waitFor(() => expect(completeMock).toHaveBeenCalledOnce());
    expect(screen.queryByText("New sticker! 🎉")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(onNewBadges).not.toHaveBeenCalled();
  });
});
