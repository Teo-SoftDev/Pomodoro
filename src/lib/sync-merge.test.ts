import { describe, expect, it } from "vitest";
import type { StudySession } from "./sessions";
import { mergeSessions, mergeSubjects } from "./sync-merge";

function session(id: string, completedAt: string): StudySession {
  return {
    id,
    subject: "Matemáticas",
    durationMinutes: 25,
    mode: "focus",
    completedAt,
  };
}

describe("mergeSubjects", () => {
  it("une sin duplicados conservando el orden remoto", () => {
    expect(mergeSubjects(["Física"], ["Matemáticas", "Física"])).toEqual([
      "Matemáticas",
      "Física",
    ]);
  });

  it("mantiene las materias locales", () => {
    expect(mergeSubjects(["Química"], [])).toEqual(["Química"]);
  });
});

describe("mergeSessions", () => {
  it("une por id y ordena por fecha", () => {
    const local = session("s2", "2026-11-16T10:00:00.000Z");
    const remote = session("s1", "2026-11-16T09:00:00.000Z");

    expect(mergeSessions([local], [remote])).toEqual([remote, local]);
  });

  it("prioriza la versión local ante el mismo id", () => {
    const local = session("s1", "2026-11-16T09:00:00.000Z");
    const remote = { ...local, durationMinutes: 50 };

    expect(mergeSessions([local], [remote])).toEqual([local]);
  });
});
