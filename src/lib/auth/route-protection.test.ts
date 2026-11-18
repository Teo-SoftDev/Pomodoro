import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudySession } from "../sessions";

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  listSessions: vi.fn(),
  saveSession: vi.fn(),
  deleteSession: vi.fn(),
  readSubjects: vi.fn(),
  writeSubjects: vi.fn(),
}));

vi.mock("./dal", () => ({ requireApiUser: mocks.requireApiUser }));
vi.mock("../firestore-repository", () => ({
  listSessions: mocks.listSessions,
  saveSession: mocks.saveSession,
  deleteSession: mocks.deleteSession,
  readSubjects: mocks.readSubjects,
  writeSubjects: mocks.writeSubjects,
}));

import {
  DELETE,
  GET as getSessions,
  POST,
} from "../../../app/api/sessions/route";
import { GET as getSubjects, PUT } from "../../../app/api/subjects/route";

const user = { id: "user-1", email: "usuario@ejemplo.com" };
const session: StudySession = {
  id: "session-1",
  subject: "Matemáticas",
  durationMinutes: 25,
  mode: "focus",
  completedAt: "2026-11-17T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiUser.mockResolvedValue(user);
  mocks.listSessions.mockResolvedValue([session]);
  mocks.saveSession.mockResolvedValue(undefined);
  mocks.deleteSession.mockResolvedValue(true);
  mocks.readSubjects.mockResolvedValue(["Matemáticas"]);
  mocks.writeSubjects.mockResolvedValue(undefined);
});

describe("protección de /api/sessions", () => {
  it("devuelve 401 sin sesión", async () => {
    mocks.requireApiUser.mockResolvedValue(null);

    expect((await getSessions()).status).toBe(401);
    expect(mocks.listSessions).not.toHaveBeenCalled();
  });

  it("lista solo las sesiones del usuario autenticado", async () => {
    const response = await getSessions();

    expect(response.status).toBe(200);
    expect(mocks.listSessions).toHaveBeenCalledWith("user-1");
  });

  it("guarda sesiones en el espacio del usuario", async () => {
    const request = new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify(session),
    });

    expect((await POST(request)).status).toBe(201);
    expect(mocks.saveSession).toHaveBeenCalledWith("user-1", session);
  });

  it("borra sesiones del usuario autenticado", async () => {
    const request = new Request("http://localhost/api/sessions?id=session-1");

    expect((await DELETE(request)).status).toBe(200);
    expect(mocks.deleteSession).toHaveBeenCalledWith("user-1", "session-1");
  });
});

describe("protección de /api/subjects", () => {
  it("devuelve 401 sin sesión", async () => {
    mocks.requireApiUser.mockResolvedValue(null);

    expect((await getSubjects()).status).toBe(401);
    expect(
      (
        await PUT(
          new Request("http://localhost/api/subjects", {
            method: "PUT",
            body: JSON.stringify({ subjects: [] }),
          }),
        )
      ).status,
    ).toBe(401);
    expect(mocks.writeSubjects).not.toHaveBeenCalled();
  });

  it("lee y escribe materias del usuario autenticado", async () => {
    expect((await getSubjects()).status).toBe(200);
    expect(mocks.readSubjects).toHaveBeenCalledWith("user-1");

    const request = new Request("http://localhost/api/subjects", {
      method: "PUT",
      body: JSON.stringify({ subjects: ["Física"] }),
    });
    expect((await PUT(request)).status).toBe(200);
    expect(mocks.writeSubjects).toHaveBeenCalledWith("user-1", ["Física"]);
  });
});
