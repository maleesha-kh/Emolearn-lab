import { useCallback, useEffect, useRef, useState } from "react";

const SPEECH_RATE = 0.9;

function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function englishVoice(): SpeechSynthesisVoice | undefined {
  const english = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const offline = english.filter((v) => v.localService);
  const pool = offline.length ? offline : english;
  return pool.find((v) => v.default) ?? pool[0];
}

/** Reads text aloud with the browser's speech synthesis; silent while muted and stopped on unmount. */
export function useSpeech(soundOn: boolean) {
  const supported = speechAvailable();
  const [speaking, setSpeaking] = useState(false);
  // Cancelling fires the old utterance's end/error events late, so only the
  // current utterance is allowed to clear the speaking state.
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    currentRef.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported || !soundOn) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = SPEECH_RATE;
    const voice = englishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    const done = () => {
      if (currentRef.current === utterance) {
        currentRef.current = null;
        setSpeaking(false);
      }
    };
    utterance.onend = done;
    utterance.onerror = done;
    currentRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [supported, soundOn]);

  // Some browsers load voices asynchronously; asking once starts that load.
  useEffect(() => {
    if (supported) window.speechSynthesis.getVoices();
  }, [supported]);

  useEffect(() => {
    if (!soundOn) stop();
  }, [soundOn, stop]);

  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop };
}
