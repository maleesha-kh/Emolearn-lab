import { useEffect, useState } from "react";
import { EI } from "../../data/emotions";
import { CONCERN_CATEGORY_TEXT, DIARY_CHIPS } from "../../data/diary";
import { deleteDiaryEntry, getBuddyMessages, getDiary, getDiaryTips } from "../../lib/api";
import type { BuddyMessage, ConcernLevel, DiaryEntry, DiaryTips, Player } from "../../types";
import { ChildSelector } from "./ChildSelector";

const CANT_CONNECT = "Emo can't connect right now 🔌";

type TipState = { status: "loading" } | { status: "error" } | { status: "loaded"; data: DiaryTips };

function isPinRejected(status: number | null) {
  return status === 401 || status === 403;
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function surpriseTag(entry: DiaryEntry): string | null {
  if (entry.emotion !== "surprised") return null;
  if (entry.sentiment === "positive") return "good surprise";
  if (entry.sentiment === "negative") return "worrying surprise";
  return "not sure";
}

export function DiaryView({
  players, playersStatus, onReloadPlayers, selectedPlayerId, onSelectPlayer, pin, onPinRejected,
}: {
  players: Player[]; playersStatus: "loading" | "error" | "loaded"; onReloadPlayers: () => void;
  selectedPlayerId: string; onSelectPlayer: (id: string) => void;
  pin: string; onPinRejected: () => void;
}) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "loaded">("idle");
  const [reloadTick, setReloadTick] = useState(0);
  const [tips, setTips] = useState<Record<number, TipState>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<number | null>(null);
  const [questions, setQuestions] = useState<BuddyMessage[]>([]);
  const [questionsStatus, setQuestionsStatus] = useState<"idle" | "loading" | "error" | "loaded">("idle");
  const [questionsReloadTick, setQuestionsReloadTick] = useState(0);

  useEffect(() => {
    setTips({});
    setConfirmDeleteId(null);
    setDeleteError(null);
    if (!selectedPlayerId) { setStatus("idle"); return; }
    let cancelled = false;
    setStatus("loading");
    getDiary(selectedPlayerId, pin).then(res => {
      if (cancelled) return;
      if (res.kind === "ok") { setEntries(res.data); setStatus("loaded"); }
      else if (isPinRejected(res.status)) onPinRejected();
      else setStatus("error");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, pin, reloadTick]);

  useEffect(() => {
    if (!selectedPlayerId) { setQuestionsStatus("idle"); return; }
    let cancelled = false;
    setQuestionsStatus("loading");
    getBuddyMessages(selectedPlayerId, pin).then(res => {
      if (cancelled) return;
      if (res.kind === "ok") { setQuestions(res.data); setQuestionsStatus("loaded"); }
      else if (isPinRejected(res.status)) onPinRejected();
      else setQuestionsStatus("error");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, pin, questionsReloadTick]);

  const loadTips = async (entryId: number) => {
    setTips(t => ({ ...t, [entryId]: { status: "loading" } }));
    const res = await getDiaryTips(selectedPlayerId, entryId, pin);
    if (res.kind === "ok") setTips(t => ({ ...t, [entryId]: { status: "loaded", data: res.data } }));
    else if (isPinRejected(res.status)) onPinRejected();
    else setTips(t => ({ ...t, [entryId]: { status: "error" } }));
  };

  const confirmDelete = async (entryId: number) => {
    setDeletingId(entryId);
    setDeleteError(null);
    const res = await deleteDiaryEntry(selectedPlayerId, entryId, pin);
    setDeletingId(null);
    if (res.kind === "ok" || res.status === 404) {
      setEntries(es => es.filter(e => e.id !== entryId));
      setConfirmDeleteId(null);
    } else if (isPinRejected(res.status)) {
      onPinRejected();
    } else {
      setDeleteError(entryId);
    }
  };

  if (playersStatus === "loading") {
    return <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>Loading...</p>;
  }
  if (playersStatus === "error") {
    return <ErrorRetry onRetry={onReloadPlayers} />;
  }
  if (players.length === 0) {
    return <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>No children yet.</p>;
  }

  const childName = players.find(p => p.id === selectedPlayerId)?.nickname ?? "your child";
  const highEntries = status === "loaded" ? entries.filter(e => e.concern_level === "high").length : 0;
  const highQuestions = questionsStatus === "loaded" ? questions.filter(q => q.concern_level === "high").length : 0;
  const attentionParts = [
    highEntries > 0 && `${highEntries} diary ${highEntries === 1 ? "entry" : "entries"}`,
    highQuestions > 0 && `${highQuestions} ${highQuestions === 1 ? "question" : "questions"} to Emo`,
  ].filter(Boolean);

  return (
    <>
      <ChildSelector players={players} selectedPlayerId={selectedPlayerId} onSelect={onSelectPlayer} />

      {attentionParts.length > 0 && (
        <div role="alert" className="fn font-bold rounded-2xl px-5 py-4 mb-5"
          style={{ maxWidth: "760px", background: "#FFEBEE", border: "2px solid #E53935", color: "#B71C1C", fontSize: "17px" }}>
          ⚠️ Needs your attention: {attentionParts.join(", ")}
        </div>
      )}

      {status === "loading" && (
        <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>Loading diary...</p>
      )}

      {status === "error" && <ErrorRetry onRetry={() => setReloadTick(t => t + 1)} />}

      {status === "loaded" && entries.length === 0 && (
        <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>
          No diary entries yet. They'll appear after {childName} checks in their mood.
        </p>
      )}

      {status === "loaded" && entries.length > 0 && (
        <div style={{ maxWidth: "760px" }}>
          <div className="flex flex-col gap-4">
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry}
                tip={tips[entry.id]} onGetTips={() => loadTips(entry.id)}
                confirming={confirmDeleteId === entry.id} deleting={deletingId === entry.id}
                deleteFailed={deleteError === entry.id}
                onAskDelete={() => { setConfirmDeleteId(entry.id); setDeleteError(null); }}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => confirmDelete(entry.id)} />
            ))}
          </div>
        </div>
      )}

      <h2 className="fn font-bold mt-10 mb-4" style={{ fontSize: "22px", color: "#212121" }}>Questions asked to Emo 🤖</h2>

      {questionsStatus === "loading" && (
        <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>Loading questions...</p>
      )}

      {questionsStatus === "error" && <ErrorRetry onRetry={() => setQuestionsReloadTick(t => t + 1)} />}

      {questionsStatus === "loaded" && questions.length === 0 && (
        <p className="fn font-bold" style={{ color: "#757575", fontSize: "16px" }}>{childName} hasn't asked Emo anything yet.</p>
      )}

      {questionsStatus === "loaded" && questions.length > 0 && (
        <div className="flex flex-col gap-3" style={{ maxWidth: "760px" }}>
          {questions.map((q, i) => <QuestionCard key={`${q.created_at}-${i}`} message={q} />)}
        </div>
      )}
    </>
  );
}

