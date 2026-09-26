import { useEffect, useState } from "react";
import { getPinStatus, recoverPin, regenerateRecoveryCode, setupPin, verifyPin } from "../lib/api";
import { safeGet, safeSet } from "../lib/storage";
import { clearPinLock, LOCKED_UNTIL_KEY, WRONG_COUNT_KEY } from "../lib/pinLock";
import { RecoveryCodeView } from "../components/common/RecoveryCodeView";

type Mode = "loading" | "setup-enter" | "setup-confirm" | "verify" | "error";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  loading: { title: "Parent Access", subtitle: "Checking..." },
  "setup-enter": { title: "Create Parent PIN", subtitle: "Choose a 4-digit PIN" },
  "setup-confirm": { title: "Create Parent PIN", subtitle: "Enter it again to confirm" },
  verify: { title: "Parent Access", subtitle: "Enter the 4-digit PIN to continue" },
  error: { title: "Parent Access", subtitle: "" },
};

function readStoredLockedUntil(): number | null {
  const stored = Number(safeGet(LOCKED_UNTIL_KEY));
  return stored && stored > Date.now() ? stored : null;
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, "").slice(0, 4);
}

export function PinScreen({ onSuccess, onBack }: { onSuccess: (pin: string) => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [hasRecoveryCode, setHasRecoveryCode] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A code just returned by setup/recover/regenerate — shown once, full-screen.
  const [recoveryCodeToShow, setRecoveryCodeToShow] = useState<string | null>(null);
  // The PIN that was just set or confirmed, handed on once the code has been shown.
  const [pinForSuccess, setPinForSuccess] = useState<string | null>(null);

  // The one-time "you have no recovery code yet" prompt after a correct PIN.
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);

  // The "Forgot PIN?" recovery form.
  const [showRecover, setShowRecover] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [recoverNewPin, setRecoverNewPin] = useState("");
  const [recoverConfirmPin, setRecoverConfirmPin] = useState("");
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);
  const [recoverBusy, setRecoverBusy] = useState(false);

  // Wrong-try lockout: the count and the lock are kept in localStorage (not just
  // state), so they survive leaving and re-entering the parent area — neither can
  // be reset by navigating away. If storage is blocked they are kept in memory
  // and only a refresh clears them.
  const [wrongCount, setWrongCount] = useState<number>(() => Number(safeGet(WRONG_COUNT_KEY)) || 0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(readStoredLockedUntil);
  const [now, setNow] = useState(() => Date.now());

  const resetLock = () => {
    clearPinLock();
    setWrongCount(0);
    setLockedUntil(null);
  };

  // Purge a lock that already expired while this screen was unmounted.
  useEffect(() => {
    if (readStoredLockedUntil() === null && safeGet(LOCKED_UNTIL_KEY) !== null) {
      resetLock();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPinStatus().then((res) => {
      if (cancelled) return;
      if (res.kind === "ok") {
        setMode(res.data.is_set ? "verify" : "setup-enter");
        setHasRecoveryCode(res.data.has_recovery_code);
      } else {
        setMode("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Countdown tick while locked.
  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil !== null && now >= lockedUntil) resetLock();
  }, [now, lockedUntil]);

  const locked = lockedUntil !== null && now < lockedUntil;
  const lockSecondsLeft = locked ? Math.ceil((lockedUntil! - now) / 1000) : 0;

  const resetDigits = () => setDigits(["", "", "", ""]);

  const handleComplete = async (entered: string) => {
    if (mode === "setup-enter") {
      setFirstPin(entered);
      setMode("setup-confirm");
      resetDigits();
      return;
    }

    if (mode === "setup-confirm") {
      if (entered !== firstPin) {
        setError(true);
        setMessage("PINs didn't match. Try again.");
        setTimeout(() => {
          setError(false);
          setMessage(null);
          setFirstPin(null);
          setMode("setup-enter");
          resetDigits();
        }, 900);
        return;
      }
      setBusy(true);
      const res = await setupPin(entered);
      setBusy(false);
      if (res.kind === "ok") {
        setPinForSuccess(entered);
        setRecoveryCodeToShow(res.data.recovery_code);
      } else {
        setError(true);
        setMessage("Couldn't save the PIN. Try again.");
        setTimeout(() => {
          setError(false);
          setMessage(null);
          setFirstPin(null);
          setMode("setup-enter");
          resetDigits();
        }, 900);
      }
      return;
    }

    if (mode === "verify") {
      setBusy(true);
      const res = await verifyPin(entered);
      setBusy(false);
      if (res.kind === "ok" && res.data.valid) {
        resetLock();
        if (!hasRecoveryCode) {
          setVerifiedPin(entered);
          setShowRecoveryPrompt(true);
        } else {
          onSuccess(entered);
        }
        return;
      }
      setError(true);
      setMessage(null);
      setTimeout(() => {
        setError(false);
        resetDigits();
      }, 700);

      const nextCount = wrongCount + 1;
      setWrongCount(nextCount);
      safeSet(WRONG_COUNT_KEY, String(nextCount));
      if (nextCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(until);
        safeSet(LOCKED_UNTIL_KEY, String(until));
      }
    }
  };

  const press = (d: string) => {
    if (busy || locked) return;
    const idx = digits.findIndex((x) => x === "");
    if (idx < 0) return;
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    if (idx === 3) handleComplete(next.join(""));
  };

  const del = () => {
    if (busy || locked) return;
    const last = [...digits].reverse().findIndex((x) => x !== "");
    if (last < 0) return;
    const idx = 3 - last;
    const next = [...digits];
    next[idx] = "";
    setDigits(next);
    setError(false);
  };

  const openRecover = () => {
    setShowRecover(true);
    setRecoveryCodeInput("");
    setRecoverNewPin("");
    setRecoverConfirmPin("");
    setRecoverMessage(null);
  };

  const closeRecover = () => {
    setShowRecover(false);
    setRecoverMessage(null);
  };

  const handleRecoverSubmit = async () => {
    if (recoverNewPin.length !== 4 || recoverConfirmPin.length !== 4 || !recoveryCodeInput.trim()) return;
    if (recoverNewPin !== recoverConfirmPin) {
      setRecoverMessage("New PINs didn't match. Try again.");
      return;
    }
    setRecoverBusy(true);
    const res = await recoverPin(recoveryCodeInput, recoverNewPin);
    setRecoverBusy(false);
    if (res.kind === "ok") {
      resetLock();
      setShowRecover(false);
      setPinForSuccess(recoverNewPin);
      setRecoveryCodeToShow(res.data.recovery_code);
      return;
    }
    if (res.status === 403) {
      setRecoverMessage("That recovery code is not right");
    } else if (res.status === 429) {
      const body = res.body as { retry_after_seconds?: number } | undefined;
      const minutes = body?.retry_after_seconds ? Math.ceil(body.retry_after_seconds / 60) : 15;
      setRecoverMessage(`Too many tries. Try again in ${minutes} minutes`);
    } else if (res.status === 404) {
      setRecoverMessage("No recovery code was set up. Run reset_pin.py on this computer to reset the PIN.");
    } else {
      setRecoverMessage("Emo can't connect right now 🔌");
    }
  };

  const handleCreateRecoveryNow = async () => {
    if (!verifiedPin) return;
    setPromptBusy(true);
    const res = await regenerateRecoveryCode(verifiedPin);
    setPromptBusy(false);
    if (res.kind === "ok") {
      setPinForSuccess(verifiedPin);
      setVerifiedPin(null);
      setShowRecoveryPrompt(false);
      setRecoveryCodeToShow(res.data.recovery_code);
    } else {
      setPromptMessage("Emo can't connect right now 🔌");
    }
  };

  const handleSkipRecoveryPrompt = () => {
    const pin = verifiedPin;
    setVerifiedPin(null);
    setShowRecoveryPrompt(false);
    if (pin) onSuccess(pin);
  };

  if (recoveryCodeToShow) {
    return (
      <RecoveryCodeView
        code={recoveryCodeToShow}
        onContinue={() => {
          setRecoveryCodeToShow(null);
          if (pinForSuccess) onSuccess(pinForSuccess);
        }}
      />
    );
  }

  if (showRecoveryPrompt) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ background: "linear-gradient(140deg,#ECEFF1 0%,#CFD8DC 100%)" }}>
        <div className="flex flex-col items-center" style={{ maxWidth: "360px", width: "90%" }}>
          <span className="text-5xl mb-4" style={{ color: "#00838F" }}>🔑</span>
          <h1 className="text-center mb-2" style={{ fontFamily: "system-ui,sans-serif", fontSize: "26px", fontWeight: 600, color: "#37474F" }}>One more thing</h1>
          <p className="text-center mb-8" style={{ fontFamily: "system-ui,sans-serif", fontSize: "16px", color: "#78909C" }}>
            Create a recovery code in case you forget your PIN
          </p>
          {promptMessage && (
            <p className="fn font-bold mb-4 text-center" style={{ color: "#EF5350", fontSize: "15px" }}>{promptMessage}</p>
          )}
          <button onClick={handleCreateRecoveryNow} disabled={promptBusy}
            className="fn font-bold rounded-full w-full mb-3"
            style={{ height: "52px", background: "#00BCD4", color: "white", border: "none", cursor: promptBusy ? "default" : "pointer" }}>
            {promptBusy ? "Creating..." : "Create now"}
          </button>
          <button onClick={handleSkipRecoveryPrompt} disabled={promptBusy}
            className="fn font-bold" style={{ color: "#78909C", fontSize: "15px", background: "none", border: "none", cursor: "pointer" }}>
            Later
          </button>
        </div>
      </div>
    );
  }

  if (showRecover) {
    const canSubmit = recoveryCodeInput.trim() !== "" && recoverNewPin.length === 4 && recoverConfirmPin.length === 4 && !recoverBusy;
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ background: "linear-gradient(140deg,#ECEFF1 0%,#CFD8DC 100%)" }}>
        <div className="flex flex-col items-center" style={{ maxWidth: "360px", width: "90%" }}>
          <button onClick={closeRecover} className="fn font-bold self-start mb-6"
            style={{ color: "#00BCD4", fontSize: "16px", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
          <span className="text-5xl mb-4" style={{ color: "#00838F" }}>🔑</span>
          <h1 className="text-center mb-2" style={{ fontFamily: "system-ui,sans-serif", fontSize: "26px", fontWeight: 600, color: "#37474F" }}>Recover with your code</h1>
          <p className="text-center mb-6" style={{ fontFamily: "system-ui,sans-serif", fontSize: "15px", color: "#78909C" }}>
            Enter your recovery code and choose a new PIN
          </p>

          <div className="w-full mb-4">
            <label htmlFor="recover-code" className="fn font-bold block mb-1" style={{ fontSize: "13px", color: "#546E7A" }}>Recovery code</label>
            <input id="recover-code" type="text" value={recoveryCodeInput} onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="fn font-bold rounded-xl outline-none w-full text-center"
              style={{ height: "52px", border: "2px solid #CFD8DC", fontSize: "18px", letterSpacing: "2px", fontFamily: "'Courier New',monospace" }} />
          </div>

          <div className="w-full mb-4">
            <label htmlFor="recover-new-pin" className="fn font-bold block mb-1" style={{ fontSize: "13px", color: "#546E7A" }}>New PIN</label>
            <input id="recover-new-pin" type="password" inputMode="numeric" maxLength={4} value={recoverNewPin}
              onChange={(e) => setRecoverNewPin(digitsOnly(e.target.value))}
              className="fn font-bold rounded-xl outline-none w-full"
              style={{ height: "48px", padding: "0 16px", border: "2px solid #CFD8DC", fontSize: "18px", letterSpacing: "4px" }} />
          </div>

          <div className="w-full mb-4">
            <label htmlFor="recover-confirm-pin" className="fn font-bold block mb-1" style={{ fontSize: "13px", color: "#546E7A" }}>Confirm new PIN</label>
            <input id="recover-confirm-pin" type="password" inputMode="numeric" maxLength={4} value={recoverConfirmPin}
              onChange={(e) => setRecoverConfirmPin(digitsOnly(e.target.value))}
              className="fn font-bold rounded-xl outline-none w-full"
              style={{ height: "48px", padding: "0 16px", border: "2px solid #CFD8DC", fontSize: "18px", letterSpacing: "4px" }} />
          </div>

          {recoverMessage && (
            <p className="fn font-bold mb-4 text-center" style={{ color: "#EF5350", fontSize: "14px" }}>{recoverMessage}</p>
          )}

          <button onClick={handleRecoverSubmit} disabled={!canSubmit}
            className="fn font-bold rounded-full w-full"
            style={{ height: "52px", background: canSubmit ? "#00BCD4" : "#ccc", color: "white", border: "none", cursor: canSubmit ? "pointer" : "not-allowed" }}>
            {recoverBusy ? "Checking..." : "Reset PIN"}
          </button>
        </div>
      </div>
    );
  }

  const { title, subtitle } = TITLES[mode];
  const showKeypad = mode === "setup-enter" || mode === "setup-confirm" || mode === "verify";
  const displayMessage = locked
    ? `Too many tries. Try again in ${lockSecondsLeft}s`
    : error
    ? message ?? "Incorrect PIN. Try again!"
    : null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ background: "linear-gradient(140deg,#ECEFF1 0%,#CFD8DC 100%)" }}>
      <div className="flex flex-col items-center" style={{ maxWidth: "360px", width: "90%" }}>
        <button onClick={onBack} className="fn font-bold self-start mb-6"
          style={{ color: "#00BCD4", fontSize: "16px", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
        <span className="text-5xl mb-4" style={{ color: "#00838F" }}>🔒</span>
        <h1 className="text-center mb-2" style={{ fontFamily: "system-ui,sans-serif", fontSize: "28px", fontWeight: "600", color: "#37474F" }}>{title}</h1>
        <p className="text-center mb-8" style={{ fontFamily: "system-ui,sans-serif", fontSize: "16px", color: "#78909C" }}>{subtitle}</p>

        {mode === "error" && (
          <p className="fn font-bold mb-4" style={{ color: "#EF5350", fontSize: "15px" }}>Emo can't connect right now 🔌</p>
        )}

        {showKeypad && (
          <>
            {/* PIN boxes */}
            <div className={`flex gap-3 mb-8 ${error ? "ashk" : ""}`}>
              {digits.map((d, i) => (
                <div key={i} className="flex items-center justify-center rounded-xl"
                  style={{ width: "60px", height: "60px", border: `2px solid ${error ? "#EF5350" : d ? "#00BCD4" : "#B0BEC5"}`,
                    background: "white", fontSize: "24px", fontWeight: "700", color: "#00838F",
                    transition: "border-color .2s", boxShadow: "0 2px 10px rgba(0,0,0,.06)" }}>
                  {d ? "●" : ""}
                </div>
              ))}
            </div>

            {displayMessage && (
              <p className="fn font-bold mb-4 text-center" style={{ color: "#EF5350", fontSize: "15px" }}>{displayMessage}</p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full mb-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) => (
                <button key={i} onClick={() => (k === "⌫" ? del() : k ? press(k) : undefined)}
                  disabled={!k || busy || locked}
                  className="rounded-xl fn font-bold transition-all hover:brightness-95 active:scale-95"
                  style={{ height: "56px", background: k ? "white" : "transparent",
                    border: k ? "1.5px solid #ECEFF1" : "none", fontSize: "20px", color: "#37474F",
                    boxShadow: k ? "0 2px 8px rgba(0,0,0,.06)" : "none",
                    cursor: k && !busy && !locked ? "pointer" : "default",
                    opacity: k && locked ? 0.4 : 1 }}>
                  {k}
                </button>
              ))}
            </div>

            {mode === "verify" && (
              <button onClick={openRecover} className="fn font-bold"
                style={{ color: "#00838F", fontSize: "14px", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Forgot PIN?
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
