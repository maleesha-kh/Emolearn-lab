import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { EmoRobot } from "../components/common/EmoRobot";
import { ChildSelector } from "../components/parent/ChildSelector";
import { DiaryView } from "../components/parent/DiaryView";
import { AboutView } from "../components/parent/AboutView";
import { Avatar } from "../components/common/Avatar";
import { RecoveryCodeView } from "../components/common/RecoveryCodeView";
import { AVATARS } from "../data/avatars";
import { BADGES } from "../data/badges";
import { EI } from "../data/emotions";
import {
  changePin,
  deletePlayer,
  getDashboard,
  getPlayers,
  regenerateRecoveryCode,
  downloadReportCsv,
  updatePlayer,
} from "../lib/api";
import { clearPinLock } from "../lib/pinLock";
import type { DashboardData, Mood, Player } from "../types";

const EMOTION_ORDER: Mood[] = ["happy", "sad", "angry", "surprised"];
const SESSIONS_PAGE_SIZE = 10;
const CANT_CONNECT = "Emo can't connect right now 🔌";

function isPinRejected(status: number | null) {
  return status === 401 || status === 403;
}

function digitsOnly(v: string) {
  return v.replace(/\D/g, "").slice(0, 4);
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()} ${d.getFullYear()}`;
}

function ChangePinForm({ onChanged }: { onChanged: (newPin: string) => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = currentPin.length === 4 && newPin.length === 4 && confirmPin.length === 4 && !saving;

  const handleSubmit = async () => {
    if (newPin !== confirmPin) {
      setMessage({ text: "New PINs didn't match. Try again.", ok: false });
      return;
    }
    setSaving(true);
    const res = await changePin(currentPin, newPin);
    setSaving(false);
    if (res.kind === "ok") {
      clearPinLock();
      setMessage({ text: "PIN changed! ✅", ok: true });
      onChanged(newPin);
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
    } else if (res.status === 403) {
      setMessage({ text: "Current PIN is wrong", ok: false });
    } else {
      setMessage({ text: CANT_CONNECT, ok: false });
    }
  };

  return (
    <div className="rounded-2xl p-6 bg-white" style={{ maxWidth: "420px", border: "1.5px solid #E0E0E0", boxShadow: "0 4px 15px rgba(0,0,0,.05)" }}>
      <h2 className="fn font-bold mb-4" style={{ fontSize: "20px", color: "#212121" }}>Change Parent PIN</h2>

      {[
        { id: "change-current-pin", label: "Current PIN", value: currentPin, set: setCurrentPin },
        { id: "change-new-pin", label: "New PIN", value: newPin, set: setNewPin },
        { id: "change-confirm-pin", label: "Confirm New PIN", value: confirmPin, set: setConfirmPin },
      ].map(f => (
        <div key={f.label} className="mb-4">
          <label htmlFor={f.id} className="fn font-bold block mb-1" style={{ fontSize: "13px", color: "#546E7A" }}>{f.label}</label>
          <input id={f.id} type="password" inputMode="numeric" maxLength={4} value={f.value}
            onChange={e => f.set(digitsOnly(e.target.value))}
            className="fn font-bold rounded-xl outline-none w-full"
            style={{ height: "48px", padding: "0 16px", border: "2px solid #CFD8DC", fontSize: "18px", letterSpacing: "4px" }} />
        </div>
      ))}

      {message && (
        <p className="fn font-bold mb-4" style={{ color: message.ok ? "#4CAF50" : "#EF5350", fontSize: "14px" }}>{message.text}</p>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit}
        className="fn font-bold rounded-full w-full" style={{ height: "52px", background: canSubmit ? "#00BCD4" : "#ccc", color: "white", border: "none", cursor: canSubmit ? "pointer" : "not-allowed" }}>
        {saving ? "Saving..." : "Change PIN"}
      </button>
    </div>
  );
}

function RegenerateRecoveryCodeForm({ onCodeReady }: { onCodeReady: (code: string) => void }) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const res = await regenerateRecoveryCode(pin);
    setSaving(false);
    if (res.kind === "ok") {
      setPin("");
      setMessage(null);
      onCodeReady(res.data.recovery_code);
    } else if (res.status === 403) {
      setMessage({ text: "Current PIN is wrong", ok: false });
    } else {
      setMessage({ text: CANT_CONNECT, ok: false });
    }
  };

  return (
    <div className="rounded-2xl p-6 bg-white mt-4" style={{ maxWidth: "420px", border: "1.5px solid #E0E0E0", boxShadow: "0 4px 15px rgba(0,0,0,.05)" }}>
      <h2 className="fn font-bold mb-4" style={{ fontSize: "20px", color: "#212121" }}>New recovery code</h2>
      <div className="mb-4">
        <label htmlFor="regenerate-current-pin" className="fn font-bold block mb-1" style={{ fontSize: "13px", color: "#546E7A" }}>Current PIN</label>
        <input id="regenerate-current-pin" type="password" inputMode="numeric" maxLength={4} value={pin}
          onChange={e => setPin(digitsOnly(e.target.value))}
          className="fn font-bold rounded-xl outline-none w-full"
          style={{ height: "48px", padding: "0 16px", border: "2px solid #CFD8DC", fontSize: "18px", letterSpacing: "4px" }} />
      </div>

      {message && (
        <p className="fn font-bold mb-4" style={{ color: message.ok ? "#4CAF50" : "#EF5350", fontSize: "14px" }}>{message.text}</p>
      )}

      <button onClick={handleSubmit} disabled={pin.length !== 4 || saving}
        className="fn font-bold rounded-full w-full" style={{ height: "52px", background: pin.length === 4 ? "#00BCD4" : "#ccc", color: "white", border: "none", cursor: pin.length === 4 ? "pointer" : "not-allowed" }}>
        {saving ? "Generating..." : "Generate new code"}
      </button>
    </div>
  );
}

function ChildRow({
  player, isCurrent, onReload, onCurrentUpdated, onCurrentDeleted, pin, onPinRejected,
}: {
  player: Player; isCurrent: boolean; onReload: () => void;
  onCurrentUpdated: (p: Player) => void; onCurrentDeleted: (id: string) => void;
  pin: string; onPinRejected: () => void;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "avatar" | "delete-confirm">("view");
  const [nicknameInput, setNicknameInput] = useState(player.nickname);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyUpdate = (payload: { nickname?: string; avatar_id?: string }) => {
    setBusy(true);
    setError(null);
    updatePlayer(player.id, payload, pin).then(res => {
      setBusy(false);
      if (res.kind === "ok") {
        setMode("view");
        if (isCurrent) onCurrentUpdated(res.data);
        onReload();
      } else if (isPinRejected(res.status)) {
        onPinRejected();
      } else if (res.status === 409) {
        setError("That name and picture are already used");
      } else {
        setError(CANT_CONNECT);
      }
    });
  };

  const handleDelete = () => {
    setBusy(true);
    setError(null);
    deletePlayer(player.id, pin).then(res => {
      setBusy(false);
      if (res.kind === "ok") {
        if (isCurrent) onCurrentDeleted(player.id);
        onReload();
      } else if (isPinRejected(res.status)) {
        onPinRejected();
      } else {
        setError(CANT_CONNECT);
        setMode("view");
      }
    });
  };

  return (
    <div className="rounded-xl p-4 mb-3 bg-white" style={{ border: "1.5px solid #E0E0E0" }}>
      <div className="flex items-center gap-3">
        <Avatar avatarId={player.avatar_id} size={48} />
        {mode === "rename" ? (
          <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} maxLength={20}
            className="fn font-bold rounded-lg outline-none"
            style={{ border: "2px solid #00BCD4", padding: "6px 10px", fontSize: "15px", flex: 1 }} />
        ) : (
          <span className="fn font-bold" style={{ fontSize: "16px", color: "#37474F", flex: 1 }}>{player.nickname}</span>
        )}

        {mode === "view" && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setMode("rename"); setNicknameInput(player.nickname); setError(null); }}
              className="fn font-bold rounded-full px-3 py-1" style={{ fontSize: "13px", color: "#00838F", background: "#E0F7FA", border: "none", cursor: "pointer" }}>
              Rename
            </button>
            <button onClick={() => { setMode("avatar"); setError(null); }}
              className="fn font-bold rounded-full px-3 py-1" style={{ fontSize: "13px", color: "#E65100", background: "#FFF3E0", border: "none", cursor: "pointer" }}>
              Change picture
            </button>
            <button onClick={() => { setMode("delete-confirm"); setError(null); }}
              className="fn font-bold rounded-full px-3 py-1" style={{ fontSize: "13px", color: "#B71C1C", background: "#FFEBEE", border: "none", cursor: "pointer" }}>
              Delete
            </button>
          </div>
        )}
        {mode === "rename" && (
          <div className="flex gap-2">
            <button onClick={() => nicknameInput.trim() && applyUpdate({ nickname: nicknameInput.trim() })} disabled={busy}
              className="fn font-bold rounded-full px-3 py-1" style={{ fontSize: "13px", color: "white", background: "#00BCD4", border: "none", cursor: "pointer" }}>
              Save
            </button>
            <button onClick={() => { setMode("view"); setError(null); }} disabled={busy}
              className="fn font-bold rounded-full px-3 py-1" style={{ fontSize: "13px", color: "#546E7A", background: "#ECEFF1", border: "none", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {mode === "avatar" && (
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          {AVATARS.map(a => (
            <button key={a.id} onClick={() => applyUpdate({ avatar_id: a.id })} disabled={busy}
              aria-label={`Avatar: ${a.name}`} aria-pressed={a.id === player.avatar_id}
              style={{ padding: "3px", borderRadius: "999px", border: a.id === player.avatar_id ? "3px solid #FF9800" : "3px solid transparent", background: "none", cursor: "pointer" }}>
              <Avatar avatarId={a.id} size={40} />
            </button>
          ))}
          <button onClick={() => { setMode("view"); setError(null); }} disabled={busy}
            className="fn font-bold" style={{ color: "#78909C", fontSize: "13px", background: "none", border: "none", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      )}

      {mode === "delete-confirm" && (
        <div className="mt-3 p-3 rounded-lg" style={{ background: "#FFEBEE" }}>
          <p className="fn font-bold mb-3" style={{ fontSize: "14px", color: "#B71C1C" }}>
            Delete {player.nickname} and all their progress? This can't be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={busy}
              className="fn font-bold rounded-full px-4 py-2" style={{ fontSize: "13px", color: "white", background: "#EF5350", border: "none", cursor: "pointer" }}>
              Delete
            </button>
            <button onClick={() => { setMode("view"); setError(null); }} disabled={busy}
              className="fn font-bold rounded-full px-4 py-2" style={{ fontSize: "13px", color: "#546E7A", background: "white", border: "2px solid #B0BEC5", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="fn font-bold mt-2" style={{ color: "#EF5350", fontSize: "13px" }}>{error}</p>}
    </div>
  );
}

export type ParentView = "overview" | "children" | "diary" | "settings" | "about";

export function ParentScreen({
  currentPlayerId, parentPin, onPinChanged, onPinRejected, onBack, onPlayerUpdated, onPlayerDeleted, initialView = "overview", onViewChange,
}: {
  currentPlayerId: string; parentPin: string; onPinChanged: (pin: string) => void; onPinRejected: () => void;
  onBack: () => void; onPlayerUpdated: (player: Player) => void; onPlayerDeleted: (playerId: string) => void;
  initialView?: ParentView; onViewChange?: (view: ParentView) => void;
}) {
  const [view, setView] = useState<ParentView>(initialView);

  useEffect(() => {
    onViewChange?.(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const tabRowRef = useRef<HTMLDivElement>(null);

  // Matches Tailwind's max-md breakpoint, where the sidebar is a scrollable tab row
  useEffect(() => {
    if (!window.matchMedia("(width < 48rem)").matches) return;
    tabRowRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [view]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [playersStatus, setPlayersStatus] = useState<"loading" | "error" | "loaded">("loading");
  const [playersReloadTick, setPlayersReloadTick] = useState(0);
  const reloadPlayers = () => setPlayersReloadTick(t => t + 1);

  const [selectedPlayerId, setSelectedPlayerId] = useState(currentPlayerId);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<"idle" | "loading" | "error" | "loaded">("idle");
  const [dashboardReloadTick, setDashboardReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPlayersStatus("loading");
    getPlayers().then(res => {
      if (cancelled) return;
      if (res.kind === "ok") {
        setPlayers(res.data);
        setPlayersStatus("loaded");
        setSelectedPlayerId(prev => {
          if (res.data.some(p => p.id === prev)) return prev;
          if (res.data.some(p => p.id === currentPlayerId)) return currentPlayerId;
          return res.data[0]?.id ?? "";
        });
      } else {
        setPlayersStatus("error");
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersReloadTick]);

  useEffect(() => {
    setShowAllSessions(false);
    if (!selectedPlayerId) { setDashboardStatus("idle"); return; }
    let cancelled = false;
    setDashboardStatus("loading");
    getDashboard(selectedPlayerId, parentPin).then(res => {
      if (cancelled) return;
      if (res.kind === "ok") { setDashboardData(res.data); setDashboardStatus("loaded"); }
      else if (isPinRejected(res.status)) onPinRejected();
      else setDashboardStatus("error");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, parentPin, dashboardReloadTick]);

  if (recoveryCode) {
    return <RecoveryCodeView code={recoveryCode} onContinue={() => setRecoveryCode(null)} />;
  }

  const heading = {
    overview: "Session Overview 📊", children: "Children 👧", diary: "Diary 📔", settings: "Settings ⚙️", about: "About ℹ️",
  }[view];

  return (
    <div className="min-h-screen w-full flex max-md:flex-col" style={{ background: "#FAFAFA" }}>
      {/* Sidebar, a scrollable tab row on narrow screens */}
      <div ref={tabRowRef} className="flex-shrink-0 flex md:flex-col md:w-[240px] md:min-h-screen md:py-8 md:px-6 max-md:sticky max-md:top-0 max-md:z-20 max-md:overflow-x-auto max-md:gap-2 max-md:px-3 max-md:py-2"
        style={{ background: "#006064" }}>
        <div className="ff text-white mb-8 max-md:hidden" style={{ fontSize: "22px" }}>EmoLearn Lab ✨</div>
        {([
          { key: "overview", label: "📊 Overview" },
          { key: "children", label: "👧 Children" },
          { key: "diary", label: "📔 Diary" },
          { key: "settings", label: "⚙️ Settings" },
          { key: "about", label: "ℹ️ About" },
        ] as const).map(item => (
          <button key={item.key} onClick={() => setView(item.key)} aria-current={view === item.key ? "page" : undefined}
            className="fn font-bold text-left py-3 px-4 rounded-xl mb-2 transition-all hover:bg-white hover:bg-opacity-20 max-md:mb-0 max-md:flex-shrink-0 max-md:whitespace-nowrap max-md:py-2 max-md:px-3"
            style={{
              color: view === item.key ? "white" : "rgba(255,255,255,.85)",
              background: view === item.key ? "rgba(255,255,255,.18)" : "none",
              fontSize: "16px", border: "none", cursor: "pointer",
            }}>
            {item.label}
          </button>
        ))}
        <div className="mt-auto max-md:hidden"><div className="afb"><EmoRobot expression="curious" width={100} /></div></div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-8 max-md:p-4">
        <div className="flex justify-between items-start mb-6 max-md:flex-wrap max-md:gap-3 max-md:mb-4">
          <h1 className="fn font-bold mb-1 text-[32px] max-md:text-[24px]" style={{ color: "#212121" }}>{heading}</h1>
          <button onClick={onBack} className="fn font-bold rounded-full px-5 py-2 text-white transition-all hover:brightness-110 cursor-pointer"
            style={{ background: "#00BCD4", fontSize: "16px", boxShadow: "0 4px 14px rgba(0,188,212,.4)" }}>
            Back to Game
          </button>
        </div>

        {view === "settings" && (
          <>
            <div className="rounded-2xl p-5 bg-white mb-6 fn" style={{ maxWidth: "420px", border: "1.5px solid #E0E0E0", fontSize: "14px", color: "#455A64" }}>
              <span className="font-bold">🔒 Privacy: </span>
              Diary entries are stored only in EmoLearn Lab's own database and are never sent to outside services.
            </div>
            <ChangePinForm onChanged={onPinChanged} />
            <RegenerateRecoveryCodeForm onCodeReady={setRecoveryCode} />
          </>
        )}

        {view === "overview" && (
          <OverviewView
            players={players} playersStatus={playersStatus} onReloadPlayers={reloadPlayers}
            selectedPlayerId={selectedPlayerId} onSelectPlayer={setSelectedPlayerId}
            dashboardData={dashboardData} dashboardStatus={dashboardStatus}
            onReloadDashboard={() => setDashboardReloadTick(t => t + 1)}
            showAllSessions={showAllSessions} onShowAllSessions={() => setShowAllSessions(true)}
            pin={parentPin} onPinRejected={onPinRejected}
          />
        )}

        {view === "diary" && (
          <DiaryView
            players={players} playersStatus={playersStatus} onReloadPlayers={reloadPlayers}
            selectedPlayerId={selectedPlayerId} onSelectPlayer={setSelectedPlayerId}
            pin={parentPin} onPinRejected={onPinRejected}
          />
        )}

        {view === "children" && (
          <ChildrenView
            players={players} status={playersStatus} onReload={reloadPlayers}
            currentPlayerId={currentPlayerId} onCurrentUpdated={onPlayerUpdated} onCurrentDeleted={onPlayerDeleted}
            pin={parentPin} onPinRejected={onPinRejected}
          />
        )}

        {view === "about" && <AboutView />}
      </div>
    </div>
  );
}

function OverviewView({
  players, playersStatus, onReloadPlayers,
  selectedPlayerId, onSelectPlayer,
  dashboardData, dashboardStatus, onReloadDashboard,
  showAllSessions, onShowAllSessions, pin, onPinRejected,
}: {
  players: Player[]; playersStatus: "loading" | "error" | "loaded"; onReloadPlayers: () => void;
  selectedPlayerId: string; onSelectPlayer: (id: string) => void;
  dashboardData: DashboardData | null; dashboardStatus: "idle" | "loading" | "error" | "loaded"; onReloadDashboard: () => void;
  showAllSessions: boolean; onShowAllSessions: () => void;
  pin: string; onPinRejected: () => void;
}) {
  if (playersStatus === "loading") {
    return <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>Loading...</p>;
  }
  if (playersStatus === "error") {
    return (
      <div>
        <p className="fn font-bold mb-3" style={{ color: "#EF5350", fontSize: "16px" }}>{CANT_CONNECT}</p>
        <button onClick={onReloadPlayers} className="fn font-bold rounded-full px-5 py-2 text-white"
          style={{ background: "#00BCD4", border: "none", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
  }
  if (players.length === 0) {
    return <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>No children yet.</p>;
  }

  return (
    <>
      <ChildSelector players={players} selectedPlayerId={selectedPlayerId} onSelect={onSelectPlayer} />

      {dashboardStatus === "loading" && (
        <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>Loading dashboard...</p>
      )}

      {dashboardStatus === "error" && (
        <div>
          <p className="fn font-bold mb-3" style={{ color: "#EF5350", fontSize: "16px" }}>{CANT_CONNECT}</p>
          <button onClick={onReloadDashboard} className="fn font-bold rounded-full px-5 py-2 text-white"
            style={{ background: "#00BCD4", border: "none", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}

      {dashboardStatus === "loaded" && dashboardData && (
        <>
          <p className="fn font-semibold mb-6" style={{ fontSize: "16px", color: "#757575" }}>
            {dashboardData.player.nickname} · {dashboardData.total_sessions} session{dashboardData.total_sessions === 1 ? "" : "s"}
          </p>

          {/* Stat cards */}
          <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))" }}>
            {(() => {
              const bestLabel = dashboardData.all_equal
                ? "All equal ⭐"
                : dashboardData.best_emotion ? `${EI[dashboardData.best_emotion].label} ${EI[dashboardData.best_emotion].emoji}` : "-";
              const worstLabel = dashboardData.all_equal
                ? "All equal ⭐"
                : dashboardData.needs_practice ? `${EI[dashboardData.needs_practice].label} ${EI[dashboardData.needs_practice].emoji}` : "-";
              const cards = [
                { label: "Total Sessions", value: String(dashboardData.total_sessions), color: "#4CAF50", bg: "#E8F5E9" },
                { label: "Average Score", value: dashboardData.average_score !== null ? `${dashboardData.average_score}/4` : "-", color: "#FFC107", bg: "#FFF9C4" },
                { label: "Best Emotion", value: bestLabel, color: "#00BCD4", bg: "#E0F7FA" },
                { label: "Needs Practice", value: worstLabel, color: "#E91E63", bg: "#FCE4EC" },
                { label: "Feelings Explored", value: `${dashboardData.dictionary_completed}/4 📖`, color: "#5C6BC0", bg: "#E8EAF6" },
              ];
              return cards.map(c => (
                <div key={c.label} className="rounded-2xl p-5 fn font-bold" style={{ background: c.bg, border: `2px solid ${c.color}` }}>
                  <div style={{ fontSize: "13px", color: "#757575", marginBottom: "6px" }}>{c.label}</div>
                  <div style={{ fontSize: "22px", color: c.color }}>{c.value}</div>
                </div>
              ));
            })()}
          </div>

          {/* Bar chart */}
          <div className="rounded-2xl p-6 bg-white mb-8" style={{ border: "1.5px solid #E0E0E0", boxShadow: "0 4px 15px rgba(0,0,0,.05)" }}>
            <h2 className="fn font-bold mb-4" style={{ fontSize: "20px", color: "#212121" }}>Emotion Accuracy</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={EMOTION_ORDER.map(m => ({
                  name: EI[m].label,
                  accuracy: dashboardData.emotion_accuracy[m].percent ?? 0,
                  color: EI[m].color,
                  notTried: dashboardData.emotion_accuracy[m].percent === null,
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="name" tick={{ fontSize: 14, fontFamily: "Nunito", fontWeight: 600 }} />
                <YAxis unit="%" tick={{ fontSize: 13 }} />
                <Tooltip formatter={(value: number, _name: string, entry: any) => (entry?.payload?.notTried ? "Not tried yet" : `${value}%`)} />
                <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                  {EMOTION_ORDER.map((m, i) => (
                    <Cell key={i} fill={EI[m].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Badges earned */}
          <div className="rounded-2xl p-6 bg-white mb-8" style={{ border: "1.5px solid #E0E0E0", boxShadow: "0 4px 15px rgba(0,0,0,.05)" }}>
            <h2 className="fn font-bold mb-4" style={{ fontSize: "20px", color: "#212121" }}>Badges Earned</h2>
            {dashboardData.badges.length === 0 ? (
              <p className="fn" style={{ color: "#757575", fontSize: "15px" }}>No badges yet</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {dashboardData.badges.map(b => {
                  const badge = BADGES.find(x => x.id === b.badge_id);
                  return (
                    <div key={b.badge_id} className="flex items-center gap-2 rounded-full px-3 py-2" style={{ background: "#F5F5F5" }}>
                      <span style={{ fontSize: "22px" }}>{badge?.emoji ?? "🏅"}</span>
                      <span className="fn font-bold" style={{ fontSize: "13px", color: "#37474F" }}>{badge?.name ?? b.badge_id}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session history table */}
          <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1.5px solid #E0E0E0", boxShadow: "0 4px 15px rgba(0,0,0,.05)" }}>
            <div className="flex justify-between items-center p-5 border-b flex-wrap gap-3" style={{ borderColor: "#F0F0F0" }}>
              <h2 className="fn font-bold" style={{ fontSize: "20px", color: "#212121" }}>Session History</h2>
              {dashboardData.total_sessions > 0 ? (
                <DownloadCsvButton playerId={selectedPlayerId} pin={pin} onPinRejected={onPinRejected} />
              ) : (
                <div className="flex items-center gap-2">
                  <button disabled className="fn font-bold rounded-full px-4 py-2 text-white"
                    style={{ background: "#ccc", fontSize: "14px", border: "none", cursor: "not-allowed" }}>
                    Download Report CSV
                  </button>
                  <span className="fn" style={{ fontSize: "12px", color: "#9E9E9E" }}>No sessions yet</span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Date", "Score", "Happy 😊", "Sad 😢", "Angry 😠", "Surprised 😲"].map(h => (
                      <th key={h} className="fn font-bold px-4 py-3 text-left" style={{ fontSize: "14px", color: "#546E7A" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(showAllSessions ? dashboardData.sessions : dashboardData.sessions.slice(0, SESSIONS_PAGE_SIZE)).map((s, i) => {
                    const byEmotion: Partial<Record<Mood, boolean>> = {};
                    s.rounds.forEach(r => { byEmotion[r.target_emotion] = r.child_correct; });
                    return (
                      <tr key={s.id} style={{ borderTop: "1px solid #F0F0F0", background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                        <td className="fn px-4 py-3" style={{ fontSize: "15px", color: "#37474F" }}>
                          {s.finished_at ? formatSessionDate(s.finished_at) : "-"}
                        </td>
                        <td className="ff px-4 py-3" style={{ fontSize: "16px", color: "#00838F" }}>
                          {s.score !== null ? `${s.score}/4` : "-"}
                        </td>
                        {EMOTION_ORDER.map(m => (
                          <td key={m} className="px-4 py-3 text-center text-xl">
                            {byEmotion[m] === undefined ? "-" : byEmotion[m] ? "✅" : "❌"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!showAllSessions && dashboardData.sessions.length > SESSIONS_PAGE_SIZE && (
              <div className="p-4 text-center">
                <button onClick={onShowAllSessions} className="fn font-bold"
                  style={{ color: "#00838F", fontSize: "14px", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Show all ({dashboardData.sessions.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ChildrenView({
  players, status, onReload, currentPlayerId, onCurrentUpdated, onCurrentDeleted, pin, onPinRejected,
}: {
  players: Player[]; status: "loading" | "error" | "loaded"; onReload: () => void;
  currentPlayerId: string; onCurrentUpdated: (p: Player) => void; onCurrentDeleted: (id: string) => void;
  pin: string; onPinRejected: () => void;
}) {
  if (status === "loading") {
    return <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>Loading...</p>;
  }
  if (status === "error") {
    return (
      <div>
        <p className="fn font-bold mb-3" style={{ color: "#EF5350", fontSize: "16px" }}>{CANT_CONNECT}</p>
        <button onClick={onReload} className="fn font-bold rounded-full px-5 py-2 text-white"
          style={{ background: "#00BCD4", border: "none", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
  }
  if (players.length === 0) {
    return <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>No children yet.</p>;
  }

  return (
    <div style={{ maxWidth: "560px" }}>
      {players.map(p => (
        <ChildRow key={p.id} player={p} isCurrent={p.id === currentPlayerId}
          onReload={onReload} onCurrentUpdated={onCurrentUpdated} onCurrentDeleted={onCurrentDeleted}
          pin={pin} onPinRejected={onPinRejected} />
      ))}
    </div>
  );
}

function DownloadCsvButton({ playerId, pin, onPinRejected }: { playerId: string; pin: string; onPinRejected: () => void }) {
  const [state, setState] = useState<"idle" | "downloading" | "error">("idle");

  const handleDownload = async () => {
    setState("downloading");
    const res = await downloadReportCsv(playerId, pin);
    if (res.kind === "ok") setState("idle");
    else if (isPinRejected(res.status)) onPinRejected();
    else setState("error");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {state === "error" && <span className="fn font-bold" style={{ fontSize: "13px", color: "#EF5350" }}>{CANT_CONNECT}</span>}
      <button onClick={handleDownload} disabled={state === "downloading"}
        className="fn font-bold rounded-full px-4 py-2 text-white"
        style={{
          background: "#FF9800", fontSize: "14px", boxShadow: "0 3px 12px rgba(255,152,0,.4)", border: "none",
          cursor: state === "downloading" ? "wait" : "pointer", opacity: state === "downloading" ? 0.8 : 1,
        }}>
        {state === "downloading" ? "Downloading..." : "Download Report CSV"}
      </button>
    </div>
  );
}