function ConcernLabel({ level, categories }: { level: ConcernLevel; categories: string[] }) {
  if (level === "none") return null;
  const high = level === "high";
  const words = categories.map(c => CONCERN_CATEGORY_TEXT[c] ?? c);
  return (
    <div className="font-bold rounded-xl px-3 py-2 mb-3"
      style={{
        background: high ? "#FFEBEE" : "#FFF8E1", color: high ? "#B71C1C" : "#8D6E00",
        border: `1.5px solid ${high ? "#E53935" : "#FFC107"}`, fontSize: "14px",
      }}>
      {high ? "⚠️ Needs your attention" : "👀 Worth a look"}
      {words.length > 0 && <span className="font-semibold"> · {words.join(", ")}</span>}
    </div>
  );
}

function QuestionCard({ message }: { message: BuddyMessage }) {
  const high = message.concern_level === "high";
  return (
    <div className="rounded-2xl p-4 bg-white fn"
      style={{
        border: high ? "3px solid #E53935" : "1.5px solid #E0E0E0",
        boxShadow: high ? "0 4px 18px rgba(229,57,53,.15)" : "0 4px 15px rgba(0,0,0,.05)",
      }}>
      <ConcernLabel level={message.concern_level} categories={message.concern_categories} />
      <div className="flex flex-wrap items-start gap-2 mb-1">
        <p className="font-bold flex-1" style={{ color: "#212121", fontSize: "16px", overflowWrap: "anywhere" }}>
          "{message.question}"
        </p>
        <span style={{ color: "#78909C", fontSize: "13px" }}>{formatEntryDate(message.created_at)}</span>
      </div>
      <p style={{ color: "#90A4AE", fontSize: "13px" }}>Emo answered: {message.answer}</p>
    </div>
  );
}

function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div>
      <p className="fn font-bold mb-3" style={{ color: "#EF5350", fontSize: "16px" }}>{CANT_CONNECT}</p>
      <button onClick={onRetry} className="fn font-bold rounded-full px-5 py-2 text-white"
        style={{ background: "#00BCD4", border: "none", cursor: "pointer" }}>
        Try again
      </button>
    </div>
  );
}

