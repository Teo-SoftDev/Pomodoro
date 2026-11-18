import { isRecord, isSessionArray, isStringArray } from "./schema";
import type { StudySession } from "./sessions";
import { DEFAULT_DURATIONS, type TimerDurations } from "./timer";

export interface PersistedState {
  subjects: string[];
  durations: TimerDurations;
  sessions: StudySession[];
}

export interface StorageAccessors {
  loadSubjects(storage?: Storage | null): string[];
  saveSubjects(subjects: readonly string[], storage?: Storage | null): void;
  loadDurations(storage?: Storage | null): TimerDurations;
  saveDurations(durations: TimerDurations, storage?: Storage | null): void;
  loadSessions(storage?: Storage | null): StudySession[];
  saveSessions(
    sessions: readonly StudySession[],
    storage?: Storage | null,
  ): void;
  clearSessions(storage?: Storage | null): void;
  clearAll(storage?: Storage | null): void;
}

export const DEFAULT_STATE: PersistedState = {
  subjects: [],
  durations: DEFAULT_DURATIONS,
  sessions: [],
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

function isDurations(value: unknown): value is TimerDurations {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.focus === "number" &&
    typeof value.shortBreak === "number" &&
    typeof value.longBreak === "number"
  );
}

function readValue<T>(
  storage: Storage | null,
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): T {
  if (!storage) {
    return fallback;
  }
  const raw = storage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeValue(
  storage: Storage | null,
  key: string,
  value: unknown,
): void {
  if (!storage) {
    return;
  }
  storage.setItem(key, JSON.stringify(value));
}

function createStorageAccessors(namespace?: string): StorageAccessors {
  const prefix = namespace ? `pomodoro.${namespace}` : "pomodoro";
  const subjectsKey = `${prefix}.subjects.v1`;
  const durationsKey = `${prefix}.durations.v1`;
  const sessionsKey = `${prefix}.sessions.v1`;

  return {
    loadSubjects(storage: Storage | null = getStorage()): string[] {
      return readValue(storage, subjectsKey, isStringArray, []);
    },
    saveSubjects(
      subjects: readonly string[],
      storage: Storage | null = getStorage(),
    ): void {
      writeValue(storage, subjectsKey, subjects);
    },
    loadDurations(storage: Storage | null = getStorage()): TimerDurations {
      return readValue(storage, durationsKey, isDurations, DEFAULT_DURATIONS);
    },
    saveDurations(
      durations: TimerDurations,
      storage: Storage | null = getStorage(),
    ): void {
      writeValue(storage, durationsKey, durations);
    },
    loadSessions(storage: Storage | null = getStorage()): StudySession[] {
      return readValue(storage, sessionsKey, isSessionArray, []);
    },
    saveSessions(
      sessions: readonly StudySession[],
      storage: Storage | null = getStorage(),
    ): void {
      writeValue(storage, sessionsKey, sessions);
    },
    clearSessions(storage: Storage | null = getStorage()): void {
      if (storage) {
        storage.removeItem(sessionsKey);
      }
    },
    clearAll(storage: Storage | null = getStorage()): void {
      if (!storage) {
        return;
      }
      storage.removeItem(subjectsKey);
      storage.removeItem(durationsKey);
      storage.removeItem(sessionsKey);
    },
  };
}

const legacyStorage = createStorageAccessors();

export const loadSubjects = legacyStorage.loadSubjects;
export const saveSubjects = legacyStorage.saveSubjects;
export const loadDurations = legacyStorage.loadDurations;
export const saveDurations = legacyStorage.saveDurations;
export const loadSessions = legacyStorage.loadSessions;
export const saveSessions = legacyStorage.saveSessions;
export const clearSessions = legacyStorage.clearSessions;
export const clearAll = legacyStorage.clearAll;

export function createUserStorage(userId: string): StorageAccessors {
  return createStorageAccessors(userId);
}

export function migrateLegacyLocalStorage(
  userId: string,
  storage: Storage | null = getStorage(),
): void {
  if (!storage) {
    return;
  }
  const markerKey = `pomodoro.${userId}.legacyMigrated.v1`;
  if (storage.getItem(markerKey) === "1") {
    return;
  }
  const userStorage = createUserStorage(userId);
  userStorage.saveSubjects(legacyStorage.loadSubjects(storage), storage);
  userStorage.saveDurations(legacyStorage.loadDurations(storage), storage);
  userStorage.saveSessions(legacyStorage.loadSessions(storage), storage);
  storage.setItem(markerKey, "1");
}
