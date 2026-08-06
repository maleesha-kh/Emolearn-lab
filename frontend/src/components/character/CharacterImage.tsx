import { useMemo } from "react";
import type { GirlP } from "../../types";
import { emotionForPose, pickRandomImage } from "../../lib/imageBank";

/**
 * Drop-in replacement for the old Figma-generated <AnimeGirl/> SVG. Same
 * prop shape (pose, width, className) so every call site kept working with
 * a single import swap. Renders a real photo from the dataset image bank.
 *
 * - Pass `src` when the exact image must stay consistent with one shown
 *   elsewhere (e.g. a game round's image must match on the result screen) —
 *   lift the roll to the parent and pass it down.
 * - Omit `src` for purely decorative usages (welcome screen, response
 *   screens, profile, etc.) — a fresh random image for that pose's emotion
 *   is picked once per mount.
 */
export function CharacterImage({
  pose = "happy",
  width = 180,
  className = "",
  src,
}: {
  pose?: GirlP;
  width?: number;
  className?: string;
  src?: string;
}) {
  const emotion = emotionForPose(pose);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolvedSrc = useMemo(() => src ?? pickRandomImage(emotion), [src]);

  return (
    <img
      src={resolvedSrc}
      alt={`${emotion} character`}
      width={width}
      draggable={false}
      className={className}
      style={{ width, height: "auto", display: "block" }}
    />
  );
}
