import { isRecord, isSessionArray, isStringArray } from "./schema";
import type { StudySession } from "./sessions";
import { DEFAULT_DURATIONS, type TimerDurations } from "./timer";

export interface PersistedState {
  subjects: string[];
  durations: TimerDurations;
  sessions: StudySession[];
}

export const DEFAULT_STATE: PersistedState = {
  subjects: [],
  durations: DEFAULT_DURATIONS,
  sessions: [],
};

const SUBJECTS_KEY = "pomodoro.subjects.v1";
const DURATIONS_KEY = "pomodoro.durations.v1";
const SESSIONS_KEY = "pomodoro.sessions.v1";

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

export function loadSubjects(storage: Storage | null = getStorage()): string[] {
  return readValue(storage, SUBJECTS_KEY, isStringArray, []);
}

export function saveSubjects(
  subjects: readonly string[],
  storage: Storage | null = getStorage(),
): void {
  writeValue(storage, SUBJECTS_KEY, subjects);
}

export function loadDurations(
  storage: Storage | null = getStorage(),
): TimerDurations {
  return readValue(storage, DURATIONS_KEY, isDurations, DEFAULT_DURATIONS);
}

export function saveDurations(
  durations: TimerDurations,
  storage: Storage | null = getStorage(),
): void {
  writeValue(storage, DURATIONS_KEY, durations);
}

export function loadSessions(
  storage: Storage | null = getStorage(),
): StudySession[] {
  return readValue(storage, SESSIONS_KEY, isSessionArray, []);
}

export function saveSessions(
  sessions: readonly StudySession[],
  storage: Storage | null = getStorage(),
): void {
  writeValue(storage, SESSIONS_KEY, sessions);
}

export function clearSessions(storage: Storage | null = getStorage()): void {
  if (!storage) {
    return;
  }
  storage.removeItem(SESSIONS_KEY);
}

export function clearAll(storage: Storage | null = getStorage()): void {
  if (!storage) {
    return;
  }
  storage.removeItem(SUBJECTS_KEY);
  storage.removeItem(DURATIONS_KEY);
  storage.removeItem(SESSIONS_KEY);
}
