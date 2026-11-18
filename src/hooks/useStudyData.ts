"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createAppStores } from "@/lib/app-store";
import {
  pullRemoteState,
  pushSession,
  replaceSubjects,
} from "@/lib/firebase-sync";
import {
  addSession,
  completeSession,
  pauseSession,
  resumeSession,
  updateSessionDuration,
  type StudySession,
} from "@/lib/sessions";
import {
  loadSessions,
  loadSubjects,
  migrateLegacyLocalStorage,
} from "@/lib/storage";
import { mergeSessions, mergeSubjects } from "@/lib/sync-merge";
import type { TimerDurations } from "@/lib/timer";

export interface UseStudyDataOptions {
  userId: string;
  isLegacyOwner: boolean;
  durations?: Partial<TimerDurations>;
}

export interface StudyData {
  subjects: string[];
  sessions: StudySession[];
  durations: TimerDurations;
  addSubject: (subject: string) => void;
  removeSubject: (subject: string) => void;
  startSession: (session: StudySession) => void;
  pauseSession: (sessionId: string, remainingSeconds: number) => void;
  resumeSession: (sessionId: string) => void;
  completeSession: (sessionId: string) => void;
  changeSessionDuration: (
    sessionId: string,
    durationMinutes: number,
    remainingSeconds: number,
  ) => void;
  changeFocusMinutes: (minutes: number) => void;
}

export function useStudyData({
  userId,
  isLegacyOwner,
  durations,
}: UseStudyDataOptions): StudyData {
  const {
    subjects: subjectsStore,
    sessions: sessionsStore,
    durations: durationsStore,
  } = useMemo(() => createAppStores(userId), [userId]);
  const subjects = useSyncExternalStore(
    subjectsStore.subscribe,
    subjectsStore.getSnapshot,
    subjectsStore.getServerSnapshot,
  );
  const sessions = useSyncExternalStore(
    sessionsStore.subscribe,
    sessionsStore.getSnapshot,
    sessionsStore.getServerSnapshot,
  );
  const storedDurations = useSyncExternalStore(
    durationsStore.subscribe,
    durationsStore.getSnapshot,
    durationsStore.getServerSnapshot,
  );
  const effectiveDurations = useMemo(
    () => (durations ? { ...storedDurations, ...durations } : storedDurations),
    [durations, storedDurations],
  );
  const migrated = useRef(false);

  useEffect(() => {
    if (migrated.current) {
      return;
    }
    migrated.current = true;
    migrateLegacyLocalStorage(userId, isLegacyOwner);
    subjectsStore.invalidate();
    sessionsStore.invalidate();
    durationsStore.invalidate();
  }, [userId, isLegacyOwner, subjectsStore, sessionsStore, durationsStore]);

  useEffect(() => {
    const controller = new AbortController();
    const legacySessionIds = new Set(
      isLegacyOwner ? [] : loadSessions().map((session) => session.id),
    );
    const legacySubjects = isLegacyOwner ? [] : loadSubjects();
    void pullRemoteState(controller.signal).then((remote) => {
      if (!remote || controller.signal.aborted) {
        return;
      }
      subjectsStore.set(
        mergeSubjects(
          subjectsStore.getSnapshot(),
          remote.subjects.filter(
            (subject) => !legacySubjects.includes(subject),
          ),
        ),
      );
      sessionsStore.set(
        mergeSessions(
          sessionsStore.getSnapshot(),
          remote.sessions.filter(
            (session) => !legacySessionIds.has(session.id),
          ),
        ),
      );
    });
    return () => controller.abort();
  }, [isLegacyOwner, subjectsStore, sessionsStore]);

  function handleAddSubject(subject: string) {
    if (subjects.includes(subject)) {
      return;
    }
    const next = [...subjects, subject];
    subjectsStore.set(next);
    void replaceSubjects(next);
  }

  function handleRemoveSubject(subject: string) {
    const next = subjects.filter((item) => item !== subject);
    subjectsStore.set(next);
    void replaceSubjects(next);
  }

  function persistSession(next: StudySession[], sessionId: string) {
    sessionsStore.set(next);
    const updated = next.find((session) => session.id === sessionId);
    if (updated) {
      void pushSession(updated);
    }
  }

  function handleSessionStart(session: StudySession) {
    sessionsStore.set(addSession(sessions, session));
    void pushSession(session);
  }

  function handleSessionPause(sessionId: string, remainingSeconds: number) {
    persistSession(
      pauseSession(sessions, sessionId, remainingSeconds),
      sessionId,
    );
  }

  function handleSessionResume(sessionId: string) {
    persistSession(resumeSession(sessions, sessionId), sessionId);
  }

  function handleSessionComplete(sessionId: string) {
    persistSession(completeSession(sessions, sessionId), sessionId);
  }

  function handleSessionDurationChange(
    sessionId: string,
    durationMinutes: number,
    remainingSeconds: number,
  ) {
    persistSession(
      updateSessionDuration(
        sessions,
        sessionId,
        durationMinutes,
        remainingSeconds,
      ),
      sessionId,
    );
  }

  function handleFocusMinutesChange(minutes: number) {
    durationsStore.set({ ...storedDurations, focus: minutes * 60 });
  }

  return {
    subjects,
    sessions,
    durations: effectiveDurations,
    addSubject: handleAddSubject,
    removeSubject: handleRemoveSubject,
    startSession: handleSessionStart,
    pauseSession: handleSessionPause,
    resumeSession: handleSessionResume,
    completeSession: handleSessionComplete,
    changeSessionDuration: handleSessionDurationChange,
    changeFocusMinutes: handleFocusMinutesChange,
  };
}
