import { describe, expect, it } from "vitest";
import {
  FirebaseConfigError,
  normalizePrivateKey,
  parseFirebaseAdminConfig,
} from "./firebase-config";

const PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\\nMIIEabc\\n-----END PRIVATE KEY-----\\n";

describe("normalizePrivateKey", () => {
  it("convierte los saltos de línea escapados", () => {
    expect(normalizePrivateKey(PRIVATE_KEY)).toContain(
      "-----BEGIN PRIVATE KEY-----\nMIIEabc",
    );
  });

  it("recorta espacios sobrantes", () => {
    expect(normalizePrivateKey("  clave  ")).toBe("clave");
  });
});

describe("parseFirebaseAdminConfig", () => {
  it("lee las credenciales y normaliza la clave", () => {
    const config = parseFirebaseAdminConfig({
      PROJECT_ID: "pomodoro-e794c",
      CLIENT_EMAIL: "cuenta@pomodoro-e794c.iam.gserviceaccount.com",
      PRIVATE_KEY,
    });

    expect(config.projectId).toBe("pomodoro-e794c");
    expect(config.clientEmail).toBe(
      "cuenta@pomodoro-e794c.iam.gserviceaccount.com",
    );
    expect(config.privateKey).not.toContain("\\n");
  });

  it("recorta espacios de cada variable", () => {
    const config = parseFirebaseAdminConfig({
      PROJECT_ID: "  proyecto  ",
      CLIENT_EMAIL: " correo@example.com ",
      PRIVATE_KEY: `  ${PRIVATE_KEY}  `,
    });

    expect(config.projectId).toBe("proyecto");
    expect(config.clientEmail).toBe("correo@example.com");
  });

  it("informa todas las variables ausentes", () => {
    try {
      parseFirebaseAdminConfig({});
      expect.unreachable("debió lanzar un error");
    } catch (error) {
      if (!(error instanceof FirebaseConfigError)) {
        throw error;
      }
      expect(error.missing).toEqual([
        "PROJECT_ID",
        "CLIENT_EMAIL",
        "PRIVATE_KEY",
      ]);
      expect(error.message).toContain("PROJECT_ID");
    }
  });

  it("trata los valores vacíos como ausentes", () => {
    try {
      parseFirebaseAdminConfig({
        PROJECT_ID: "   ",
        CLIENT_EMAIL: "",
        PRIVATE_KEY: PRIVATE_KEY,
      });
      expect.unreachable("debió lanzar un error");
    } catch (error) {
      if (!(error instanceof FirebaseConfigError)) {
        throw error;
      }
      expect(error.missing).toEqual(["PROJECT_ID", "CLIENT_EMAIL"]);
    }
  });

  it("rechaza una clave privada que no es PEM", () => {
    try {
      parseFirebaseAdminConfig({
        PROJECT_ID: "proyecto",
        CLIENT_EMAIL: "correo@example.com",
        PRIVATE_KEY: "no-es-una-clave",
      });
      expect.unreachable("debió lanzar un error");
    } catch (error) {
      if (!(error instanceof FirebaseConfigError)) {
        throw error;
      }
      expect(error.missing).toEqual(["PRIVATE_KEY"]);
    }
  });
});
