import { describe, expect, it } from "vitest";
import {
  createAuthSessionRecord,
  generateSessionToken,
  hashSessionToken,
  isAuthSessionExpired,
  parseAuthSessionRecord,
} from "./session-token";
import { lockMinutes, positiveInteger, sessionDays } from "./config";

const NOW = new Date("2026-11-17T12:00:00.000Z");

describe("generateSessionToken", () => {
  it("genera tokens opacos distintos", () => {
    const first = generateSessionToken();
    const second = generateSessionToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("hashSessionToken", () => {
  it("produce un hash SHA-256 estable", () => {
    const hash = hashSessionToken("token-de-prueba");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashSessionToken("token-de-prueba"));
  });
});

describe("createAuthSessionRecord", () => {
  it("calcula la expiración según los días indicados", () => {
    const token = generateSessionToken();
    const record = createAuthSessionRecord(token, "user-1", NOW, 7);

    expect(record).toEqual({
      tokenHash: hashSessionToken(token),
      userId: "user-1",
      createdAt: NOW.toISOString(),
      expiresAt: "2026-11-24T12:00:00.000Z",
    });
  });

  it("usa un valor seguro si los días no son válidos", () => {
    expect(createAuthSessionRecord("token", "user-1", NOW, 0).expiresAt).toBe(
      "2026-11-24T12:00:00.000Z",
    );
  });
});

describe("isAuthSessionExpired", () => {
  it("detecta sesiones caducadas", () => {
    const record = createAuthSessionRecord("token", "user-1", NOW, 1);

    expect(isAuthSessionExpired(record, NOW)).toBe(false);
    expect(
      isAuthSessionExpired(record, new Date("2026-11-18T12:00:00.001Z")),
    ).toBe(true);
  });
});

describe("parseAuthSessionRecord", () => {
  it("valida el documento almacenado", () => {
    const record = createAuthSessionRecord("token", "user-1", NOW, 1);

    expect(parseAuthSessionRecord(record, record.tokenHash)).toEqual(record);
    expect(parseAuthSessionRecord(null, "hash")).toBeNull();
    expect(parseAuthSessionRecord({ userId: "user-1" }, "hash")).toBeNull();
  });
});

describe("configuración de autenticación", () => {
  it("usa valores por defecto y ignora entradas inválidas", () => {
    expect(positiveInteger(undefined, 15)).toBe(15);
    expect(positiveInteger("  ", 15)).toBe(15);
    expect(positiveInteger("cero", 15)).toBe(15);
    expect(positiveInteger("-1", 15)).toBe(15);
  });

  it("lee minutos de bloqueo y días de sesión del entorno", () => {
    expect(lockMinutes({ AUTH_LOCK_MINUTES: "20" })).toBe(20);
    expect(lockMinutes({})).toBe(15);
    expect(sessionDays({ AUTH_SESSION_DAYS: "3" })).toBe(3);
    expect(sessionDays({})).toBe(7);
  });
});
