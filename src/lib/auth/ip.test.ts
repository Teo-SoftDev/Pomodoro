import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, ipKey, readIpSecret } from "./ip";

describe("readIpSecret", () => {
  it("exige una clave configurada", () => {
    expect(() => readIpSecret({})).toThrow(
      "AUTH_IP_HASH_SECRET no está configurado.",
    );
    expect(readIpSecret({ AUTH_IP_HASH_SECRET: "secreto" })).toBe("secreto");
  });
});

describe("ipKey", () => {
  it("genera un HMAC estable y no reversible", () => {
    const expected = createHmac("sha256", "secreto")
      .update("192.168.1.10")
      .digest("hex");

    expect(ipKey("192.168.1.10", "secreto")).toBe(expected);
    expect(ipKey("192.168.1.10", "otro-secreto")).not.toBe(expected);
  });
});

describe("clientIpFromHeaders", () => {
  it("usa la primera IP de X-Forwarded-For", () => {
    expect(clientIpFromHeaders(" 203.0.113.5, 10.0.0.1 ", "10.0.0.1")).toBe(
      "203.0.113.5",
    );
  });

  it("usa X-Real-IP o un valor genérico como último recurso", () => {
    expect(clientIpFromHeaders(null, " 198.51.100.2 ")).toBe("198.51.100.2");
    expect(clientIpFromHeaders(null, null)).toBe("unknown");
  });
});
