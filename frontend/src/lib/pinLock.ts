import { safeRemove } from "./storage";

// Wrong-PIN lockout state, shared by the PIN screen and the parent settings
export const WRONG_COUNT_KEY = "emolearn_pin_wrong_count";
export const LOCKED_UNTIL_KEY = "emolearn_pin_locked_until";

export function clearPinLock(): void {
  safeRemove(WRONG_COUNT_KEY);
  safeRemove(LOCKED_UNTIL_KEY);
}
