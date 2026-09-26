// localStorage can throw (e.g. site data blocked). Failed writes are kept in
// memory instead, so they still hold until the page is refreshed.
const memory = new Map<string, string>();

export function safeGet(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
}

export function safeRemove(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing stored there to remove
  }
}
