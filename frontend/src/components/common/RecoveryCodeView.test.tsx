import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RecoveryCodeView } from "./RecoveryCodeView";

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

function renderView() {
  const onContinue = vi.fn();
  render(<RecoveryCodeView code="ABCD-EFGH-JKLM" onContinue={onContinue} />);
  return { onContinue };
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe("RecoveryCodeView", () => {
  it("shows the code", () => {
    renderView();
    expect(screen.getByText("ABCD-EFGH-JKLM")).toBeInTheDocument();
  });

  it("only allows Continue once 'I've saved it' is ticked", () => {
    const { onContinue } = renderView();
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "I've saved it" }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("checkbox", { name: "I've saved it" }));
    expect(button).toBeDisabled();
  });

  it("copies the code and then resets the button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(writeText).toHaveBeenCalledWith("ABCD-EFGH-JKLM");
    expect(screen.getByRole("button", { name: "Copied! ✅" })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1800));
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("asks the parent to write it down when copying is refused", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) });
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText("Couldn't copy. Please write it down.")).toBeInTheDocument();
    expect(screen.getByText("ABCD-EFGH-JKLM")).toBeInTheDocument();
  });

  it("falls back the same way when there is no clipboard API", async () => {
    setClipboard(undefined);
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText("Couldn't copy. Please write it down.")).toBeInTheDocument();
  });
});
