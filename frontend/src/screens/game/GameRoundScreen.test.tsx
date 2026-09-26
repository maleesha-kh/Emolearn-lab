import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameRoundScreen } from "./GameRoundScreen";
import { makeRound } from "../../test/fixtures";

const round = makeRound("sad", ["angry", "sad", "happy"]);

function renderRound() {
  const onSelect = vi.fn();
  render(
    <GameRoundScreen round={round} roundIndex={1} totalRounds={4} score={1} onSelect={onSelect}
      onHome={vi.fn()} soundOn={false} onSound={vi.fn()} />
  );
  // The three character cards are the toggle buttons
  const cards = screen.getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"));
  const submit = screen.getByRole("button", { name: /Tell the AI/ });
  return { onSelect, cards, submit };
}

describe("GameRoundScreen", () => {
  it("shows the round and what to find", () => {
    renderRound();
    expect(screen.getByText("Round 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("SAD")).toBeInTheDocument();
  });

  it("shows one card per option, with that option's image", () => {
    const { cards } = renderRound();
    expect(cards).toHaveLength(3);
    cards.forEach((card, i) => {
      expect(card.querySelector("img")).toHaveAttribute("src", round.images[i]);
    });
  });

  it("keeps submit disabled until a card is selected", async () => {
    const user = userEvent.setup();
    const { cards, submit, onSelect } = renderRound();
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(cards[2]);
    expect(submit).toBeEnabled();
  });

  it("marks only the selected card as pressed", async () => {
    const user = userEvent.setup();
    const { cards } = renderRound();
    await user.click(cards[0]);
    await user.click(cards[1]);
    expect(cards.map((c) => c.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"]);
  });

  it("passes the index of the selected card", async () => {
    const user = userEvent.setup();
    const { cards, submit, onSelect } = renderRound();
    await user.click(cards[0]);
    await user.click(cards[2]);
    await user.click(submit);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("can be played with the keyboard", async () => {
    const user = userEvent.setup();
    const { cards, onSelect } = renderRound();
    cards[1].focus();
    await user.keyboard("{Enter}");
    expect(cards[1]).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
