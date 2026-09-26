import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { PinScreen } from "./PinScreen";
import { getPinStatus, recoverPin, regenerateRecoveryCode, setupPin, verifyPin, type ApiResult } from "../lib/api";
import type { PinVerifyResult } from "../types";
import { deferred } from "../test/fixtures";

vi.mock("../lib/api", () => ({
  getPinStatus: vi.fn(),
  setupPin: vi.fn(),
  verifyPin: vi.fn(),
  recoverPin: vi.fn(),
  regenerateRecoveryCode: vi.fn(),
}));

const statusMock = vi.mocked(getPinStatus);
const setupMock = vi.mocked(setupPin);
const verifyMock = vi.mocked(verifyPin);
const recoverMock = vi.mocked(recoverPin);
const regenerateMock = vi.mocked(regenerateRecoveryCode);

const flush = () => act(() => vi.advanceTimersByTimeAsync(0));
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const key = (k: string) => screen.getByRole("button", { name: k });

async function renderPin(status = { is_set: true, has_recovery_code: true }) {
  statusMock.mockResolvedValue({ kind: "ok", data: status });
  const onSuccess = vi.fn();
  const onBack = vi.fn();
  const view = render(<PinScreen onSuccess={onSuccess} onBack={onBack} />);
  await flush();
  return { onSuccess, onBack, ...view };
}

async function enter(pin: string) {
  for (const d of pin) fireEvent.click(key(d));
  await flush();
}

async function wrongAttempts(n: number) {
  for (let i = 0; i < n; i++) {
    await enter("0000");
    await advance(700);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  for (const m of [statusMock, setupMock, verifyMock, recoverMock, regenerateMock]) m.mockReset();
  verifyMock.mockResolvedValue({ kind: "ok", data: { valid: false } });
});

