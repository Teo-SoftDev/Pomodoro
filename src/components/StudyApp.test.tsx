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
import { createUserStorage, saveSessions } from "@/lib/storage";
import StudyApp from "./StudyApp";

const USER_ID = "test-user";
const userStorage = createUserStorage(USER_ID);

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("pomodoro.legacyMigrated.v1", "1");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("StudyApp", () => {
  it("usa landmarks, un único h1 y un enlace de salto", () => {
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toHaveAttribute("href", "#contenido");
  });

  it("no importa el historial legacy en una cuenta que no es dueña", () => {
    window.localStorage.removeItem("pomodoro.legacyMigrated.v1");
    window.localStorage.setItem("pomodoro.user-2.legacyMigrated.v1", "1");
    saveSessions([
      {
        id: "legacy-1",
        subject: "Historia",
        durationMinutes: 25,
        mode: "focus",
        completedAt: "2026-11-16T09:00:00.000Z",
      },
    ]);

    render(
      <StudyApp
        userId="user-2"
        email="otra@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    expect(screen.getByText("No hay sesiones registradas")).toBeInTheDocument();
    expect(screen.queryByText("Historia")).toBeNull();
  });

  it("ofrece navegación fija hacia el temporizador y el registro", () => {
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

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
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    await user.tab();
    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Temporizador" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Registro" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toHaveFocus();

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
    userStorage.saveSubjects(["Matemáticas"]);
    vi.useFakeTimers();
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
        durations={{ focus: 60 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(userStorage.loadSessions()).toHaveLength(1);
    expect(userStorage.loadSessions()[0]?.status).toBe("in-progress");

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
    expect(userStorage.loadSessions()).toHaveLength(1);
    expect(userStorage.loadSessions()[0]?.status).toBe("completed");
  });

  it("guarda la sesión como en pausa y la reanuda desde el historial", () => {
    userStorage.saveSubjects(["Matemáticas"]);
    vi.useFakeTimers();
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
        durations={{ focus: 60 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));

    expect(userStorage.loadSessions()[0]).toEqual(
      expect.objectContaining({ status: "paused", remainingSeconds: 40 }),
    );

    const focusInput = screen.getByLabelText("Minutos de enfoque");
    fireEvent.change(focusInput, { target: { value: "2" } });
    fireEvent.blur(focusInput);

    expect(userStorage.loadSessions()[0]).toEqual(
      expect.objectContaining({
        status: "paused",
        durationMinutes: 2,
        remainingSeconds: 120,
      }),
    );
    expect(userStorage.loadDurations().focus).toBe(120);

    const table = screen.getByRole("table");
    expect(within(table).getByText("En pausa")).toBeInTheDocument();

    fireEvent.click(
      within(table).getByRole("button", {
        name: "Reanudar sesión de Matemáticas",
      }),
    );

    expect(userStorage.loadSessions()[0]?.status).toBe("in-progress");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    expect(screen.getByText("02:00")).toBeInTheDocument();
  });

  it("persiste los minutos de enfoque elegidos", () => {
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    const input = screen.getByLabelText("Minutos de enfoque");
    fireEvent.change(input, { target: { value: "40" } });
    fireEvent.blur(input);

    expect(userStorage.loadDurations().focus).toBe(2400);
    expect(screen.getByText("40:00")).toBeInTheDocument();
  });

  it("comparte las materias entre el temporizador y el registro", async () => {
    userStorage.saveSubjects(["Matemáticas"]);
    const user = userEvent.setup();
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    await user.type(screen.getByLabelText("Nueva materia"), "Química");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    const subjectSelect = screen.getByLabelText("Materia");
    expect(
      within(subjectSelect).getByRole("option", { name: "Química" }),
    ).toBeInTheDocument();
    expect(userStorage.loadSubjects()).toContain("Química");
  });

  it("elimina una materia y la quita del temporizador", async () => {
    userStorage.saveSubjects(["Matemáticas", "Física"]);
    const user = userEvent.setup();
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar Física" }));

    const subjectSelect = screen.getByLabelText("Materia");
    expect(
      within(subjectSelect).queryByRole("option", { name: "Física" }),
    ).toBeNull();
    expect(userStorage.loadSubjects()).not.toContain("Física");
  });

  it("no tiene violaciones de accesibilidad", async () => {
    userStorage.saveSubjects(["Matemáticas"]);
    const { container } = render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
