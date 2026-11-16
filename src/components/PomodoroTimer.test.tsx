// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import PomodoroTimer from "./PomodoroTimer";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PomodoroTimer", () => {
  it("muestra el tiempo inicial y la fase de enfoque", () => {
    render(<PomodoroTimer />);

    expect(screen.getByText("25:00")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fase: Enfoque");
  });

  it("asocia una etiqueta al selector y lista las materias", () => {
    render(<PomodoroTimer subjects={["Matemáticas", "Física"]} />);

    expect(screen.getByLabelText("Materia")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Matemáticas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Física" })).toBeInTheDocument();
  });

  it("permite cambiar la materia seleccionada", async () => {
    const user = userEvent.setup();
    render(<PomodoroTimer subjects={["Matemáticas", "Física"]} />);

    const select = screen.getByLabelText("Materia");
    await user.selectOptions(select, "Física");

    expect(select).toHaveValue("Física");
  });

  it("inicia la cuenta atrás y alterna a pausar", () => {
    vi.useFakeTimers();
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("24:58")).toBeInTheDocument();
  });

  it("reinicia el temporizador al estado inicial", () => {
    vi.useFakeTimers();
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getByText("25:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar" })).toBeInTheDocument();
  });

  it("anuncia el cambio de fase en la región aria-live", () => {
    vi.useFakeTimers();
    render(<PomodoroTimer durations={{ focus: 1 }} />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Fase: Descanso corto");
  });

  it("notifica al completar una sesión de foco", () => {
    vi.useFakeTimers();
    const onSessionComplete = vi.fn();
    render(
      <PomodoroTimer
        durations={{ focus: 60 }}
        subjects={["Matemáticas"]}
        onSessionComplete={onSessionComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(onSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Matemáticas",
        mode: "focus",
        durationMinutes: 1,
      }),
    );
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = render(
      <PomodoroTimer subjects={["Matemáticas", "Física"]} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
