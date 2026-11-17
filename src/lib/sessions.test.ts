import { describe, expect, it } from "vitest";
import {
  addSession,
  completeSession,
  completedPomodoros,
  createSession,
  filterByDate,
  filterBySubject,
  isSessionCompleted,
  isSessionInProgress,
  pauseSession,
  resumeSession,
  statsBySubject,
  totalMinutes,
  updateSessionDuration,
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

describe("completeSession", () => {
  it("marca como completada la sesión indicada", () => {
    const inProgress = buildSession({ id: "p1", status: "in-progress" });
    const other = buildSession({ id: "p2", status: "in-progress" });

    const result = completeSession([inProgress, other], "p1");

    expect(result).toEqual([{ ...inProgress, status: "completed" }, other]);
  });

  it("deja intactas las sesiones que no coinciden", () => {
    const completed = buildSession({ id: "p1", status: "completed" });

    expect(completeSession([completed], "otra")).toEqual([completed]);
  });

  it("reconoce las sesiones en curso", () => {
    expect(isSessionInProgress(buildSession({ status: "in-progress" }))).toBe(
      true,
    );
    expect(isSessionInProgress(buildSession({ status: "paused" }))).toBe(false);
    expect(isSessionInProgress(buildSession({ status: "completed" }))).toBe(
      false,
    );
    expect(isSessionInProgress(buildSession())).toBe(false);
  });

  it("considera completadas las sesiones sin estado o con completed", () => {
    expect(isSessionCompleted(buildSession())).toBe(true);
    expect(isSessionCompleted(buildSession({ status: "completed" }))).toBe(
      true,
    );
    expect(isSessionCompleted(buildSession({ status: "in-progress" }))).toBe(
      false,
    );
    expect(isSessionCompleted(buildSession({ status: "paused" }))).toBe(false);
  });
});

describe("pauseSession", () => {
  it("marca la sesión como en pausa y guarda el tiempo restante", () => {
    const inProgress = buildSession({ id: "p1", status: "in-progress" });
    const other = buildSession({ id: "p2", status: "in-progress" });

    const result = pauseSession([inProgress, other], "p1", 754);

    expect(result).toEqual([
      { ...inProgress, status: "paused", remainingSeconds: 754 },
      other,
    ]);
  });

  it("normaliza el tiempo restante a segundos enteros no negativos", () => {
    const inProgress = buildSession({ id: "p1", status: "in-progress" });

    expect(pauseSession([inProgress], "p1", -12.4)[0]).toEqual(
      expect.objectContaining({ remainingSeconds: 0 }),
    );
  });

  it("deja intactas las sesiones que no coinciden", () => {
    const session = buildSession({ id: "p1" });

    expect(pauseSession([session], "otra", 10)).toEqual([session]);
  });
});

describe("resumeSession", () => {
  it("vuelve a marcar la sesión como en curso", () => {
    const paused = buildSession({
      id: "p1",
      status: "paused",
      remainingSeconds: 120,
    });

    expect(resumeSession([paused], "p1")).toEqual([
      { ...paused, status: "in-progress" },
    ]);
  });

  it("deja intactas las sesiones que no coinciden", () => {
    const session = buildSession({ id: "p1" });

    expect(resumeSession([session], "otra")).toEqual([session]);
  });
});

describe("updateSessionDuration", () => {
  it("actualiza la duración y el tiempo restante de la sesión indicada", () => {
    const paused = buildSession({
      id: "p1",
      status: "paused",
      remainingSeconds: 600,
    });
    const other = buildSession({ id: "p2" });

    const result = updateSessionDuration([paused, other], "p1", 40, 2400);

    expect(result).toEqual([
      { ...paused, durationMinutes: 40, remainingSeconds: 2400 },
      other,
    ]);
  });

  it("normaliza el tiempo restante a segundos enteros no negativos", () => {
    const paused = buildSession({ id: "p1", status: "paused" });

    expect(updateSessionDuration([paused], "p1", 10, -5.2)[0]).toEqual(
      expect.objectContaining({ remainingSeconds: 0 }),
    );
  });

  it("deja intactas las sesiones que no coinciden", () => {
    const session = buildSession({ id: "p1" });

    expect(updateSessionDuration([session], "otra", 10, 600)).toEqual([
      session,
    ]);
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

  it("ignora las sesiones en curso y en pausa", () => {
    const inProgress = buildSession({
      id: "running",
      durationMinutes: 25,
      status: "in-progress",
    });
    const paused = buildSession({
      id: "paused",
      durationMinutes: 25,
      status: "paused",
      remainingSeconds: 600,
    });

    expect(totalMinutes([math, inProgress, paused])).toBe(25);
  });

  it("devuelve cero con una lista vacía", () => {
    expect(totalMinutes([])).toBe(0);
  });
});

describe("completedPomodoros", () => {
  it("cuenta solo las sesiones de foco", () => {
    expect(completedPomodoros([math, mathLater, physics, mathBreak])).toBe(3);
  });

  it("no cuenta las sesiones en curso ni en pausa", () => {
    expect(
      completedPomodoros([
        math,
        buildSession({ status: "in-progress" }),
        buildSession({ status: "paused" }),
      ]),
    ).toBe(1);
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

  it("omite las sesiones de enfoque en curso o en pausa", () => {
    const inProgress = buildSession({
      id: "running",
      status: "in-progress",
    });
    const paused = buildSession({
      id: "paused",
      status: "paused",
      remainingSeconds: 300,
    });

    expect(statsBySubject([math, inProgress, paused])).toEqual([
      { subject: "Matemáticas", totalMinutes: 25, pomodoros: 1 },
    ]);
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