describe("PinScreen setup", () => {
  it("asks for the PIN twice and shows the recovery code", async () => {
    setupMock.mockResolvedValue({ kind: "ok", data: { recovery_code: "ABCD-EFGH-JKLM" } });
    const { onSuccess } = await renderPin({ is_set: false, has_recovery_code: false });
    expect(screen.getByText("Choose a 4-digit PIN")).toBeInTheDocument();

    await enter("1234");
    expect(screen.getByText("Enter it again to confirm")).toBeInTheDocument();
    await enter("1234");
    expect(setupMock).toHaveBeenCalledWith("1234");
    expect(screen.getByText("ABCD-EFGH-JKLM")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSuccess).toHaveBeenCalledWith("1234");
  });

  it("starts over when the two PINs don't match", async () => {
    await renderPin({ is_set: false, has_recovery_code: false });
    await enter("1234");
    await enter("4321");
    expect(screen.getByText("PINs didn't match. Try again.")).toBeInTheDocument();
    expect(setupMock).not.toHaveBeenCalled();

    await advance(900);
    expect(screen.getByText("Choose a 4-digit PIN")).toBeInTheDocument();
    expect(screen.queryByText(/didn't match/)).not.toBeInTheDocument();
  });

  it("shows an error and starts over when saving fails", async () => {
    setupMock.mockResolvedValue({ kind: "error", status: 500 });
    const { onSuccess } = await renderPin({ is_set: false, has_recovery_code: false });
    await enter("1234");
    await enter("1234");
    expect(screen.getByText("Couldn't save the PIN. Try again.")).toBeInTheDocument();
    await advance(900);
    expect(screen.getByText("Choose a 4-digit PIN")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows a connection error when the PIN status can't be loaded", async () => {
    statusMock.mockResolvedValue({ kind: "error", status: null });
    render(<PinScreen onSuccess={vi.fn()} onBack={vi.fn()} />);
    await flush();
    expect(screen.getByText(/can't connect/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });
});

describe("PinScreen verify", () => {
  it("hands on a correct PIN", async () => {
    verifyMock.mockResolvedValue({ kind: "ok", data: { valid: true } });
    const { onSuccess } = await renderPin();
    await enter("2468");
    expect(verifyMock).toHaveBeenCalledWith("2468");
    expect(onSuccess).toHaveBeenCalledWith("2468");
  });

  it("ignores key presses while the PIN is being checked", async () => {
    const pending = deferred<ApiResult<PinVerifyResult>>();
    verifyMock.mockReturnValue(pending.promise);
    const { onSuccess } = await renderPin();
    await enter("2468");

    expect(key("5")).toBeDisabled();
    expect(key("⌫")).toBeDisabled();
    fireEvent.click(key("5"));
    expect(verifyMock).toHaveBeenCalledOnce();

    await act(async () => pending.resolve({ kind: "ok", data: { valid: true } }));
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledWith("2468");
  });

  it("shows an error for a wrong PIN and clears the boxes", async () => {
    const { onSuccess } = await renderPin();
    await enter("1111");
    expect(screen.getByText("Incorrect PIN. Try again!")).toBeInTheDocument();
    await advance(700);
    expect(screen.queryByText("Incorrect PIN. Try again!")).not.toBeInTheDocument();
    expect(screen.queryAllByText("●")).toHaveLength(0);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("offers a recovery code after a correct PIN when none exists", async () => {
    verifyMock.mockResolvedValue({ kind: "ok", data: { valid: true } });
    const { onSuccess } = await renderPin({ is_set: true, has_recovery_code: false });
    await enter("2468");
    expect(screen.getByText("One more thing")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(onSuccess).toHaveBeenCalledWith("2468");
  });

  it("creates a recovery code from the prompt", async () => {
    verifyMock.mockResolvedValue({ kind: "ok", data: { valid: true } });
    regenerateMock.mockResolvedValueOnce({ kind: "error", status: null });
    regenerateMock.mockResolvedValueOnce({ kind: "ok", data: { recovery_code: "WXYZ-2345-6789" } });
    const { onSuccess } = await renderPin({ is_set: true, has_recovery_code: false });
    await enter("2468");

    fireEvent.click(screen.getByRole("button", { name: "Create now" }));
    await flush();
    expect(screen.getByText(/can't connect/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create now" }));
    await flush();
    expect(regenerateMock).toHaveBeenLastCalledWith("2468");
    expect(screen.getByText("WXYZ-2345-6789")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSuccess).toHaveBeenCalledWith("2468");
  });
});

describe("PinScreen lockout", () => {
  it("locks the keypad for 30s after 5 wrong tries", async () => {
    await renderPin();
    await wrongAttempts(4);
    expect(screen.queryByText(/Too many tries/)).not.toBeInTheDocument();

    await wrongAttempts(1);
    expect(screen.getByText(/Too many tries. Try again in (29|30)s/)).toBeInTheDocument();
    expect(key("1")).toBeDisabled();
    fireEvent.click(key("1"));
    expect(verifyMock).toHaveBeenCalledTimes(5);
  });

  it("unlocks when the 30s are up and starts counting from zero", async () => {
    await renderPin();
    await wrongAttempts(5);
    await advance(20_000);
    expect(screen.getByText(/Try again in \d+s/)).toBeInTheDocument();
    await advance(10_000);
    expect(screen.queryByText(/Too many tries/)).not.toBeInTheDocument();
    expect(key("1")).toBeEnabled();
    expect(localStorage.getItem("emolearn_pin_locked_until")).toBeNull();

    await wrongAttempts(1);
    expect(screen.queryByText(/Too many tries/)).not.toBeInTheDocument();
  });

  it("stays locked after leaving and coming back", async () => {
    const first = await renderPin();
    await wrongAttempts(5);
    first.unmount();

    await renderPin();
    expect(screen.getByText(/Too many tries/)).toBeInTheDocument();
    expect(key("1")).toBeDisabled();
  });

  it("clears a lock that expired while the screen was closed", async () => {
    const first = await renderPin();
    await wrongAttempts(5);
    first.unmount();
    vi.setSystemTime(Date.now() + 31_000);

    await renderPin();
    expect(screen.queryByText(/Too many tries/)).not.toBeInTheDocument();
    expect(localStorage.getItem("emolearn_pin_locked_until")).toBeNull();
    expect(localStorage.getItem("emolearn_pin_wrong_count")).toBeNull();
  });

  // Wrong tries must survive leaving and re-entering, not only an active lock
  it("keeps counting wrong tries after leaving and coming back", async () => {
    const first = await renderPin();
    await wrongAttempts(4);
    first.unmount();

    await renderPin();
    await wrongAttempts(1);
    expect(screen.getByText(/Too many tries/)).toBeInTheDocument();
  });
});

describe("PinScreen recovery", () => {
  async function openRecovery() {
    await renderPin();
    fireEvent.click(screen.getByRole("button", { name: "Forgot PIN?" }));
  }

  function fill(code: string, pin: string, confirm: string) {
    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: code } });
    fireEvent.change(screen.getByLabelText("New PIN"), { target: { value: pin } });
    fireEvent.change(screen.getByLabelText("Confirm new PIN"), { target: { value: confirm } });
  }

  const submit = () => screen.getByRole("button", { name: "Reset PIN" });

  it("keeps Reset disabled until everything is filled in, digits only", async () => {
    await openRecovery();
    expect(submit()).toBeDisabled();
    fill("abcd-efgh", "12a", "1234");
    expect(screen.getByLabelText("Recovery code")).toHaveValue("ABCD-EFGH");
    expect(screen.getByLabelText("New PIN")).toHaveValue("12");
    expect(submit()).toBeDisabled();
    fill("abcd-efgh", "12345", "1234");
    expect(screen.getByLabelText("New PIN")).toHaveValue("1234");
    expect(submit()).toBeEnabled();
  });

  it("rejects new PINs that don't match without calling the API", async () => {
    await openRecovery();
    fill("ABCD", "1234", "4321");
    fireEvent.click(submit());
    expect(screen.getByText("New PINs didn't match. Try again.")).toBeInTheDocument();
    expect(recoverMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ kind: "error", status: 403 }, "That recovery code is not right"],
    [{ kind: "error", status: 429, body: { retry_after_seconds: 125 } }, "Too many tries. Try again in 3 minutes"],
    [{ kind: "error", status: 429 }, "Too many tries. Try again in 15 minutes"],
    [{ kind: "error", status: 404 }, "No recovery code was set up. Run reset_pin.py on this computer to reset the PIN."],
    [{ kind: "error", status: null }, "Emo can't connect right now 🔌"],
    [{ kind: "error", status: 500 }, "Emo can't connect right now 🔌"],
  ] as const)("shows the right message for %o", async (result, message) => {
    recoverMock.mockResolvedValue(result as ApiResult<never>);
    await openRecovery();
    fill("ABCD", "1234", "1234");
    fireEvent.click(submit());
    await flush();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("shows Checking... while busy", async () => {
    recoverMock.mockReturnValue(new Promise(() => {}));
    await openRecovery();
    fill("ABCD", "1234", "1234");
    fireEvent.click(submit());
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();
  });

  it("resets the lock and shows the new recovery code on success", async () => {
    recoverMock.mockResolvedValue({ kind: "ok", data: { recovery_code: "NEW1-NEW2-NEW3" } });
    await renderPin();
    await wrongAttempts(5);
    fireEvent.click(screen.getByRole("button", { name: "Forgot PIN?" }));
    fill("ABCD", "9876", "9876");
    fireEvent.click(submit());
    await flush();

    expect(recoverMock).toHaveBeenCalledWith("ABCD", "9876");
    expect(screen.getByText("NEW1-NEW2-NEW3")).toBeInTheDocument();
    expect(localStorage.getItem("emolearn_pin_locked_until")).toBeNull();
  });
});
