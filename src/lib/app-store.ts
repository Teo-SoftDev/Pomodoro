import { createPersistentStore } from "./persistent-store";
import type { StudySession } from "./sessions";
import {
  loadSessions,
  loadSubjects,
  saveSessions,
  saveSubjects,
} from "./storage";

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
