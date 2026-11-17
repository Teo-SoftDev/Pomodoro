import { describe, expect, it } from "vitest";
import {
  isRecord,
  isSessionArray,
  isSessionMode,
  isStringArray,
  isStudySession,
  isUnknownArray,
  parseSession,
} from "./schema";
import type { StudySession } from "./sessions";

const session: StudySession = {
  id: "s1",
  subject: "Matemáticas",
  durationMinutes: 25,
  mode: "focus",
  completedAt: "2026-11-16T09:00:00.000Z",
};

describe("isRecord", () => {
  it("acepta objetos planos", () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("rechaza null, arrays y primitivos", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([1])).toBe(false);
    expect(isRecord("texto")).toBe(false);
  });
});

describe("isUnknownArray", () => {
  it("detecta arrays", () => {
    expect(isUnknownArray([])).toBe(true);
    expect(isUnknownArray({})).toBe(false);
  });
});

describe("isSessionMode", () => {
  it("solo admite focus y break", () => {
    expect(isSessionMode("focus")).toBe(true);
    expect(isSessionMode("break")).toBe(true);
    expect(isSessionMode("otros")).toBe(false);
  });
});

describe("parseSession", () => {
  it("devuelve la sesión válida", () => {
    expect(parseSession(session)).toEqual(session);
  });

  it("usa el id del documento cuando falta en los datos", () => {
    const withoutId = {
      subject: session.subject,
      durationMinutes: session.durationMinutes,
      mode: session.mode,
      completedAt: session.completedAt,
    };
    expect(parseSession(withoutId, "documento")).toEqual({
      ...session,
      id: "documento",
    });
  });

  it("rechaza datos que no son objetos", () => {
    expect(parseSession(null)).toBeNull();
    expect(parseSession("sesión")).toBeNull();
  });

  it("rechaza cada campo inválido", () => {
    expect(parseSession({ ...session, id: 1 })).toBeNull();
    expect(parseSession({ ...session, subject: 1 })).toBeNull();
    expect(parseSession({ ...session, durationMinutes: "25" })).toBeNull();
    expect(parseSession({ ...session, mode: "descanso" })).toBeNull();
    expect(parseSession({ ...session, completedAt: null })).toBeNull();
    expect(parseSession({ ...session, status: "cancelada" })).toBeNull();
  });

  it("conserva un estado válido", () => {
    expect(parseSession({ ...session, status: "in-progress" })).toEqual({
      ...session,
      status: "in-progress",
    });
    expect(parseSession({ ...session, status: "paused" })).toEqual({
      ...session,
      status: "paused",
    });
  });

  it("conserva el tiempo restante válido", () => {
    const paused = {
      ...session,
      status: "paused",
      remainingSeconds: 120,
    };

    expect(parseSession(paused)).toEqual(paused);
  });

  it("rechaza tiempos restantes inválidos", () => {
    expect(parseSession({ ...session, remainingSeconds: -1 })).toBeNull();
    expect(parseSession({ ...session, remainingSeconds: "120" })).toBeNull();
    expect(
      parseSession({ ...session, remainingSeconds: Number.POSITIVE_INFINITY }),
    ).toBeNull();
  });
});

describe("isStudySession e isSessionArray", () => {
  it("reconocen sesiones válidas", () => {
    expect(isStudySession(session)).toBe(true);
    expect(isSessionArray([session])).toBe(true);
  });

  it("rechazan arrays con elementos inválidos", () => {
    expect(isSessionArray([session, { id: "s2" }])).toBe(false);
    expect(isSessionArray(null)).toBe(false);
  });
});

describe("isStringArray", () => {
  it("solo acepta arrays de strings", () => {
    expect(isStringArray(["Matemáticas"])).toBe(true);
    expect(isStringArray(["Matemáticas", 1])).toBe(false);
    expect(isStringArray("Matemáticas")).toBe(false);
  });
});
