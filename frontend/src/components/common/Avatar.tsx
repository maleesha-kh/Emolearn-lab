import { AVATARS } from "../../data/avatars";

export function Avatar({ avatarId, size = 64 }: { avatarId: string; size?: number }) {
  const avatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: avatar.image ? undefined : avatar.color }}
    >
      {avatar.image ? (
        <img src={avatar.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: size * 0.55 }}>{avatar.emoji}</span>
      )}
    </div>
  );
}
