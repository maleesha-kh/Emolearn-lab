import type { Scr } from "../../types";

const NAV_ITEMS: { s: Scr; label: string; emoji: string }[] = [
  { s: "moodcheckin", label: "Mood", emoji: "🌞" },
  { s: "gamestart", label: "Play", emoji: "🎮" },
  { s: "profile", label: "Me", emoji: "👤" },
  { s: "dictionary", label: "Learn", emoji: "📖" },
  { s: "achievements", label: "Badges", emoji: "🏆" },
];

export const SCREENS_WITHOUT_NAV: Scr[] = ["welcome", "pin", "parent", "loading", "t-correct", "t-wrong"];

export function BottomNav({ screen, onNavigate }: { screen: Scr; onNavigate: (s: Scr) => void }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-2 pt-1 gap-2"
      style={{ background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", borderTop: "1.5px solid rgba(0,188,212,.15)" }}
    >
      {NAV_ITEMS.map((item) => (
        <button
          key={item.s}
          onClick={() => onNavigate(item.s)}
          className="fn font-bold flex flex-col items-center px-4 py-1 rounded-2xl transition-all hover:bg-cyan-50"
          style={{
            fontSize: "11px",
            color: screen === item.s ? "#00BCD4" : "#9E9E9E",
            background: screen === item.s ? "#E0F7FA" : "transparent",
            minWidth: "60px",
          }}
        >
          <span style={{ fontSize: "22px" }}>{item.emoji}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
