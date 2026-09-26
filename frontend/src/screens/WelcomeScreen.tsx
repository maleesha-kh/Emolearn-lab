import { useEffect, useState } from "react";
import { BgDeco } from "../components/common/UI";
import { EmoRobot } from "../components/common/EmoRobot";
import { Avatar } from "../components/common/Avatar";
import { AVATARS } from "../data/avatars";
import { APP_VERSION } from "../lib/version";
import { getPlayers, createPlayer } from "../lib/api";
import type { Player } from "../types";

type PlayersState = { status: "loading" } | { status: "error" } | { status: "loaded"; players: Player[] };

const HEADING_STYLE = { fontSize: "clamp(22px,2.5vw,32px)", color: "#004D40", lineHeight: 1.3 };

export function WelcomeScreen({
  checking,
  savedPlayer,
  onLogin,
  onForget,
  onManagePlayers,
}: {
  checking: boolean;
  savedPlayer: Player | null;
  onLogin: (player: Player) => void;
  onForget: () => void;
  onManagePlayers?: () => void;
}) {
  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [playersState, setPlayersState] = useState<PlayersState>({ status: "loading" });
  const [reloadTick, setReloadTick] = useState(0);

  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const showPicker = !checking && !savedPlayer;

  useEffect(() => {
    if (!showPicker) return;
    let cancelled = false;
    setPlayersState({ status: "loading" });
    getPlayers().then((res) => {
      if (cancelled) return;
      setPlayersState(res.kind === "ok" ? { status: "loaded", players: res.data } : { status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [showPicker, reloadTick]);

  async function handleCreate() {
    if (!nickname.trim()) return;
    setSaving(true);
    setError("");
    const res = await createPlayer({ nickname: nickname.trim(), avatar_id: avatarId });
    setSaving(false);
    if (res.kind === "ok") {
      onLogin(res.data);
    } else if (res.status === 409) {
      setError("That name and picture are taken. Pick another picture!");
    } else {
      setError("Emo can't connect right now 🔌");
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "linear-gradient(140deg,#E0F7FA 0%,#B2DFDB 100%)" }}>
      <BgDeco items={["⭐", "💛", "✨", "❤️", "🌟", "💫", "⭐", "💕", "🌟", "✨", "🎊", "⭐", "💕", "✨", "🌟", "💛", "❤️", "🎉"]} opacity={0.38} />
      <div className="relative z-10 flex min-h-screen" style={{ flexWrap: "wrap", paddingBottom: "40px" }}>
        {/* LEFT column */}
        <div className="flex flex-col justify-center py-16" style={{ padding: "4rem 3rem 4rem 5rem", width: "55%", minWidth: "340px", flexShrink: 0 }}>
          <div className="ff mb-2" style={{ fontSize: "clamp(36px,4.5vw,58px)", color: "#00838F", lineHeight: 1.1 }}>EmoLearn Lab ✨</div>
          <div className="fn mb-8 font-semibold" style={{ fontSize: "clamp(16px,2vw,22px)", color: "#546E7A" }}>Learn Emotions Through Play!</div>

          {checking && (
            <div className="ff" style={HEADING_STYLE}>Just a moment... 🔎</div>
          )}

          {!checking && savedPlayer && (
            <div className="flex flex-col items-start" style={{ maxWidth: "420px" }}>
              <Avatar avatarId={savedPlayer.avatar_id} size={90} />
              <div className="ff mt-4 mb-6" style={HEADING_STYLE}>Hi {savedPlayer.nickname}! 👋</div>
              <button
                onClick={() => onLogin(savedPlayer)}
                className="ff font-bold rounded-full mb-3 transition-all hover:brightness-110 active:scale-95"
                style={{
                  width: "100%", height: "68px", background: "#FF9800", color: "white",
                  boxShadow: "0 8px 28px rgba(255,152,0,.45), 0 4px 0 #E65100", fontSize: "clamp(18px,2vw,22px)", cursor: "pointer",
                }}
              >
                Let's Play! 🎮
              </button>
              <button
                onClick={onForget}
                className="fn font-bold"
                style={{ background: "none", border: "none", color: "#00838F", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}
              >
                Not you?
              </button>
              {/* Kept small and grey so children aren't drawn to it */}
              {onManagePlayers && (
                <button
                  onClick={onManagePlayers}
                  className="fn mt-3"
                  style={{ background: "none", border: "none", padding: "4px 0", minHeight: "24px", color: "#455A64", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Manage players
                </button>
              )}
            </div>
          )}

          {showPicker && mode === "pick" && (
            <>
              <div className="ff mb-6" style={HEADING_STYLE}>
                Hi there! I'm Emo, your AI friend!<br />
                <span style={{ fontSize: "clamp(18px,2vw,26px)" }}>
                  {playersState.status === "loading"
                    ? "Finding your friends..."
                    : playersState.status === "loaded" && playersState.players.length === 0
                    ? "No players yet — let's create your first one! 😊"
                    : playersState.status === "loaded"
                    ? "Who's playing today? 😊"
                    : ""}
                </span>
              </div>

              {playersState.status === "error" && (
                <div className="mb-6" style={{ maxWidth: "420px" }}>
                  <p className="fn font-bold mb-3" style={{ color: "#EF5350", fontSize: "16px" }}>Emo can't connect right now 🔌</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReloadTick((t) => t + 1)}
                      className="fn font-bold rounded-full px-5"
                      style={{ height: "52px", background: "#00BCD4", color: "white", border: "none", cursor: "pointer" }}
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => setMode("new")}
                      className="fn font-bold rounded-full px-5"
                      style={{ height: "52px", background: "white", border: "2px solid #B0BEC5", color: "#546E7A", cursor: "pointer" }}
                    >
                      New Player
                    </button>
                  </div>
                </div>
              )}

              {playersState.status === "loaded" && (
                <div className="flex flex-wrap gap-3 mb-6" style={{ maxWidth: "460px" }}>
                  {playersState.players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onLogin(p)}
                      className="flex flex-col items-center gap-2 rounded-2xl p-3 transition-all hover:scale-105 active:scale-95"
                      style={{ width: "110px", background: "white", border: "3px solid #00BCD4", boxShadow: "0 4px 16px rgba(0,188,212,.2)", cursor: "pointer" }}
                    >
                      <Avatar avatarId={p.avatar_id} size={56} />
                      <span className="fn font-bold" style={{ fontSize: "13px", color: "#004D40", textAlign: "center", wordBreak: "break-word" }}>{p.nickname}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setMode("new")}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl p-3 transition-all hover:scale-105 active:scale-95"
                    style={{ width: "110px", background: "#FFF3E0", border: "3px dashed #FF9800", cursor: "pointer" }}
                  >
                    <span className="text-3xl">➕</span>
                    <span className="fn font-bold" style={{ fontSize: "13px", color: "#E65100", textAlign: "center" }}>New Player</span>
                  </button>
                </div>
              )}

              {playersState.status === "loaded" && playersState.players.length > 0 && onManagePlayers && (
                <button
                  onClick={onManagePlayers}
                  className="fn font-bold self-start mb-2"
                  style={{ background: "none", border: "none", padding: 0, color: "#00838F", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}
                >
                  👨‍👩‍👧 Manage players
                </button>
              )}
            </>
          )}

          {showPicker && mode === "new" && (
            <>
              <div className="ff mb-6" style={HEADING_STYLE}>Let's set you up! 😊</div>

              <div className="relative mb-2" style={{ maxWidth: "420px" }}>
                <input
                  type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder="Type a nickname..." maxLength={20}
                  onKeyDown={(e) => e.key === "Enter" && nickname.trim() && handleCreate()}
                  className="fn font-bold w-full outline-none rounded-full transition-all"
                  style={{ height: "64px", paddingLeft: "24px", paddingRight: "20px", border: "3px solid #00BCD4", background: "white", color: "#004D40", fontSize: "18px", boxShadow: "0 4px 20px rgba(0,188,212,.2)", fontFamily: "'Nunito',sans-serif" }}
                />
              </div>
              <p className="fn mb-4" style={{ fontSize: "14px", color: "#78909C" }}>You can use a fun nickname!</p>

              <div className="flex flex-wrap gap-3 mb-4" style={{ maxWidth: "420px" }}>
                {AVATARS.map((a) => (
                  <button
                    key={a.id} onClick={() => setAvatarId(a.id)}
                    aria-label={`Avatar: ${a.name}`} aria-pressed={avatarId === a.id}
                    className="rounded-full transition-all"
                    style={{ padding: "4px", border: avatarId === a.id ? "3px solid #FF9800" : "3px solid transparent", cursor: "pointer" }}
                  >
                    <Avatar avatarId={a.id} size={56} />
                  </button>
                ))}
              </div>

              {error && <p className="fn font-bold mb-3" style={{ color: "#EF5350", fontSize: "14px" }}>{error}</p>}

              <div className="flex gap-3 mb-2" style={{ maxWidth: "420px" }}>
                <button
                  onClick={() => { setMode("pick"); setError(""); }}
                  className="fn font-bold rounded-full px-5"
                  style={{ height: "64px", background: "white", border: "2px solid #B0BEC5", color: "#546E7A", cursor: "pointer" }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate} disabled={!nickname.trim() || saving}
                  className="ff font-bold rounded-full transition-all hover:brightness-110 active:scale-95"
                  style={{
                    flex: 1, height: "64px", background: nickname.trim() ? "#FF9800" : "#ccc", color: "white",
                    boxShadow: nickname.trim() ? "0 8px 28px rgba(255,152,0,.45), 0 4px 0 #E65100" : "none",
                    fontSize: "clamp(18px,2vw,22px)", cursor: nickname.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  {saving ? "Saving..." : "Let's Play! 🎮"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT column */}
        <div className="flex-1 flex flex-col items-center justify-center relative py-16" style={{ minWidth: "280px" }}>
          {/* halo */}
          <div className="absolute" style={{ width: "380px", height: "380px", background: "radial-gradient(circle,rgba(0,188,212,.22) 0%,transparent 70%)", borderRadius: "50%" }} />
          {/* orbiting stars */}
          <div className="absolute asr" style={{ width: "320px", height: "320px" }}>
            {["⭐", "✨", "💫", "🌟", "💛", "✦"].map((s, i) => (
              <span key={i} className="absolute text-2xl" style={{
                top: `${50 - 48 * Math.sin(i * Math.PI / 3)}%`,
                left: `${50 + 48 * Math.cos(i * Math.PI / 3)}%`,
                transform: "translate(-50%,-50%)",
                fontSize: i % 2 === 0 ? "26px" : "18px",
              }}>{s}</span>
            ))}
          </div>
          <div className="relative af" style={{ zIndex: 2 }}>
            <EmoRobot expression="waving" width={300} />
          </div>
        </div>
      </div>

      {/* bottom emotion strip */}
      <div className="absolute bottom-0 left-0 right-0 py-3" style={{ borderTop: "1px solid rgba(0,188,212,.18)", background: "rgba(255,255,255,.25)" }}>
        <p className="fn text-center px-4 mb-1" style={{ fontSize: "12px", color: "#78909C" }}>
          🔒 No camera, no photos, nothing shared · EmoLearn Lab v{APP_VERSION}
        </p>
        <div className="flex gap-8 justify-center opacity-20 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="text-4xl">{["😊", "😢", "😠", "😲"][i % 4]}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
