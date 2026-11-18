import {
  createPersistentStore,
  type PersistentStore,
} from "./persistent-store";
import type { StudySession } from "./sessions";
import { createUserStorage } from "./storage";
import { DEFAULT_DURATIONS, type TimerDurations } from "./timer";

const EMPTY_SUBJECTS: string[] = [];
const EMPTY_SESSIONS: StudySession[] = [];

export interface AppStores {
  subjects: PersistentStore<string[]>;
  sessions: PersistentStore<StudySession[]>;
  durations: PersistentStore<TimerDurations>;
}

export function createAppStores(userId: string): AppStores {
  const storage = createUserStorage(userId);
  return {
    subjects: createPersistentStore(
      storage.loadSubjects,
      storage.saveSubjects,
      EMPTY_SUBJECTS,
    ),
    sessions: createPersistentStore(
      storage.loadSessions,
      storage.saveSessions,
      EMPTY_SESSIONS,
    ),
    durations: createPersistentStore(
      storage.loadDurations,
      storage.saveDurations,
      DEFAULT_DURATIONS,
    ),
  };
}
