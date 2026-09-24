import { useState } from "react";

export function RecoveryCodeView({ code, onContinue }: { code: string; onContinue: () => void }) {
  const [checked, setChecked] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    setTimeout(() => setCopyStatus("idle"), 1800);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ background: "linear-gradient(140deg,#ECEFF1 0%,#CFD8DC 100%)" }}>
      <div className="flex flex-col items-center" style={{ maxWidth: "380px", width: "90%" }}>
        <span className="text-5xl mb-4" style={{ color: "#00838F" }}>🗝️</span>
        <h1 className="text-center mb-2" style={{ fontFamily: "system-ui,sans-serif", fontSize: "26px", fontWeight: "600", color: "#37474F" }}>
          Save your recovery code
        </h1>
        <p className="text-center mb-6" style={{ fontFamily: "system-ui,sans-serif", fontSize: "15px", color: "#78909C", lineHeight: 1.5 }}>
          Write this down or take a photo. You'll need it if you forget your PIN. It is shown only once.
        </p>

        <div className="w-full rounded-xl mb-4 text-center" style={{ background: "white", border: "2px solid #B0BEC5", padding: "20px 16px" }}>
          <span style={{ fontFamily: "'Courier New',monospace", fontSize: "24px", fontWeight: 700, color: "#37474F", letterSpacing: "2px" }}>{code}</span>
        </div>

        <button onClick={handleCopy}
          className="fn font-bold rounded-full mb-2 w-full"
          style={{ height: "48px", background: "white", border: "2px solid #00BCD4", color: "#00838F", cursor: "pointer" }}>
          {copyStatus === "copied" ? "Copied! ✅" : "Copy"}
        </button>
        {copyStatus === "failed" && (
          <p className="fn font-bold mb-4 text-center" style={{ color: "#EF5350", fontSize: "14px" }}>
            Couldn't copy. Please write it down.
          </p>
        )}
        {copyStatus !== "failed" && <div className="mb-4" />}

        <label className="flex items-center gap-2 mb-6" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ width: "20px", height: "20px" }} />
          <span className="fn" style={{ fontFamily: "system-ui,sans-serif", fontSize: "15px", color: "#37474F" }}>I've saved it</span>
        </label>

        <button onClick={onContinue} disabled={!checked}
          className="fn font-bold rounded-full w-full"
          style={{ height: "52px", background: checked ? "#00BCD4" : "#ccc", color: "white", border: "none", cursor: checked ? "pointer" : "not-allowed" }}>
          Continue
        </button>
      </div>
    </div>
  );
}
