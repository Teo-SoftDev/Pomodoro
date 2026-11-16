"use client";

import { useEffect, useRef, useState } from "react";
import type { StudySession } from "@/lib/sessions";
import {
  createTimer,
  formatTime,
  pause,
  reset,
  start,
  tick,
  type TimerDurations,
  type TimerMode,
  type TimerState,
} from "@/lib/timer";

export interface PomodoroTimerProps {
  subjects?: readonly string[];
  durations?: Partial<TimerDurations>;
  onSessionComplete?: (session: StudySession) => void;
}

const PHASE_LABELS: Record<TimerMode, string> = {
  focus: "Enfoque",
  shortBreak: "Descanso corto",
  longBreak: "Descanso largo",
};

const BUTTON_CLASS =
  "min-h-11 min-w-11 rounded-full px-5 py-3 text-base font-medium " +
  "bg-foreground text-background transition-colors hover:opacity-90 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-foreground";

export default function PomodoroTimer({
  subjects = [],
  durations,
  onSessionComplete,
}: PomodoroTimerProps) {
  const [timer, setTimer] = useState<TimerState>(() => createTimer(durations));
  const [subject, setSubject] = useState<string>(subjects[0] ?? "");
  const previousFocusSessions = useRef(timer.completedFocusSessions);

  useEffect(() => {
    if (timer.status !== "running") {
      return;
    }
    const intervalId = window.setInterval(() => {
      setTimer((current) => tick(current));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [timer.status]);

  useEffect(() => {
    if (timer.completedFocusSessions <= previousFocusSessions.current) {
      return;
    }
    previousFocusSessions.current = timer.completedFocusSessions;
    onSessionComplete?.({
      id: crypto.randomUUID(),
      subject: subject === "" ? "General" : subject,
      durationMinutes: Math.round(timer.durations.focus / 60),
      mode: "focus",
      completedAt: new Date().toISOString(),
    });
  }, [
    onSessionComplete,
    subject,
    timer.completedFocusSessions,
    timer.durations.focus,
  ]);

  function handleToggle() {
    setTimer((current) =>
      current.status === "running" ? pause(current) : start(current),
    );
  }

  function handleReset() {
    setTimer((current) => reset(current));
  }

  const isRunning = timer.status === "running";

  return (
    <section
      aria-labelledby="pomodoro-title"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-8"
    >
      <h2 id="pomodoro-title" className="text-xl font-semibold">
        Temporizador Pomodoro
      </h2>

      <p
        role="status"
        aria-live="polite"
        className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
      >
        Fase: {PHASE_LABELS[timer.mode]}
      </p>

      <p className="text-[clamp(2.5rem,12vw,5rem)] font-bold leading-none tabular-nums">
        <span className="sr-only">Tiempo restante: </span>
        <span>{formatTime(timer.remaining)}</span>
      </p>

      <div className="flex w-full flex-col gap-2">
        <label htmlFor="pomodoro-subject" className="text-sm font-medium">
          Materia
        </label>
        <select
          id="pomodoro-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {subjects.length === 0 ? (
            <option value="">Sin materias</option>
          ) : (
            subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={handleToggle} className={BUTTON_CLASS}>
          {isRunning ? "Pausar" : "Iniciar"}
        </button>
        <button type="button" onClick={handleReset} className={BUTTON_CLASS}>
          Reiniciar
        </button>
      </div>
    </section>
  );
}
