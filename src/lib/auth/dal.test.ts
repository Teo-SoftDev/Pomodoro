import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hashSessionToken,
  SESSION_COOKIE,
  type AuthSessionRecord,
} from "./session-token";
import type { UserRecord } from "./user";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  findAuthSession: vi.fn(),
  findUserById: vi.fn(),
  deleteAuthSession: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./auth-store", () => ({
  findAuthSession: mocks.findAuthSession,
  findUserById: mocks.findUserById,
  deleteAuthSession: mocks.deleteAuthSession,
}));

const user: UserRecord = {
  id: "user-1",
  email: "usuario@ejemplo.com",
  passwordHash: "scrypt$hash",
  createdAt: "2026-11-17T00:00:00.000Z",
};

const session: AuthSessionRecord = {
  tokenHash: "hash",
  userId: "user-1",
  createdAt: "2026-11-17T00:00:00.000Z",
  expiresAt: "2026-11-24T00:00:00.000Z",
};

async function loadDal() {
  vi.resetModules();
  return import("./dal");
}

function setCookie(value?: string): void {
  mocks.cookies.mockResolvedValue({
    get: (name: string) =>
      name === SESSION_COOKIE && value ? { name, value } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  setCookie("token-valido");
  mocks.findAuthSession.mockResolvedValue(session);
  mocks.findUserById.mockResolvedValue(user);
  mocks.deleteAuthSession.mockResolvedValue(undefined);
});

describe("getAuthUser", () => {
  it("devuelve null sin cookie de sesión", async () => {
    setCookie(undefined);
    const { getAuthUser } = await loadDal();

    expect(await getAuthUser()).toBeNull();
    expect(mocks.findAuthSession).not.toHaveBeenCalled();
  });

  it("devuelve el usuario de una sesión vigente", async () => {
    const { getAuthUser } = await loadDal();

    expect(await getAuthUser()).toEqual({
      id: "user-1",
      email: "usuario@ejemplo.com",
    });
  });

  it("elimina sesiones caducadas", async () => {
    mocks.findAuthSession.mockResolvedValue({
      ...session,
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    const { getAuthUser } = await loadDal();

    expect(await getAuthUser()).toBeNull();
    expect(mocks.deleteAuthSession).toHaveBeenCalledWith(
      hashSessionToken("token-valido"),
    );
  });

  it("devuelve null si la sesión no existe", async () => {
    mocks.findAuthSession.mockResolvedValue(null);
    const { getAuthUser } = await loadDal();

    expect(await getAuthUser()).toBeNull();
    expect(mocks.findUserById).not.toHaveBeenCalled();
  });

  it("devuelve null si el usuario de la sesión no existe", async () => {
    mocks.findUserById.mockResolvedValue(null);
    const { getAuthUser } = await loadDal();

    expect(await getAuthUser()).toBeNull();
  });
});

describe("requireUser y requireApiUser", () => {
  it("redirige a /login cuando no hay usuario", async () => {
    setCookie(undefined);
    const { requireUser } = await loadDal();

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("devuelve el usuario autenticado", async () => {
    const { requireUser, requireApiUser } = await loadDal();

    expect(await requireUser()).toEqual({
      id: "user-1",
      email: "usuario@ejemplo.com",
    });
    expect(await requireApiUser()).toEqual({
      id: "user-1",
      email: "usuario@ejemplo.com",
    });
  });
});
