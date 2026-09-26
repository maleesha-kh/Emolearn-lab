import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmotionPage } from "./EmotionPage";
import { EMOTION_DICTIONARY } from "../../data/emotionDictionary";
import { explore, type ExplorePart } from "../../test/dictionary";

const happy = EMOTION_DICTIONARY.happy;

function renderPage() {
  const onExplored = vi.fn();
  const user = userEvent.setup();
  render(<EmotionPage emotion="happy" soundOn={false} onBack={vi.fn()} onPractice={vi.fn()} onExplored={onExplored} />);
  return { onExplored, user };
}

const progress = () => screen.getByText(/things done/).textContent;
const clue = (text: string) => screen.getByRole("button", { name: new RegExp(text) });

describe("EmotionPage", () => {
  it("starts with nothing done", () => {
    renderPage();
    expect(progress()).toBe("⭐ 0 of 4 things done");
  });

  it("reports the feeling as explored once all four parts are done", async () => {
    const { user, onExplored } = renderPage();
    await explore(user, "happy");
    expect(progress()).toBe("🌟 All 4 things done!");
    expect(onExplored).toHaveBeenCalledOnce();
  });

  it.each<ExplorePart>(["face", "body", "facts", "action"])("is not explored while the %s part is missing", async (part) => {
    const { user, onExplored } = renderPage();
    await explore(user, "happy", part);
    expect(progress()).toBe("⭐ 3 of 4 things done");
    expect(onExplored).not.toHaveBeenCalled();
  });

  it("needs every face clue, and tapping one clue again doesn't count twice", async () => {
    const { user } = renderPage();
    const first = clue(happy.faceClues[0]);
    await user.click(first);
    await user.click(first);
    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(progress()).toBe("⭐ 0 of 4 things done");

    for (const text of happy.faceClues.slice(1)) await user.click(clue(text));
    expect(progress()).toBe("⭐ 1 of 4 things done");
  });

  it("needs both facts, and flipping one card back and forth doesn't count as two", async () => {
    const { user } = renderPage();
    const [first, second] = screen.getAllByRole("button", { name: "Did you know? Tap to flip" });
    await user.click(first);
    await user.click(first);
    await user.click(first);
    expect(progress()).toBe("⭐ 0 of 4 things done");
    await user.click(second);
    expect(progress()).toBe("⭐ 1 of 4 things done");
  });

  it("counts one tried action, and trying it again changes nothing", async () => {
    const { user } = renderPage();
    const action = clue(happy.actions[0].text);
    await user.click(action);
    await user.click(action);
    expect(action).toHaveAttribute("aria-pressed", "true");
    expect(progress()).toBe("⭐ 1 of 4 things done");
  });

  it("reports completion only once, even with more taps afterwards", async () => {
    const { user, onExplored } = renderPage();
    await explore(user, "happy");
    await user.click(clue(happy.actions[1].text));
    await user.click(screen.getAllByRole("button", { name: happy.didYouKnow[0] })[0]);
    await user.click(screen.getByRole("tab", { name: /Face/ }));
    expect(onExplored).toHaveBeenCalledOnce();
  });
});
