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

interface StorageKeys {
  subjects: string;
  durations: string;
  sessions: string;
}

function storageKeys(namespace?: string): StorageKeys {
  const prefix = namespace ? `pomodoro.${namespace}` : "pomodoro";
  return {
    subjects: `${prefix}.subjects.v1`,
    durations: `${prefix}.durations.v1`,
    sessions: `${prefix}.sessions.v1`,
  };
}

function createStorageAccessors(namespace?: string): StorageAccessors {
  const keys = storageKeys(namespace);

  return {
    loadSubjects(storage: Storage | null = getStorage()): string[] {
      return readValue(storage, keys.subjects, isStringArray, []);
    },
    saveSubjects(
      subjects: readonly string[],
      storage: Storage | null = getStorage(),
    ): void {
      writeValue(storage, keys.subjects, subjects);
    },
    loadDurations(storage: Storage | null = getStorage()): TimerDurations {
      return readValue(storage, keys.durations, isDurations, DEFAULT_DURATIONS);
    },
    saveDurations(
      durations: TimerDurations,
      storage: Storage | null = getStorage(),
    ): void {
      writeValue(storage, keys.durations, durations);
    },
    loadSessions(storage: Storage | null = getStorage()): StudySession[] {
      return readValue(storage, keys.sessions, isSessionArray, []);
    },
    saveSessions(
      sessions: readonly StudySession[],
      storage: Storage | null = getStorage(),
    ): void {
      writeValue(storage, keys.sessions, sessions);
    },
    clearSessions(storage: Storage | null = getStorage()): void {
      if (storage) {
        storage.removeItem(keys.sessions);
      }
    },
    clearAll(storage: Storage | null = getStorage()): void {
      if (!storage) {
        return;
      }
      storage.removeItem(keys.subjects);
      storage.removeItem(keys.durations);
      storage.removeItem(keys.sessions);
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

const LEGACY_MIGRATION_MARKER = "pomodoro.legacyMigrated.v1";

function legacyUserMarkerKey(userId: string): string {
  return `pomodoro.${userId}.legacyMigrated.v1`;
}

function removeDuplicatedLegacyData(userId: string, storage: Storage): void {
  if (storage.getItem(legacyUserMarkerKey(userId)) !== "1") {
    return;
  }
  const legacySubjects = legacyStorage.loadSubjects(storage);
  const legacySessions = legacyStorage.loadSessions(storage);
  if (legacySubjects.length === 0 && legacySessions.length === 0) {
    return;
  }
  const legacySessionIds = new Set(legacySessions.map((session) => session.id));
  const userStorage = createUserStorage(userId);
  userStorage.saveSubjects(
    userStorage
      .loadSubjects(storage)
      .filter((subject) => !legacySubjects.includes(subject)),
    storage,
  );
  userStorage.saveSessions(
    userStorage
      .loadSessions(storage)
      .filter((session) => !legacySessionIds.has(session.id)),
    storage,
  );
}

export function migrateLegacyLocalStorage(
  userId: string,
  isLegacyOwner: boolean,
  storage: Storage | null = getStorage(),
): void {
  if (!storage) {
    return;
  }
  const userMarkerKey = legacyUserMarkerKey(userId);

  if (!isLegacyOwner) {
    removeDuplicatedLegacyData(userId, storage);
    storage.removeItem(userMarkerKey);
    return;
  }

  if (storage.getItem(LEGACY_MIGRATION_MARKER) === "1") {
    storage.removeItem(userMarkerKey);
    return;
  }

  const userStorage = createUserStorage(userId);
  const userKeys = storageKeys(userId);
  const hasUserData =
    storage.getItem(userKeys.subjects) !== null ||
    storage.getItem(userKeys.sessions) !== null;

  if (hasUserData) {
    storage.setItem(LEGACY_MIGRATION_MARKER, "1");
    storage.removeItem(userMarkerKey);
    return;
  }

  userStorage.saveSubjects(legacyStorage.loadSubjects(storage), storage);
  if (storage.getItem(userKeys.durations) === null) {
    userStorage.saveDurations(legacyStorage.loadDurations(storage), storage);
  }
  userStorage.saveSessions(legacyStorage.loadSessions(storage), storage);
  storage.setItem(LEGACY_MIGRATION_MARKER, "1");
  storage.removeItem(userMarkerKey);
}
