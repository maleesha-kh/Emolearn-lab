import { useEffect, useState } from "react";
import { getPinStatus, setupPin, verifyPin } from "../lib/api";

type Mode = "loading" | "setup-enter" | "setup-confirm" | "verify" | "error";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const WRONG_COUNT_KEY = "emolearn_pin_wrong_count";
const LOCKED_UNTIL_KEY = "emolearn_pin_locked_until";

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  loading: { title: "Parent Access", subtitle: "Checking..." },
  "setup-enter": { title: "Create Parent PIN", subtitle: "Choose a 4-digit PIN" },
  "setup-confirm": { title: "Create Parent PIN", subtitle: "Enter it again to confirm" },
  verify: { title: "Parent Access", subtitle: "Enter the 4-digit PIN to continue" },
  error: { title: "Parent Access", subtitle: "" },
};

function readStoredLockedUntil(): number | null {
  const stored = Number(localStorage.getItem(LOCKED_UNTIL_KEY));
  return stored && stored > Date.now() ? stored : null;
}

export function PinScreen({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Wrong-try lockout: kept in localStorage (not just state), so it survives
  // leaving and re-entering the parent area — it can't be reset by navigating away.
  const [wrongCount, setWrongCount] = useState<number>(() =>
    readStoredLockedUntil() === null ? 0 : Number(localStorage.getItem(WRONG_COUNT_KEY)) || 0
  );
  const [lockedUntil, setLockedUntil] = useState<number | null>(readStoredLockedUntil);
  const [now, setNow] = useState(() => Date.now());

  const resetLock = () => {
    localStorage.removeItem(WRONG_COUNT_KEY);
    localStorage.removeItem(LOCKED_UNTIL_KEY);
    setWrongCount(0);
    setLockedUntil(null);
  };

  // Purge a lock that already expired while this screen was unmounted.
  useEffect(() => {
    if (readStoredLockedUntil() === null && localStorage.getItem(LOCKED_UNTIL_KEY) !== null) {
      resetLock();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPinStatus().then((res) => {
      if (cancelled) return;
      if (res.kind === "ok") setMode(res.data.is_set ? "verify" : "setup-enter");
      else setMode("error");
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
        onSuccess();
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
        onSuccess();
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
      localStorage.setItem(WRONG_COUNT_KEY, String(nextCount));
      if (nextCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(until);
        localStorage.setItem(LOCKED_UNTIL_KEY, String(until));
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
          </>
        )}
      </div>
    </div>
  );
}
