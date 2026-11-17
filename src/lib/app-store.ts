import { createPersistentStore } from "./persistent-store";
import type { StudySession } from "./sessions";
import {
  loadDurations,
  loadSessions,
  loadSubjects,
  saveDurations,
  saveSessions,
  saveSubjects,
} from "./storage";
import { DEFAULT_DURATIONS, type TimerDurations } from "./timer";

const EMPTY_SUBJECTS: string[] = [];
const EMPTY_SESSIONS: StudySession[] = [];

export const subjectsStore = createPersistentStore<string[]>(
  loadSubjects,
  saveSubjects,
  EMPTY_SUBJECTS,
);

export const sessionsStore = createPersistentStore<StudySession[]>(
  loadSessions,
  saveSessions,
  EMPTY_SESSIONS,
);

export const durationsStore = createPersistentStore<TimerDurations>(
  loadDurations,
  saveDurations,
  DEFAULT_DURATIONS,
);