function EntryCard({
  entry, tip, onGetTips, confirming, deleting, deleteFailed, onAskDelete, onCancelDelete, onConfirmDelete,
}: {
  entry: DiaryEntry; tip: TipState | undefined; onGetTips: () => void;
  confirming: boolean; deleting: boolean; deleteFailed: boolean;
  onAskDelete: () => void; onCancelDelete: () => void; onConfirmDelete: () => void;
}) {
  const e = EI[entry.emotion];
  const high = entry.concern_level === "high";
  const surprise = surpriseTag(entry);

  return (
    <div className="rounded-2xl p-5 bg-white fn"
      style={{
        border: high ? "3px solid #E53935" : "1.5px solid #E0E0E0",
        boxShadow: high ? "0 4px 18px rgba(229,57,53,.15)" : "0 4px 15px rgba(0,0,0,.05)",
      }}>
      <ConcernLabel level={entry.concern_level} categories={entry.concern_categories} />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-bold rounded-full px-3 py-1"
          style={{ background: e.bg, color: e.text, border: `1.5px solid ${e.border}`, fontSize: "15px" }}>
          {e.emoji} {e.label}
        </span>
        {entry.intensity === "lot" && (
          <span className="font-bold rounded-full px-2 py-0.5" style={{ background: "#ECEFF1", color: "#37474F", fontSize: "12px" }}>
            A lot
          </span>
        )}
        {surprise && (
          <span className="font-bold rounded-full px-2 py-0.5" style={{ background: "#F3E5F5", color: "#6A1B9A", fontSize: "12px" }}>
            {surprise}
          </span>
        )}
        <span className="ml-auto" style={{ color: "#78909C", fontSize: "13px" }}>{formatEntryDate(entry.created_at)}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {entry.reason_tags.length === 0 ? (
          <span style={{ color: "#90A4AE", fontSize: "14px" }}>No reason picked</span>
        ) : (
          entry.reason_tags.map(r => {
            const chip = DIARY_CHIPS.find(c => c.reason === r);
            return (
              <span key={r} className="font-semibold rounded-full px-3 py-1"
                style={{ background: "#F5F5F5", border: "1px solid #E0E0E0", color: "#37474F", fontSize: "13px" }}>
                {chip ? `${chip.emoji} ${chip.label}` : r}
              </span>
            );
          })
        )}
      </div>

      <p className="mb-2" style={{ color: entry.note ? "#212121" : "#90A4AE", fontSize: "16px", fontStyle: entry.note ? "normal" : "italic" }}>
        {entry.note ?? "No note"}
      </p>

      {entry.bot_reply && (
        <p className="mb-4" style={{ color: "#90A4AE", fontSize: "13px" }}>Emo replied: {entry.bot_reply}</p>
      )}

      {tip?.status === "loaded" && <TipsBox tips={tip.data} high={high} />}

      {tip?.status === "error" && (
        <p className="font-bold mb-3" style={{ color: "#EF5350", fontSize: "14px" }}>{CANT_CONNECT}</p>
      )}

      {confirming ? (
        <div className="rounded-xl p-3" style={{ background: "#FFF3F3", border: "1.5px solid #FFCDD2" }}>
          <p className="font-bold mb-2" style={{ color: "#B71C1C", fontSize: "14px" }}>Delete this diary entry? This can't be undone.</p>
          {deleteFailed && <p className="font-bold mb-2" style={{ color: "#EF5350", fontSize: "13px" }}>{CANT_CONNECT}</p>}
          <div className="flex gap-2">
            <button onClick={onConfirmDelete} disabled={deleting}
              className="font-bold rounded-full px-4 py-2 text-white"
              style={{ background: "#E53935", border: "none", cursor: deleting ? "not-allowed" : "pointer", fontSize: "14px" }}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button onClick={onCancelDelete} disabled={deleting}
              className="font-bold rounded-full px-4 py-2"
              style={{ background: "white", border: "1.5px solid #CFD8DC", color: "#455A64", cursor: "pointer", fontSize: "14px" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tip?.status !== "loaded" && (
            <button onClick={onGetTips} disabled={tip?.status === "loading"}
              className="font-bold rounded-full px-4 py-2 text-white"
              style={{
                background: high ? "#E53935" : "#00BCD4", border: "none", fontSize: "14px",
                cursor: tip?.status === "loading" ? "wait" : "pointer", opacity: tip?.status === "loading" ? 0.7 : 1,
              }}>
              {tip?.status === "loading" ? "Getting tips..." : "💡 Get tips"}
            </button>
          )}
          <button onClick={onAskDelete} aria-label="Delete this diary entry"
            className="font-bold rounded-full px-4 py-2"
            style={{ background: "white", border: "1.5px solid #CFD8DC", color: "#78909C", cursor: "pointer", fontSize: "14px" }}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}

function TipsBox({ tips, high }: { tips: DiaryTips; high: boolean }) {
  return (
    <div className="rounded-xl p-4 mb-4"
      style={{ background: high ? "#FFEBEE" : "#E0F7FA", border: `1.5px solid ${high ? "#E53935" : "#00BCD4"}` }}>
      <p className="font-bold mb-2" style={{ color: high ? "#B71C1C" : "#006064", fontSize: "15px" }}>{tips.summary}</p>
      <ol className="list-decimal pl-5 mb-2" style={{ color: "#37474F", fontSize: "14px" }}>
        {tips.tips.map((t, i) => <li key={i} className="mb-1">{t}</li>)}
      </ol>
      <p className="font-semibold mb-2" style={{ color: "#37474F", fontSize: "14px" }}>Try saying: "{tips.talk_starter}"</p>
      <p style={{ color: "#78909C", fontSize: "12px" }}>General tips, not professional advice.</p>
    </div>
  );
}
