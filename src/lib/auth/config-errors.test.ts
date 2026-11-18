import { describe, expect, it } from "vitest";
import { isAuthConfigurationError } from "./config-errors";
import { MISSING_IP_SECRET_ERROR } from "./ip";

describe("isAuthConfigurationError", () => {
  it("detecta la falta del secreto de IP", () => {
    expect(isAuthConfigurationError(new Error(MISSING_IP_SECRET_ERROR))).toBe(
      true,
    );
  });

  it("no oculta otros errores", () => {
    expect(isAuthConfigurationError(new Error("Firestore no disponible"))).toBe(
      false,
    );
    expect(isAuthConfigurationError("texto")).toBe(false);
  });
});
