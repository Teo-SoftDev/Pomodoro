import { describe, expect, it } from "vitest";
import {
  documentToSession,
  documentToSubjects,
  sessionToDocument,
  subjectsToDocument,
} from "./firestore-mapping";
import type { StudySession } from "./sessions";

const session: StudySession = {
  id: "s1",
  subject: "Matemáticas",
  durationMinutes: 25,
  mode: "focus",
  completedAt: "2026-11-16T09:00:00.000Z",
};

describe("sessionToDocument", () => {
  it("serializa todos los campos", () => {
    expect(sessionToDocument(session)).toEqual(session);
  });

  it("incluye el estado cuando existe", () => {
    expect(sessionToDocument({ ...session, status: "in-progress" })).toEqual({
      ...session,
      status: "in-progress",
    });
  });

  it("incluye el tiempo restante cuando existe", () => {
    const paused = {
      ...session,
      status: "paused" as const,
      remainingSeconds: 90,
    };

    expect(sessionToDocument(paused)).toEqual(paused);
  });
});

describe("documentToSession", () => {
  it("reconstruye una sesión usando el id del documento", () => {
    const fields = {
      subject: session.subject,
      durationMinutes: session.durationMinutes,
      mode: session.mode,
      completedAt: session.completedAt,
    };
    expect(documentToSession("s1", fields)).toEqual(session);
  });

  it("devuelve null si el documento está corrupto", () => {
    expect(documentToSession("s1", { subject: "Matemáticas" })).toBeNull();
    expect(documentToSession("s1", undefined)).toBeNull();
  });
});

describe("subjectsToDocument y documentToSubjects", () => {
  it("hacen el viaje de ida y vuelta", () => {
    const document = subjectsToDocument(["Matemáticas", "Física"]);
    expect(documentToSubjects(document)).toEqual(["Matemáticas", "Física"]);
  });

  it("devuelve una lista vacía si el documento no es válido", () => {
    expect(documentToSubjects(null)).toEqual([]);
    expect(documentToSubjects({ items: [1] })).toEqual([]);
  });
});
