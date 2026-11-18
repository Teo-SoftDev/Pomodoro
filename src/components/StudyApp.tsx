"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { logoutAction } from "../../app/actions/auth";
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
import { mergeSessions, mergeSubjects } from "@/lib/sync-merge";
import {
  loadSessions,
  loadSubjects,
  migrateLegacyLocalStorage,
} from "@/lib/storage";
import type { TimerDurations } from "@/lib/timer";
import PomodoroTimer, { type TimerResumeRequest } from "./PomodoroTimer";
import StudyLog from "./StudyLog";

export interface StudyAppProps {
  userId: string;
  email: string;
  isLegacyOwner: boolean;
  durations?: Partial<TimerDurations>;
}

const NAV_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium " +
  "text-foreground underline-offset-4 hover:underline " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-foreground";

export default function StudyApp({
  userId,
  email,
  isLegacyOwner,
  durations,
}: StudyAppProps) {
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
  const [resumeRequest, setResumeRequest] = useState<{
    request: TimerResumeRequest;
    nonce: number;
  } | null>(null);

  useEffect(() => {
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

  function handleResumeFromHistory(session: StudySession) {
    persistSession(resumeSession(sessions, session.id), session.id);
    setResumeRequest((current) => ({
      request: {
        sessionId: session.id,
        subject: session.subject,
        remainingSeconds:
          session.remainingSeconds ?? session.durationMinutes * 60,
      },
      nonce: (current?.nonce ?? 0) + 1,
    }));
  }

  function handleFocusMinutesChange(minutes: number) {
    durationsStore.set({ ...storedDurations, focus: minutes * 60 });
  }

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-background/95 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Pomodoro de estudio</h1>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Enfócate por ciclos y registra tus sesiones por materia.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <nav aria-label="Secciones principales">
              <ul className="flex flex-wrap gap-1">
                <li>
                  <a href="#temporizador" className={NAV_LINK_CLASS}>
                    Temporizador
                  </a>
                </li>
                <li>
                  <a href="#registro" className={NAV_LINK_CLASS}>
                    Registro
                  </a>
                </li>
              </ul>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <p
                className="max-w-[14rem] truncate text-xs text-zinc-600 dark:text-zinc-400"
                title={email}
              >
                {email}
              </p>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="min-h-11 rounded-lg border border-zinc-300 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:border-zinc-700"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="flex flex-1 flex-col gap-8 py-8"
      >
        <PomodoroTimer
          key={resumeRequest?.nonce ?? "timer"}
          id="temporizador"
          subjects={subjects}
          durations={effectiveDurations}
          resumeRequest={resumeRequest?.request}
          onFocusMinutesChange={handleFocusMinutesChange}
          onSessionStart={handleSessionStart}
          onSessionPause={handleSessionPause}
          onSessionResume={handleSessionResume}
          onSessionDurationChange={handleSessionDurationChange}
          onSessionComplete={handleSessionComplete}
        />
        <StudyLog
          id="registro"
          subjects={subjects}
          sessions={sessions}
          onAddSubject={handleAddSubject}
          onRemoveSubject={handleRemoveSubject}
          onResumeSession={handleResumeFromHistory}
        />
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-zinc-200 bg-background/95 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Los datos se guardan en este navegador y se sincronizan con
            Firestore cuando el servidor está configurado.
          </p>
        </div>
      </footer>
    </div>
  );
}
