import { describe, expect, it } from "vitest";
import { formatDuration, formatSessionDate } from "./format";

describe("formatSessionDate", () => {
  it("formatea una fecha ISO en UTC de forma legible", () => {
    const result = formatSessionDate("2026-11-16T10:00:00.000Z");

    expect(result).toContain("2026");
    expect(result).toContain("10:00");
    expect(result).not.toContain("T");
  });

  it("devuelve cadena vacía ante una fecha inválida", () => {
    expect(formatSessionDate("no-es-una-fecha")).toBe("");
  });
});

describe("formatDuration", () => {
  it("formatea solo minutos", () => {
    expect(formatDuration(25)).toBe("25 minutos");
  });

  it("formatea horas y minutos", () => {
    expect(formatDuration(90)).toBe("1 hora 30 minutos");
  });

  it("formatea horas exactas sin minutos", () => {
    expect(formatDuration(120)).toBe("2 horas");
  });

  it("normaliza valores negativos a cero", () => {
    expect(formatDuration(-5)).toBe("0 minutos");
  });
});
