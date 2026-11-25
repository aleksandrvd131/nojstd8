import { StateStorage } from 'zustand/middleware';

const memoryStorage = new Map<string, string>();

export const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
    } catch {
      // Fallback to in-memory storage when localStorage is unavailable
    }
    return memoryStorage.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
        return;
      }
    } catch {
      // Fallback to in-memory storage when localStorage is unavailable or full
    }
    memoryStorage.set(name, value);
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
        return;
      }
    } catch {
      // Fallback to in-memory storage
    }
    memoryStorage.delete(name);
  },
};

export interface DebouncedStateStorage extends StateStorage {
  flush: () => void;
}

/**
 * Wraps a StateStorage with debounced writes to avoid blocking UI frames
 * (e.g., during 60fps React Flow node dragging) while always returning
 * the freshest pending value synchronously on getItem.
 */
export function createDebouncedStorage(
  baseStorage: StateStorage = safeStorage,
  delayMs = 250
): DebouncedStateStorage {
  const pendingWrites = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const flushKey = (name: string) => {
    const timer = timers.get(name);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(name);
    }
    const pending = pendingWrites.get(name);
    if (pending !== undefined) {
      pendingWrites.delete(name);
      baseStorage.setItem(name, pending);
    }
  };

  return {
    getItem: (name: string) => {
      if (pendingWrites.has(name)) {
        return pendingWrites.get(name) ?? null;
      }
      return baseStorage.getItem(name);
    },
    setItem: (name: string, value: string) => {
      pendingWrites.set(name, value);
      const existingTimer = timers.get(name);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
      }
      const timer = setTimeout(() => {
        flushKey(name);
      }, delayMs);
      timers.set(name, timer);
    },
    removeItem: (name: string) => {
      const timer = timers.get(name);
      if (timer !== undefined) {
        clearTimeout(timer);
        timers.delete(name);
      }
      pendingWrites.delete(name);
      baseStorage.removeItem(name);
    },
    flush: () => {
      for (const key of Array.from(pendingWrites.keys())) {
        flushKey(key);
      }
    },
  };
}

export const debouncedPersistStorage = createDebouncedStorage(safeStorage, 250);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    debouncedPersistStorage.flush();
  });
}
