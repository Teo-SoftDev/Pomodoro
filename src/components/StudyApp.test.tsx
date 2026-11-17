// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { durationsStore, sessionsStore, subjectsStore } from "@/lib/app-store";
import {
  loadDurations,
  loadSessions,
  loadSubjects,
  saveSubjects,
} from "@/lib/storage";
import StudyApp from "./StudyApp";

beforeEach(() => {
  window.localStorage.clear();
  subjectsStore.invalidate();
  sessionsStore.invalidate();
  durationsStore.invalidate();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
  durationsStore.invalidate();
});

describe("StudyApp", () => {
  it("usa landmarks, un único h1 y un enlace de salto", () => {
    render(<StudyApp />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toHaveAttribute("href", "#contenido");
  });

  it("ofrece navegación fija hacia el temporizador y el registro", () => {
    render(<StudyApp />);

    expect(
      screen.getByRole("navigation", { name: "Secciones principales" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Temporizador" })).toHaveAttribute(
      "href",
      "#temporizador",
    );
    expect(screen.getByRole("link", { name: "Registro" })).toHaveAttribute(
      "href",
      "#registro",
    );
  });

  it("es operable solo con teclado", async () => {
    const user = userEvent.setup();
    render(<StudyApp />);

    await user.tab();
    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Temporizador" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Registro" })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText("Minutos de enfoque")).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText("Materia")).toHaveFocus();

    await user.tab();
    const startButton = screen.getByRole("button", { name: "Iniciar" });
    expect(startButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });

  it("registra la sesión al iniciar, la completa al terminar y actualiza las estadísticas", () => {
    saveSubjects(["Matemáticas"]);
    subjectsStore.invalidate();
    vi.useFakeTimers();
    render(<StudyApp durations={{ focus: 60 }} />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(loadSessions()).toHaveLength(1);
    expect(loadSessions()[0]?.status).toBe("in-progress");

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    const summary = screen.getByRole("region", {
      name: "Resumen por materia",
    });
    expect(within(summary).getByText("Matemáticas")).toBeInTheDocument();
    expect(within(summary).getByText("1 minuto")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("Matemáticas"),
    ).toBeInTheDocument();
    expect(loadSessions()).toHaveLength(1);
    expect(loadSessions()[0]?.status).toBe("completed");
  });

  it("guarda la sesión como en pausa y la reanuda desde el historial", () => {
    saveSubjects(["Matemáticas"]);
    subjectsStore.invalidate();
    vi.useFakeTimers();
    render(<StudyApp durations={{ focus: 60 }} />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));

    expect(loadSessions()[0]).toEqual(
      expect.objectContaining({ status: "paused", remainingSeconds: 40 }),
    );

    const focusInput = screen.getByLabelText("Minutos de enfoque");
    fireEvent.change(focusInput, { target: { value: "2" } });
    fireEvent.blur(focusInput);

    expect(loadSessions()[0]).toEqual(
      expect.objectContaining({
        status: "paused",
        durationMinutes: 2,
        remainingSeconds: 120,
      }),
    );
    expect(loadDurations().focus).toBe(120);

    const table = screen.getByRole("table");
    expect(within(table).getByText("En pausa")).toBeInTheDocument();

    fireEvent.click(
      within(table).getByRole("button", {
        name: "Reanudar sesión de Matemáticas",
      }),
    );

    expect(loadSessions()[0]?.status).toBe("in-progress");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    expect(screen.getByText("02:00")).toBeInTheDocument();
  });

  it("persiste los minutos de enfoque elegidos", () => {
    render(<StudyApp />);

    const input = screen.getByLabelText("Minutos de enfoque");
    fireEvent.change(input, { target: { value: "40" } });
    fireEvent.blur(input);

    expect(loadDurations().focus).toBe(2400);
    expect(durationsStore.getSnapshot().focus).toBe(2400);
    expect(screen.getByText("40:00")).toBeInTheDocument();
  });

  it("comparte las materias entre el temporizador y el registro", async () => {
    saveSubjects(["Matemáticas"]);
    subjectsStore.invalidate();
    const user = userEvent.setup();
    render(<StudyApp />);

    await user.type(screen.getByLabelText("Nueva materia"), "Química");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    const subjectSelect = screen.getByLabelText("Materia");
    expect(
      within(subjectSelect).getByRole("option", { name: "Química" }),
    ).toBeInTheDocument();
    expect(loadSubjects()).toContain("Química");
  });

  it("elimina una materia y la quita del temporizador", async () => {
    saveSubjects(["Matemáticas", "Física"]);
    subjectsStore.invalidate();
    const user = userEvent.setup();
    render(<StudyApp />);

    await user.click(screen.getByRole("button", { name: "Eliminar Física" }));

    const subjectSelect = screen.getByLabelText("Materia");
    expect(
      within(subjectSelect).queryByRole("option", { name: "Física" }),
    ).toBeNull();
    expect(loadSubjects()).not.toContain("Física");
  });

  it("no tiene violaciones de accesibilidad", async () => {
    saveSubjects(["Matemáticas"]);
    subjectsStore.invalidate();
    const { container } = render(<StudyApp />);

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
