import { describe, expect, it } from "vitest";
import {
  MAX_FAILED_ATTEMPTS,
  isLocked,
  nextAttemptState,
  parseAttemptState,
  remainingLockSeconds,
} from "./lockout";

const NOW = new Date("2026-11-17T12:00:00.000Z");
const MINUTES = 15;

describe("nextAttemptState", () => {
  it("cuenta los dos primeros fallos sin bloquear", () => {
    const first = nextAttemptState(null, NOW, MINUTES);
    const second = nextAttemptState(
      first,
      new Date("2026-11-17T12:01:00.000Z"),
      MINUTES,
    );

    expect(first.failures).toBe(1);
    expect(first.lockedUntil).toBeNull();
    expect(first.expiresAt).toBe("2026-11-17T12:15:00.000Z");
    expect(second.failures).toBe(2);
    expect(isLocked(second, NOW)).toBe(false);
  });

  it("bloquea 15 minutos en el tercer fallo", () => {
    const first = nextAttemptState(null, NOW, MINUTES);
    const second = nextAttemptState(first, NOW, MINUTES);
    const third = nextAttemptState(second, NOW, MINUTES);

    expect(third.failures).toBe(MAX_FAILED_ATTEMPTS);
    expect(third.lockedUntil).toBe("2026-11-17T12:15:00.000Z");
    expect(isLocked(third, NOW)).toBe(true);
    expect(remainingLockSeconds(third, NOW)).toBe(900);
  });

  it("reinicia el contador cuando expira la ventana", () => {
    const old = nextAttemptState(null, NOW, MINUTES);
    const later = new Date("2026-11-17T12:16:00.000Z");
    const renewed = nextAttemptState(old, later, MINUTES);

    expect(renewed.failures).toBe(1);
    expect(renewed.firstFailedAt).toBe(later.toISOString());
    expect(renewed.lockedUntil).toBeNull();
  });

  it("no extiende un bloqueo ya activo", () => {
    const first = nextAttemptState(null, NOW, MINUTES);
    const second = nextAttemptState(first, NOW, MINUTES);
    const locked = nextAttemptState(second, NOW, MINUTES);
    const repeated = nextAttemptState(locked, NOW, MINUTES);

    expect(repeated.lockedUntil).toBe(locked.lockedUntil);
  });

  it("devuelve cero segundos si no está bloqueado", () => {
    expect(
      remainingLockSeconds(nextAttemptState(null, NOW, MINUTES), NOW),
    ).toBe(0);
  });
});

describe("parseAttemptState", () => {
  it("valida el documento de Firestore", () => {
    const state = nextAttemptState(null, NOW, MINUTES);

    expect(parseAttemptState(state)).toEqual(state);
    expect(parseAttemptState(null)).toBeNull();
    expect(parseAttemptState({ ...state, failures: 99 })).toBeNull();
    expect(parseAttemptState({ ...state, lockedUntil: 1 })).toBeNull();
  });
});
