"use client";

import { useSyncExternalStore } from "react";
import { sessionsStore, subjectsStore } from "@/lib/app-store";
import { addSession, type StudySession } from "@/lib/sessions";
import type { TimerDurations } from "@/lib/timer";
import PomodoroTimer from "./PomodoroTimer";
import StudyLog from "./StudyLog";

export interface StudyAppProps {
  durations?: Partial<TimerDurations>;
}

export default function StudyApp({ durations }: StudyAppProps) {
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

  function handleAddSubject(subject: string) {
    if (subjects.includes(subject)) {
      return;
    }
    subjectsStore.set([...subjects, subject]);
  }

  function handleRemoveSubject(subject: string) {
    subjectsStore.set(subjects.filter((item) => item !== subject));
  }

  function handleSessionComplete(session: StudySession) {
    sessionsStore.set(addSession(sessions, session));
  }

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Saltar al contenido
      </a>

      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <h1 className="text-2xl font-semibold">Pomodoro de estudio</h1>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Enfócate por ciclos y registra tus sesiones por materia.
          </p>
        </div>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="flex flex-1 flex-col gap-8 py-8"
      >
        <PomodoroTimer
          subjects={subjects}
          durations={durations}
          onSessionComplete={handleSessionComplete}
        />
        <StudyLog
          subjects={subjects}
          sessions={sessions}
          onAddSubject={handleAddSubject}
          onRemoveSubject={handleRemoveSubject}
        />
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Los datos se guardan solo en este navegador.
          </p>
        </div>
      </footer>
    </div>
  );
}
