import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseUserRecord, toAuthUser } from "./user";

describe("parseUserRecord", () => {
  const valid = {
    email: "usuario@ejemplo.com",
    passwordHash: "scrypt$hash",
    createdAt: "2026-11-17T00:00:00.000Z",
  };

  it("devuelve el registro con el id del documento", () => {
    expect(parseUserRecord(valid, "user-1")).toEqual({
      id: "user-1",
      ...valid,
    });
  });

  it("rechaza documentos incompletos", () => {
    expect(parseUserRecord(null, "user-1")).toBeNull();
    expect(parseUserRecord({ ...valid, email: 1 }, "user-1")).toBeNull();
    expect(parseUserRecord({ email: valid.email }, "user-1")).toBeNull();
  });
});

describe("toAuthUser", () => {
  it("no expone el hash de la contraseña", () => {
    const user = {
      id: "user-1",
      email: "usuario@ejemplo.com",
      passwordHash: "scrypt$hash",
      createdAt: "2026-11-17T00:00:00.000Z",
    };

    expect(toAuthUser(user)).toEqual({
      id: "user-1",
      email: "usuario@ejemplo.com",
    });
  });
});

describe("emailKey", () => {
  it("deriva un identificador estable sin exponer el correo", async () => {
    const { emailKey } = await import("./validation");
    const expected = createHash("sha256")
      .update("usuario@ejemplo.com")
      .digest("hex");

    expect(emailKey(" USUARIO@ejemplo.com ")).toBe(expected);
  });
});
