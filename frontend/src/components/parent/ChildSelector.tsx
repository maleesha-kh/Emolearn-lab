import { Avatar } from "../common/Avatar";
import type { Player } from "../../types";

export function ChildSelector({ players, selectedPlayerId, onSelect }: {
  players: Player[]; selectedPlayerId: string; onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      {players.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)} aria-pressed={p.id === selectedPlayerId}
          className="flex flex-col items-center gap-1 rounded-2xl p-2 transition-all"
          style={{
            background: p.id === selectedPlayerId ? "#E0F7FA" : "white",
            border: p.id === selectedPlayerId ? "2px solid #00BCD4" : "2px solid #E0E0E0",
            cursor: "pointer", minWidth: "72px",
          }}>
          <Avatar avatarId={p.avatar_id} size={44} />
          <span className="fn font-bold" style={{ fontSize: "12px", color: "#37474F" }}>{p.nickname}</span>
        </button>
      ))}
    </div>
  );
}
