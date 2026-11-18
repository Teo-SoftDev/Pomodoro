import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  parseCredentials,
  parseRegistration,
  validateEmail,
} from "./validation";

describe("validateEmail", () => {
  it("normaliza mayúsculas y espacios", () => {
    expect(normalizeEmail("  Usuario@Ejemplo.COM ")).toBe(
      "usuario@ejemplo.com",
    );
  });

  it("acepta un correo válido", () => {
    expect(validateEmail("usuario@ejemplo.com")).toBeNull();
  });

  it("rechaza correos inválidos", () => {
    expect(validateEmail("sin-arroba")).not.toBeNull();
    expect(validateEmail("usuario@ejemplo")).not.toBeNull();
    expect(validateEmail("")).not.toBeNull();
  });
});

describe("parseCredentials", () => {
  it("devuelve credenciales normalizadas", () => {
    expect(
      parseCredentials({
        email: " USUARIO@ejemplo.com ",
        password: "clave!12345",
      }),
    ).toEqual({ email: "usuario@ejemplo.com", password: "clave!12345" });
  });

  it("rechaza payloads inválidos", () => {
    expect(parseCredentials(null)).toBeNull();
    expect(parseCredentials({ email: 1, password: "clave!12345" })).toBeNull();
    expect(parseCredentials({ email: "usuario@ejemplo.com" })).toBeNull();
    expect(
      parseCredentials({ email: "no-valido", password: "clave!12345" }),
    ).toBeNull();
    expect(
      parseCredentials({ email: "usuario@ejemplo.com", password: "" }),
    ).toBeNull();
  });
});

describe("parseRegistration", () => {
  it("exige la política de contraseña", () => {
    const payload = { email: "usuario@ejemplo.com", password: "SoloLetras123" };

    expect(parseRegistration(payload)).toBeNull();
    expect(parseRegistration({ ...payload, password: "MiClave!2026" })).toEqual(
      { email: "usuario@ejemplo.com", password: "MiClave!2026" },
    );
  });
});
