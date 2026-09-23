import { useMemo } from "react";
import type { GirlP } from "../../types";
import { emotionForPose, pickRandomImage } from "../../lib/imageBank";

/**
 * Renders a real photo from the dataset image bank for the given pose.
 *
 * NOTE: pass `src` when the image must stay consistent with one shown
 * elsewhere (e.g. a game round's image on its result screen) — lift the
 * roll to the parent. Omit it for decorative uses, where a fresh random
 * image is picked once per mount.
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
