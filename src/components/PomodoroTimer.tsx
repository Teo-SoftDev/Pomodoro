"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { StudySession } from "@/lib/sessions";
import {
  createTimer,
  formatTime,
  pause,
  reset,
  resumeTimer,
  start,
  tick,
  updateDurations,
  type TimerDurations,
  type TimerMode,
  type TimerState,
} from "@/lib/timer";

export interface TimerResumeRequest {
  sessionId: string;
  subject: string;
  remainingSeconds: number;
}

export interface PomodoroTimerProps {
  id?: string;
  subjects?: readonly string[];
  durations?: Partial<TimerDurations>;
  resumeRequest?: TimerResumeRequest;
  onFocusMinutesChange?: (minutes: number) => void;
  onSessionStart?: (session: StudySession) => void;
  onSessionPause?: (sessionId: string, remainingSeconds: number) => void;
  onSessionResume?: (sessionId: string) => void;
  onSessionDurationChange?: (
    sessionId: string,
    durationMinutes: number,
    remainingSeconds: number,
  ) => void;
  onSessionComplete?: (sessionId: string) => void;
}

const PHASE_LABELS: Record<TimerMode, string> = {
  focus: "Enfoque",
  shortBreak: "Descanso corto",
  longBreak: "Descanso largo",
};

const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 180;

function focusMinutesOf(durations: TimerDurations): number {
  return Math.round(durations.focus / 60);
}

function focusMinutesHint(
  status: TimerState["status"],
  mode: TimerMode,
): string {
  if (status === "running") {
    return "Pausa el temporizador para cambiarla.";
  }
  if (status === "paused" && mode === "focus") {
    return "Al reanudar se usará este tiempo.";
  }
  return "Elige entre 1 y 180 minutos.";
}

const BUTTON_CLASS =
  "min-h-11 min-w-11 rounded-full px-5 py-3 text-base font-medium " +
  "bg-foreground text-background transition-colors hover:opacity-90 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-foreground";

export default function PomodoroTimer({
  id,
  subjects = [],
  durations,
  resumeRequest,
  onFocusMinutesChange,
  onSessionStart,
  onSessionPause,
  onSessionResume,
  onSessionDurationChange,
  onSessionComplete,
}: PomodoroTimerProps) {
  const [timer, setTimer] = useState<TimerState>(() =>
    resumeRequest
      ? resumeTimer(resumeRequest.remainingSeconds, durations)
      : createTimer(durations),
  );
  const [subject, setSubject] = useState<string>(
    () => resumeRequest?.subject ?? subjects[0] ?? "",
  );
  const [focusMinutesInput, setFocusMinutesInput] = useState<string>(() =>
    String(focusMinutesOf(timer.durations)),
  );
  const focusMinutesId = useId();
  const previousFocusSessions = useRef(timer.completedFocusSessions);
  const activeSessionId = useRef<string | null>(
    resumeRequest?.sessionId ?? null,
  );
  const activeSubject = subjects.includes(subject)
    ? subject
    : (subjects[0] ?? "");

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
    const sessionId = activeSessionId.current;
    activeSessionId.current = null;
    if (sessionId) {
      onSessionComplete?.(sessionId);
    }
  }, [timer.completedFocusSessions, onSessionComplete]);

  function registerSessionStart(): void {
    const session: StudySession = {
      id: crypto.randomUUID(),
      subject: activeSubject === "" ? "General" : activeSubject,
      durationMinutes: focusMinutesOf(timer.durations),
      mode: "focus",
      completedAt: new Date().toISOString(),
      status: "in-progress",
    };
    activeSessionId.current = session.id;
    onSessionStart?.(session);
  }

  function handleToggle() {
    if (timer.status === "running") {
      const sessionId = activeSessionId.current;
      setTimer((current) => pause(current));
      if (timer.mode === "focus" && sessionId) {
        onSessionPause?.(sessionId, timer.remaining);
      }
      return;
    }
    if (timer.status === "paused") {
      const sessionId = activeSessionId.current;
      if (sessionId) {
        onSessionResume?.(sessionId);
      }
      setTimer((current) => start(current));
      return;
    }
    if (timer.mode === "focus") {
      registerSessionStart();
    }
    setTimer((current) => start(current));
  }

  function handleReset() {
    setTimer((current) => reset(current));
  }

  function commitFocusMinutes(): void {
    const parsed = Number.parseInt(focusMinutesInput, 10);
    const minutes = Number.isFinite(parsed)
      ? Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, parsed))
      : focusMinutesOf(timer.durations);
    setFocusMinutesInput(String(minutes));
    if (minutes === focusMinutesOf(timer.durations)) {
      return;
    }
    setTimer((current) => {
      const updated = updateDurations(current, { focus: minutes * 60 });
      return current.status === "paused" && current.mode === "focus"
        ? { ...updated, remaining: minutes * 60 }
        : updated;
    });
    onFocusMinutesChange?.(minutes);
    const sessionId = activeSessionId.current;
    if (timer.status === "paused" && timer.mode === "focus" && sessionId) {
      onSessionDurationChange?.(sessionId, minutes, minutes * 60);
    }
  }

  function handleFocusMinutesChange(value: string): void {
    setFocusMinutesInput(value);
  }

  function handleFocusMinutesKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }

  const isRunning = timer.status === "running";
  const canEditFocusMinutes = timer.status !== "running";

  return (
    <section
      id={id}
      aria-labelledby="pomodoro-title"
      className="mx-auto flex w-full max-w-md scroll-mt-28 flex-col items-center gap-6 px-4 py-8"
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
        <label htmlFor={focusMinutesId} className="text-sm font-medium">
          Minutos de enfoque
        </label>
        <input
          id={focusMinutesId}
          type="number"
          inputMode="numeric"
          min={MIN_FOCUS_MINUTES}
          max={MAX_FOCUS_MINUTES}
          step={1}
          value={focusMinutesInput}
          onChange={(event) => handleFocusMinutesChange(event.target.value)}
          onBlur={commitFocusMinutes}
          onKeyDown={handleFocusMinutesKeyDown}
          disabled={!canEditFocusMinutes}
          aria-describedby={`${focusMinutesId}-hint`}
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 dark:border-zinc-700"
        />
        <p
          id={`${focusMinutesId}-hint`}
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          {focusMinutesHint(timer.status, timer.mode)}
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <label htmlFor="pomodoro-subject" className="text-sm font-medium">
          Materia
        </label>
        <select
          id="pomodoro-subject"
          value={activeSubject}
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
