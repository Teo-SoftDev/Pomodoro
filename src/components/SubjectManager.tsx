"use client";

import { useId, useState, type FormEvent } from "react";

export interface SubjectManagerProps {
  id?: string;
  subjects: readonly string[];
  onAddSubject: (subject: string) => void;
  onRemoveSubject: (subject: string) => void;
}

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

export default function SubjectManager({
  id,
  subjects,
  onAddSubject,
  onRemoveSubject,
}: SubjectManagerProps) {
  const [newSubject, setNewSubject] = useState<string>("");
  const titleId = useId();
  const inputId = useId();

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newSubject.trim();
    if (value === "" || subjects.includes(value)) {
      return;
    }
    onAddSubject(value);
    setNewSubject("");
  }

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="mx-auto flex w-full max-w-3xl scroll-mt-28 flex-col gap-3 px-4"
    >
      <h2 id={titleId} className="text-xl font-semibold">
        Materias
      </h2>
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor={inputId} className="text-sm font-medium">
            Nueva materia
          </label>
          <input
            id={inputId}
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
                onClick={() => onRemoveSubject(subject)}
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
  );
}
