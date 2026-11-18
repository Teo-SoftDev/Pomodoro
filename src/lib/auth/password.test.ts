import { describe, expect, it } from "vitest";
import {
  DUMMY_PASSWORD_HASH,
  PASSWORD_MIN_LENGTH,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "./password";
import { PasswordPolicyError } from "./errors";

const VALID_PASSWORD = "MiClave!2026";

describe("validatePassword", () => {
  it("acepta una contraseña con longitud y símbolo suficientes", () => {
    expect(validatePassword(VALID_PASSWORD)).toEqual([]);
  });

  it("rechaza contraseñas cortas", () => {
    expect(validatePassword("Corto!1")).toEqual([
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    ]);
  });

  it("rechaza contraseñas sin símbolo", () => {
    expect(validatePassword("SoloLetras123")).toEqual([
      "La contraseña debe incluir al menos un símbolo.",
    ]);
  });

  it("rechaza contraseñas demasiado largas", () => {
    const long = `${"a".repeat(128)}!`;
    expect(validatePassword(long)).toEqual([
      "La contraseña no puede superar 128 caracteres.",
    ]);
  });
});

describe("hashPassword", () => {
  it("genera un hash verificable con sal aleatoria", async () => {
    const first = await hashPassword(VALID_PASSWORD);
    const second = await hashPassword(VALID_PASSWORD);

    expect(first).not.toBe(second);
    expect(await verifyPassword(VALID_PASSWORD, first)).toBe(true);
    expect(await verifyPassword(VALID_PASSWORD, second)).toBe(true);
  });

  it("rechaza contraseñas que no cumplen la política", async () => {
    await expect(hashPassword("corta")).rejects.toBeInstanceOf(
      PasswordPolicyError,
    );
  });
});

describe("verifyPassword", () => {
  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword(VALID_PASSWORD);

    expect(await verifyPassword("OtraClave!2026", hash)).toBe(false);
  });

  it("rechaza hashes mal formados", async () => {
    expect(await verifyPassword(VALID_PASSWORD, "no-es-un-hash")).toBe(false);
    expect(await verifyPassword(VALID_PASSWORD, "scrypt$1$2$3$!$!")).toBe(
      false,
    );
  });

  it("puede verificar el hash dummy usado para igualar tiempos", async () => {
    expect(
      await verifyPassword("dummy-password-for-timing", DUMMY_PASSWORD_HASH),
    ).toBe(true);
    expect(await verifyPassword(VALID_PASSWORD, DUMMY_PASSWORD_HASH)).toBe(
      false,
    );
  });
});
