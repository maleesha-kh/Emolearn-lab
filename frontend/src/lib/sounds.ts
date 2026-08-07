export type SoundName = "pop" | "chime" | "success" | "whoosh";

const SOUND_FILES: Record<SoundName, string> = {
  pop: "/sounds/pop.mp3",
  chime: "/sounds/chime.mp3",
  success: "/sounds/success.mp3",
  whoosh: "/sounds/whoosh.mp3",
};

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

export function playSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  try {
    let audio = cache[name];
    if (!audio) {
      audio = new Audio(SOUND_FILES[name]);
      cache[name] = audio;
    } else {
      audio.currentTime = 0;
    }
    void audio.play().catch(() => {});
  } catch {
    // ignore
  }
}