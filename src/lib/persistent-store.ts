type Listener = () => void;

export interface PersistentStore<T> {
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  subscribe: (listener: Listener) => () => void;
  set: (value: T) => void;
  invalidate: () => void;
}

export function createPersistentStore<T>(
  read: () => T,
  write: (value: T) => void,
  serverSnapshot: T,
): PersistentStore<T> {
  let cache: T | undefined;
  const listeners = new Set<Listener>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot() {
      if (cache === undefined) {
        cache = read();
      }
      return cache;
    },
    getServerSnapshot() {
      return serverSnapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(value) {
      cache = value;
      write(value);
      notify();
    },
    invalidate() {
      cache = undefined;
      notify();
    },
  };
}
