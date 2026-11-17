// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDuration, formatSessionDate } from "@/lib/format";
import type { StudySession } from "@/lib/sessions";
import StudyLog from "./StudyLog";

afterEach(cleanup);

function focusSession(
  subject: string,
  minutes: number,
  completedAt: string,
  status?: StudySession["status"],
): StudySession {
  return {
    id: `${subject}-${completedAt}`,
    subject,
    durationMinutes: minutes,
    mode: "focus",
    completedAt,
    status,
  };
}

describe("StudyLog", () => {
  it("resume minutos y pomodoros por materia sin usar tabla", () => {
    render(
      <StudyLog
        sessions={[
          focusSession("Matemáticas", 60, "2026-11-16T10:00:00.000Z"),
          focusSession("Matemáticas", 30, "2026-11-16T11:00:00.000Z"),
        ]}
      />,
    );

    const summary = screen.getByRole("region", {
      name: "Resumen por materia",
    });
    expect(within(summary).queryByRole("table")).toBeNull();
    expect(within(summary).getByText("Matemáticas")).toBeInTheDocument();
    expect(within(summary).getByText(formatDuration(90))).toBeInTheDocument();
  });

  it("muestra el historial en una tabla semántica con la fecha formateada", () => {
    render(
      <StudyLog
        sessions={[focusSession("Física", 25, "2026-11-16T10:00:00.000Z")]}
      />,
    );

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Materia" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Fecha" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Duración" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(formatSessionDate("2026-11-16T10:00:00.000Z")),
    ).toBeInTheDocument();
  });

  it("muestra el estado y no suma las sesiones en curso al resumen", () => {
    render(
      <StudyLog
        sessions={[
          focusSession(
            "Matemáticas",
            25,
            "2026-11-16T10:00:00.000Z",
            "completed",
          ),
          focusSession(
            "Matemáticas",
            50,
            "2026-11-16T11:00:00.000Z",
            "in-progress",
          ),
          focusSession("Matemáticas", 30, "2026-11-16T12:00:00.000Z", "paused"),
        ]}
      />,
    );

    const summary = screen.getByRole("region", {
      name: "Resumen por materia",
    });
    expect(within(summary).getByText(formatDuration(25))).toBeInTheDocument();
    expect(within(summary).queryByText(formatDuration(75))).toBeNull();

    const table = screen.getByRole("table");
    expect(within(table).getByText("En curso")).toBeInTheDocument();
    expect(within(table).getByText("En pausa")).toBeInTheDocument();
    expect(within(table).getByText("Completada")).toBeInTheDocument();
  });

  it("permite reanudar una sesión en pausa desde el historial", async () => {
    const user = userEvent.setup();
    const onResumeSession = vi.fn();
    const paused: StudySession = {
      ...focusSession("Matemáticas", 25, "2026-11-16T10:00:00.000Z", "paused"),
      remainingSeconds: 300,
    };
    render(<StudyLog sessions={[paused]} onResumeSession={onResumeSession} />);

    const table = screen.getByRole("table");
    await user.click(
      within(table).getByRole("button", {
        name: "Reanudar sesión de Matemáticas",
      }),
    );

    expect(onResumeSession).toHaveBeenCalledWith(paused);
  });

  it("ordena el historial de más reciente a más antiguo", () => {
    render(
      <StudyLog
        sessions={[
          focusSession("Antigua", 25, "2026-11-15T10:00:00.000Z"),
          focusSession("Reciente", 25, "2026-11-16T10:00:00.000Z"),
        ]}
      />,
    );

    const headers = within(screen.getByRole("table")).getAllByRole("rowheader");
    expect(headers.map((cell) => cell.textContent)).toEqual([
      "Reciente",
      "Antigua",
    ]);
  });

  it("filtra el historial por materia de forma accesible", async () => {
    const user = userEvent.setup();
    render(
      <StudyLog
        subjects={["Matemáticas", "Física"]}
        sessions={[
          focusSession("Matemáticas", 25, "2026-11-16T10:00:00.000Z"),
          focusSession("Física", 25, "2026-11-16T11:00:00.000Z"),
        ]}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Filtrar por materia"),
      "Física",
    );

    const table = screen.getByRole("table");
    expect(within(table).queryByText("Matemáticas")).toBeNull();
    expect(within(table).getByText("Física")).toBeInTheDocument();
  });

  it("permite agregar una materia con el valor recortado", async () => {
    const user = userEvent.setup();
    const onAddSubject = vi.fn();
    render(<StudyLog subjects={["Matemáticas"]} onAddSubject={onAddSubject} />);

    await user.type(screen.getByLabelText("Nueva materia"), "  Química  ");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onAddSubject).toHaveBeenCalledWith("Química");
  });

  it("permite eliminar una materia", async () => {
    const user = userEvent.setup();
    const onRemoveSubject = vi.fn();
    render(
      <StudyLog
        subjects={["Matemáticas", "Física"]}
        onRemoveSubject={onRemoveSubject}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar Física" }));

    expect(onRemoveSubject).toHaveBeenCalledWith("Física");
  });

  it("muestra un estado vacío sin tabla cuando no hay sesiones", () => {
    render(<StudyLog />);

    expect(screen.getByText("No hay sesiones registradas")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = render(
      <StudyLog
        subjects={["Matemáticas", "Física"]}
        sessions={[focusSession("Matemáticas", 25, "2026-11-16T10:00:00.000Z")]}
      />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
