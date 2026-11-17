import { describe, expect, it } from "vitest";
import {
  parseSessionPayload,
  parseSessionsPayload,
  parseSubjectsPayload,
} from "./api-payload";
import type { StudySession } from "./sessions";

const session: StudySession = {
  id: "s1",
  subject: "Matemáticas",
  durationMinutes: 25,
  mode: "focus",
  completedAt: "2026-11-16T09:00:00.000Z",
};

describe("parseSessionPayload", () => {
  it("acepta una sesión válida", () => {
    expect(parseSessionPayload(session)).toEqual(session);
  });

  it("rechaza una sesión inválida", () => {
    expect(parseSessionPayload({ id: "s1" })).toBeNull();
    expect(parseSessionPayload(null)).toBeNull();
  });
});

describe("parseSubjectsPayload", () => {
  it("extrae la lista de materias", () => {
    expect(parseSubjectsPayload({ subjects: ["Física"] })).toEqual(["Física"]);
  });

  it("rechaza formatos inválidos", () => {
    expect(parseSubjectsPayload({ subjects: [1] })).toBeNull();
    expect(parseSubjectsPayload({})).toBeNull();
    expect(parseSubjectsPayload([])).toBeNull();
  });
});

describe("parseSessionsPayload", () => {
  it("extrae la lista de sesiones", () => {
    expect(parseSessionsPayload({ sessions: [session] })).toEqual([session]);
  });

  it("rechaza listas con elementos inválidos", () => {
    expect(parseSessionsPayload({ sessions: [session, null] })).toBeNull();
    expect(parseSessionsPayload({ sessions: "s1" })).toBeNull();
    expect(parseSessionsPayload(null)).toBeNull();
  });
});
