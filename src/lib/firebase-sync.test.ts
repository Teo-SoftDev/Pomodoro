import { afterEach, describe, expect, it, vi } from "vitest";
import { pullRemoteState, pushSession, replaceSubjects } from "./firebase-sync";
import type { StudySession } from "./sessions";

const session: StudySession = {
  id: "s1",
  subject: "Matemáticas",
  durationMinutes: 25,
  mode: "focus",
  completedAt: "2026-11-16T09:00:00.000Z",
};

function jsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pullRemoteState", () => {
  it("combina las materias y las sesiones del servidor", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      return String(input) === "/api/subjects"
        ? jsonResponse({ subjects: ["Matemáticas"] })
        : jsonResponse({ sessions: [session] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pullRemoteState()).resolves.toEqual({
      subjects: ["Matemáticas"],
      sessions: [session],
    });
  });

  it("devuelve null si alguna respuesta no es correcta", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, false));
    vi.stubGlobal("fetch", fetchMock);

    await expect(pullRemoteState()).resolves.toBeNull();
  });

  it("devuelve null si el cuerpo no es JSON válido", async () => {
    const fetchMock = vi.fn(async () => new Response("no-json"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(pullRemoteState()).resolves.toBeNull();
  });

  it("devuelve null si una lista no tiene el formato esperado", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      return String(input) === "/api/subjects"
        ? jsonResponse({ subjects: [1] })
        : jsonResponse({ sessions: [session] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pullRemoteState()).resolves.toBeNull();
  });

  it("devuelve null si fetch no está disponible", async () => {
    vi.stubGlobal("fetch", undefined);

    await expect(pullRemoteState()).resolves.toBeNull();
  });

  it("devuelve null si la petición falla", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("sin red");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pullRemoteState()).resolves.toBeNull();
  });
});

describe("pushSession", () => {
  it("envía la sesión por POST", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(pushSession(session)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("devuelve false si el servidor responde con error", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(pushSession(session)).resolves.toBe(false);
  });

  it("devuelve false si la petición falla", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("sin red");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pushSession(session)).resolves.toBe(false);
  });

  it("devuelve false si fetch no está disponible", async () => {
    vi.stubGlobal("fetch", undefined);

    await expect(pushSession(session)).resolves.toBe(false);
  });
});

describe("replaceSubjects", () => {
  it("envía la lista completa por PUT", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(replaceSubjects(["Física"])).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/subjects",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("devuelve false si fetch no está disponible", async () => {
    vi.stubGlobal("fetch", undefined);

    await expect(replaceSubjects(["Física"])).resolves.toBe(false);
  });
});
