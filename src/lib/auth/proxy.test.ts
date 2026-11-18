import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "./session-token";
import { proxy } from "../../../proxy";

describe("proxy", () => {
  it("redirige a /login cuando falta la cookie en una página", () => {
    const response = proxy(new NextRequest("http://localhost/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("redirige a /login cuando falta la cookie en /historial", () => {
    const response = proxy(new NextRequest("http://localhost/historial"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("devuelve 401 en APIs sin cookie", () => {
    const response = proxy(new NextRequest("http://localhost/api/sessions"));

    expect(response.status).toBe(401);
  });

  it("permite el paso con cookie de sesión", () => {
    const request = new NextRequest("http://localhost/");
    request.cookies.set(SESSION_COOKIE, "token-valido");

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
