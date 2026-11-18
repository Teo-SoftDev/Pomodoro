import { describe, expect, it, vi } from "vitest";
import {
  authenticate,
  registerUser,
  type AuthDependencies,
} from "./auth-service";
import { UserAlreadyExistsError } from "./errors";
import { nextAttemptState } from "./lockout";
import type { UserRecord } from "./user";
import { emailKey } from "./validation";

const NOW = new Date("2026-11-17T12:00:00.000Z");
const CREDENTIALS = {
  email: "usuario@ejemplo.com",
  password: "MiClave!2026",
};
const USER_ID = emailKey(CREDENTIALS.email);

const user: UserRecord = {
  id: USER_ID,
  email: CREDENTIALS.email,
  passwordHash: "hash:MiClave!2026",
  createdAt: NOW.toISOString(),
};

function createDependencies(overrides: Partial<AuthDependencies> = {}) {
  const mocks = {
    hashPassword: vi.fn(async (password: string) => `hash:${password}`),
    verifyPassword: vi.fn(
      async (password: string, hash: string) => hash === `hash:${password}`,
    ),
    findUserByEmail: vi.fn(async () => user),
    createUser: vi.fn(async () => undefined),
    claimLegacyData: vi.fn(async () => undefined),
    readAccountAttempts: vi.fn(async () => null),
    readIpAttempts: vi.fn(async () => null),
    registerFailedAttempts: vi.fn(async () => ({
      account: nextAttemptState(null, NOW),
      ip: nextAttemptState(null, NOW),
    })),
    clearAttempts: vi.fn(async () => undefined),
    createAuthSession: vi.fn(async () => undefined),
    now: () => NOW,
  };
  const dependencies: AuthDependencies = { ...mocks, ...overrides };
  return { dependencies, mocks };
}

function lockedAttempt(expiresAt = "2026-11-17T12:15:00.000Z") {
  return {
    failures: 3,
    firstFailedAt: NOW.toISOString(),
    lockedUntil: "2026-11-17T12:15:00.000Z",
    expiresAt,
  };
}

describe("registerUser", () => {
  it("crea el usuario, reclama datos legacy y abre sesión", async () => {
    const { dependencies, mocks } = createDependencies();

    const result = await registerUser(CREDENTIALS, dependencies);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.user.email).toBe(CREDENTIALS.email);
    expect(mocks.hashPassword).toHaveBeenCalledWith(CREDENTIALS.password);
    expect(mocks.createUser).toHaveBeenCalledWith({
      id: USER_ID,
      email: CREDENTIALS.email,
      passwordHash: "hash:MiClave!2026",
      createdAt: NOW.toISOString(),
    });
    expect(mocks.claimLegacyData).toHaveBeenCalledWith(USER_ID);
    expect(mocks.createAuthSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it("informa si el correo ya está registrado", async () => {
    const { dependencies } = createDependencies({
      createUser: vi.fn(async () => {
        throw new UserAlreadyExistsError();
      }),
    });

    expect(await registerUser(CREDENTIALS, dependencies)).toEqual({
      ok: false,
      error: "exists",
    });
  });

  it("no bloquea el registro si falla la migración legacy", async () => {
    const { dependencies } = createDependencies({
      claimLegacyData: vi.fn(async () => {
        throw new Error("Firestore no disponible");
      }),
    });

    expect((await registerUser(CREDENTIALS, dependencies)).ok).toBe(true);
  });
});

describe("authenticate", () => {
  it("abre sesión y limpia intentos con credenciales válidas", async () => {
    const { dependencies, mocks } = createDependencies();

    const result = await authenticate(CREDENTIALS, "192.0.2.1", dependencies);

    expect(result.ok).toBe(true);
    expect(mocks.clearAttempts).toHaveBeenCalledWith(
      CREDENTIALS.email,
      "192.0.2.1",
    );
    expect(mocks.createAuthSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it("registra el fallo y usa un hash dummy si el usuario no existe", async () => {
    const { dependencies, mocks } = createDependencies({
      findUserByEmail: vi.fn(async () => null),
    });

    const result = await authenticate(CREDENTIALS, "192.0.2.1", dependencies);

    expect(result).toEqual({
      ok: false,
      error: "invalid",
      retryAfterSeconds: 0,
    });
    expect(mocks.verifyPassword).toHaveBeenCalledWith(
      CREDENTIALS.password,
      expect.any(String),
    );
    expect(mocks.registerFailedAttempts).toHaveBeenCalledWith(
      CREDENTIALS.email,
      "192.0.2.1",
      NOW,
    );
  });

  it("bloquea antes de consultar el usuario si la cuenta está bloqueada", async () => {
    const { dependencies, mocks } = createDependencies({
      readAccountAttempts: vi.fn(async () => lockedAttempt()),
    });

    const result = await authenticate(CREDENTIALS, "192.0.2.1", dependencies);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toBe("locked");
    expect(result.retryAfterSeconds).toBe(900);
    expect(mocks.findUserByEmail).not.toHaveBeenCalled();
  });

  it("devuelve el estado de bloqueo alcanzado en el tercer fallo", async () => {
    const { dependencies } = createDependencies({
      verifyPassword: vi.fn(async () => false),
      registerFailedAttempts: vi.fn(async () => ({
        account: lockedAttempt(),
        ip: nextAttemptState(null, NOW),
      })),
    });

    expect(await authenticate(CREDENTIALS, "192.0.2.1", dependencies)).toEqual({
      ok: false,
      error: "locked",
      retryAfterSeconds: 900,
    });
  });
});
