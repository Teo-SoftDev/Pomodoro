import { describe, expect, it } from "vitest";
import {
  addSession,
  completedPomodoros,
  createSession,
  filterByDate,
  filterBySubject,
  statsBySubject,
  totalMinutes,
  type StudySession,
} from "./sessions";

function buildSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: "base",
    subject: "Matemáticas",
    durationMinutes: 25,
    mode: "focus",
    completedAt: "2026-11-16T09:00:00.000Z",
    ...overrides,
  };
}

const math = buildSession({ id: "m1" });
const mathLater = buildSession({
  id: "m2",
  completedAt: "2026-11-17T09:00:00.000Z",
});
const physics = buildSession({
  id: "p1",
  subject: "Física",
  durationMinutes: 50,
  completedAt: "2026-11-16T11:00:00.000Z",
});
const mathBreak = buildSession({
  id: "b1",
  durationMinutes: 5,
  mode: "break",
  completedAt: "2026-11-16T09:25:00.000Z",
});
const chemistryBreak = buildSession({
  id: "b2",
  subject: "Química",
  durationMinutes: 5,
  mode: "break",
  completedAt: "2026-11-16T12:00:00.000Z",
});

describe("createSession", () => {
  it("devuelve la sesión con los cinco campos esperados", () => {
    const created = createSession(math);

    expect(created).toEqual(math);
  });

  it("recorta los espacios del nombre de la materia", () => {
    const created = createSession(buildSession({ subject: "  Física  " }));

    expect(created.subject).toBe("Física");
  });
});

describe("addSession", () => {
  it("agrega la sesión al final sin mutar la lista original", () => {
    const original: readonly StudySession[] = [math, physics];
    const added = buildSession({ id: "n1", subject: "Historia" });

    const result = addSession(original, added);

    expect(result).toEqual([math, physics, added]);
    expect(original).toEqual([math, physics]);
  });
});

describe("filterBySubject", () => {
  it("devuelve solo las sesiones de la materia indicada", () => {
    const result = filterBySubject([math, mathLater, physics], "Matemáticas");

    expect(result).toEqual([math, mathLater]);
  });

  it("recorta los espacios del nombre buscado", () => {
    const result = filterBySubject([math, physics], "  Física  ");

    expect(result).toEqual([physics]);
  });

  it("devuelve una lista vacía si no hay coincidencias", () => {
    expect(filterBySubject([math, physics], "Química")).toEqual([]);
  });
});

describe("filterByDate", () => {
  it("empareja por día ignorando la hora", () => {
    const result = filterByDate([math, physics, mathLater], "2026-11-16");

    expect(result).toEqual([math, physics]);
  });

  it("devuelve una lista vacía si no hay sesiones ese día", () => {
    expect(filterByDate([math, physics], "2026-01-01")).toEqual([]);
  });
});

describe("totalMinutes", () => {
  it("suma los minutos de las sesiones de foco", () => {
    expect(totalMinutes([math, mathLater, physics, mathBreak])).toBe(100);
  });

  it("devuelve cero con una lista vacía", () => {
    expect(totalMinutes([])).toBe(0);
  });
});

describe("completedPomodoros", () => {
  it("cuenta solo las sesiones de foco", () => {
    expect(completedPomodoros([math, mathLater, physics, mathBreak])).toBe(3);
  });

  it("devuelve cero con una lista vacía", () => {
    expect(completedPomodoros([])).toBe(0);
  });
});

describe("statsBySubject", () => {
  it("agrega minutos y pomodoros por materia", () => {
    const result = statsBySubject([math, mathBreak, physics, chemistryBreak]);

    expect(result).toEqual([
      { subject: "Matemáticas", totalMinutes: 25, pomodoros: 1 },
      { subject: "Física", totalMinutes: 50, pomodoros: 1 },
    ]);
  });

  it("acumula varias sesiones de foco de la misma materia", () => {
    const result = statsBySubject([math, mathLater]);

    expect(result).toEqual([
      { subject: "Matemáticas", totalMinutes: 50, pomodoros: 2 },
    ]);
  });

  it("omite las materias que solo tienen descansos", () => {
    const result = statsBySubject([chemistryBreak]);

    expect(result).toEqual([]);
  });

  it("respeta el orden de primera aparición", () => {
    const result = statsBySubject([physics, math]);

    expect(result.map((stat) => stat.subject)).toEqual([
      "Física",
      "Matemáticas",
    ]);
  });

  it("devuelve una lista vacía con una lista vacía", () => {
    expect(statsBySubject([])).toEqual([]);
  });
});

describe("pureza", () => {
  it("no muta la lista de entrada en ninguna operación", () => {
    const list: readonly StudySession[] = Object.freeze([
      math,
      physics,
      mathBreak,
    ]);
    const snapshot = list.map((item) => ({ ...item }));

    addSession(list, buildSession({ id: "new" }));
    filterBySubject(list, "Matemáticas");
    filterByDate(list, "2026-11-16");
    totalMinutes(list);
    completedPomodoros(list);
    statsBySubject(list);

    expect(list).toEqual(snapshot);
  });
});
