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
import type { StudySession } from "@/lib/sessions";
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

  it("registra la sesión como en curso al iniciar y la completa al terminar", () => {
    vi.useFakeTimers();
    let startedId = "";
    const onSessionStart = vi.fn((session: StudySession) => {
      startedId = session.id;
    });
    const onSessionComplete = vi.fn();
    render(
      <PomodoroTimer
        durations={{ focus: 60 }}
        subjects={["Matemáticas"]}
        onSessionStart={onSessionStart}
        onSessionComplete={onSessionComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));

    expect(onSessionStart).toHaveBeenCalledTimes(1);
    expect(onSessionStart).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Matemáticas",
        mode: "focus",
        durationMinutes: 1,
        status: "in-progress",
      }),
    );
    expect(onSessionComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(onSessionComplete).toHaveBeenCalledWith(startedId);
  });

  it("no duplica la sesión al reanudar después de una pausa", () => {
    vi.useFakeTimers();
    const onSessionStart = vi.fn();
    render(<PomodoroTimer onSessionStart={onSessionStart} />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));

    expect(onSessionStart).toHaveBeenCalledTimes(1);
  });

  it("guarda el tiempo restante al pausar y avisa al reanudar", () => {
    vi.useFakeTimers();
    let startedId = "";
    const onSessionStart = vi.fn((session: StudySession) => {
      startedId = session.id;
    });
    const onSessionPause = vi.fn();
    const onSessionResume = vi.fn();
    render(
      <PomodoroTimer
        onSessionStart={onSessionStart}
        onSessionPause={onSessionPause}
        onSessionResume={onSessionResume}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));

    expect(onSessionPause).toHaveBeenCalledWith(startedId, 1498);
    expect(screen.getByText("24:58")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));

    expect(onSessionResume).toHaveBeenCalledWith(startedId);
  });

  it("permite cambiar el tiempo en pausa y reanudar con el nuevo valor", () => {
    vi.useFakeTimers();
    let startedId = "";
    const onSessionStart = vi.fn((session: StudySession) => {
      startedId = session.id;
    });
    const onSessionDurationChange = vi.fn();
    render(
      <PomodoroTimer
        durations={{ focus: 60 }}
        onSessionStart={onSessionStart}
        onSessionDurationChange={onSessionDurationChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));

    const input = screen.getByLabelText("Minutos de enfoque");
    expect(input).toBeEnabled();

    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.blur(input);

    expect(screen.getByText("02:00")).toBeInTheDocument();
    expect(onSessionDurationChange).toHaveBeenCalledWith(startedId, 2, 120);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("01:58")).toBeInTheDocument();
  });

  it("retoma una sesión pausada con su tiempo restante y sin duplicarla", () => {
    vi.useFakeTimers();
    const onSessionStart = vi.fn();
    const onSessionComplete = vi.fn();
    render(
      <PomodoroTimer
        durations={{ focus: 60 }}
        subjects={["Matemáticas"]}
        resumeRequest={{
          sessionId: "s1",
          subject: "Matemáticas",
          remainingSeconds: 30,
        }}
        onSessionStart={onSessionStart}
        onSessionComplete={onSessionComplete}
      />,
    );

    expect(screen.getByText("00:30")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(onSessionStart).not.toHaveBeenCalled();
    expect(onSessionComplete).toHaveBeenCalledWith("s1");
  });

  it("usa la primera materia disponible cuando la selección no es válida", () => {
    vi.useFakeTimers();
    const onSessionStart = vi.fn();
    const { rerender } = render(
      <PomodoroTimer
        durations={{ focus: 60 }}
        subjects={[]}
        onSessionStart={onSessionStart}
      />,
    );

    rerender(
      <PomodoroTimer
        durations={{ focus: 60 }}
        subjects={["Física"]}
        onSessionStart={onSessionStart}
      />,
    );

    expect(screen.getByLabelText("Materia")).toHaveValue("Física");

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));

    expect(onSessionStart).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Física" }),
    );
  });

  it("permite ajustar los minutos de enfoque cuando está detenido", () => {
    const onFocusMinutesChange = vi.fn();
    render(<PomodoroTimer onFocusMinutesChange={onFocusMinutesChange} />);

    const input = screen.getByLabelText("Minutos de enfoque");
    expect(input).toHaveValue(25);

    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.blur(input);

    expect(onFocusMinutesChange).toHaveBeenCalledWith(5);
    expect(screen.getByText("05:00")).toBeInTheDocument();
  });

  it("limita los minutos de enfoque al rango permitido", () => {
    const onFocusMinutesChange = vi.fn();
    render(<PomodoroTimer onFocusMinutesChange={onFocusMinutesChange} />);

    const input = screen.getByLabelText("Minutos de enfoque");
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.blur(input);

    expect(onFocusMinutesChange).toHaveBeenCalledWith(180);
    expect(input).toHaveValue(180);
  });

  it("bloquea los minutos de enfoque mientras el temporizador corre", () => {
    vi.useFakeTimers();
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));

    expect(screen.getByLabelText("Minutos de enfoque")).toBeDisabled();
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
