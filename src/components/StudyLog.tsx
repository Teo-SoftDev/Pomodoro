"use client";

import { useId, useState, type FormEvent } from "react";
import { formatDuration, formatSessionDate } from "@/lib/format";
import {
  completedPomodoros,
  filterBySubject,
  statsBySubject,
  totalMinutes,
  type StudySession,
} from "@/lib/sessions";

export interface StudyLogProps {
  sessions?: readonly StudySession[];
  subjects?: readonly string[];
  onAddSubject?: (subject: string) => void;
  onRemoveSubject?: (subject: string) => void;
}

const ALL_SUBJECTS = "all";

const MODE_LABELS: Record<StudySession["mode"], string> = {
  focus: "Enfoque",
  break: "Descanso",
};

const CONTROL_CLASS =
  "min-h-11 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 " +
  "text-base text-foreground focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-foreground " +
  "dark:border-zinc-700";

const BUTTON_CLASS =
  "min-h-11 rounded-lg bg-foreground px-4 py-2 text-base font-medium " +
  "text-background transition-colors hover:opacity-90 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-foreground";

const MUTED_TEXT = "text-sm text-zinc-700 dark:text-zinc-300";

function pomodoroLabel(count: number): string {
  return count === 1 ? "1 pomodoro" : `${count} pomodoros`;
}

function sortByRecent(sessions: readonly StudySession[]): StudySession[] {
  return [...sessions].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );
}

export default function StudyLog({
  sessions = [],
  subjects = [],
  onAddSubject,
  onRemoveSubject,
}: StudyLogProps) {
  const [filter, setFilter] = useState<string>(ALL_SUBJECTS);
  const [newSubject, setNewSubject] = useState<string>("");
  const newSubjectId = useId();

  const stats = statsBySubject(sessions);
  const visibleSessions = sortByRecent(
    filter === ALL_SUBJECTS ? sessions : filterBySubject(sessions, filter),
  );

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newSubject.trim();
    if (value === "" || subjects.includes(value)) {
      return;
    }
    onAddSubject?.(value);
    setNewSubject("");
  }

  return (
    <section
      aria-labelledby="studylog-title"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8"
    >
      <h2 id="studylog-title" className="text-xl font-semibold">
        Registro de estudio
      </h2>

      <section
        aria-labelledby="studylog-summary-title"
        className="flex flex-col gap-3"
      >
        <h3 id="studylog-summary-title" className="text-base font-semibold">
          Resumen por materia
        </h3>
        {stats.length === 0 ? (
          <p className={MUTED_TEXT}>Aún no hay materias con sesiones.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.map((item) => (
              <li
                key={item.subject}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span className="font-medium">{item.subject}</span>
                <span className={MUTED_TEXT}>
                  <span>{formatDuration(item.totalMinutes)}</span>
                  {" · "}
                  <span>{pomodoroLabel(item.pomodoros)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm font-medium">
          Total: {formatDuration(totalMinutes(sessions))} ·{" "}
          {pomodoroLabel(completedPomodoros(sessions))}
        </p>
      </section>

      <section
        aria-labelledby="studylog-subjects-title"
        className="flex flex-col gap-3"
      >
        <h3 id="studylog-subjects-title" className="text-base font-semibold">
          Materias
        </h3>
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor={newSubjectId} className="text-sm font-medium">
              Nueva materia
            </label>
            <input
              id={newSubjectId}
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              className={CONTROL_CLASS}
            />
          </div>
          <button type="submit" className={BUTTON_CLASS}>
            Agregar
          </button>
        </form>
        {subjects.length === 0 ? (
          <p className={MUTED_TEXT}>No hay materias registradas.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <li
                key={subject}
                className="flex items-center gap-2 rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700"
              >
                <span className="text-sm">{subject}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSubject?.(subject)}
                  aria-label={`Eliminar ${subject}`}
                  className="min-h-11 min-w-11 rounded-full px-2 text-sm font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="studylog-history-title"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h3 id="studylog-history-title" className="text-base font-semibold">
            Historial de sesiones
          </h3>
          <div className="flex flex-col gap-2">
            <label htmlFor="studylog-filter" className="text-sm font-medium">
              Filtrar por materia
            </label>
            <select
              id="studylog-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className={CONTROL_CLASS}
            >
              <option value={ALL_SUBJECTS}>Todas las materias</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visibleSessions.length === 0 ? (
          <p role="status" className={MUTED_TEXT}>
            No hay sesiones registradas
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm md:text-base">
              <caption className="sr-only">Historial de sesiones</caption>
              <thead>
                <tr className="border-b border-zinc-300 dark:border-zinc-700">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Materia
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Fecha
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Duración
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-zinc-200 dark:border-zinc-800"
                  >
                    <th scope="row" className="px-3 py-2 font-medium">
                      {session.subject}
                    </th>
                    <td className="px-3 py-2">
                      {formatSessionDate(session.completedAt)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDuration(session.durationMinutes)}
                    </td>
                    <td className="px-3 py-2">{MODE_LABELS[session.mode]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
