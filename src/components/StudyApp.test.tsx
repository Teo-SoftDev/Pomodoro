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
import {
  getResumeRequestSnapshot,
  resetResumeRequest,
  setResumeRequest,
} from "@/lib/resume-request";
import { createUserStorage } from "@/lib/storage";
import StudyApp from "./StudyApp";

const USER_ID = "test-user";
const userStorage = createUserStorage(USER_ID);

beforeEach(() => {
  resetResumeRequest();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("pomodoro.legacyMigrated.v1", "1");
});

afterEach(() => {
  cleanup();
  resetResumeRequest();
  vi.useRealTimers();
  window.localStorage.clear();
  window.sessionStorage.clear();
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

  it("enlaza el temporizador con esta ruta y el historial con /historial", () => {
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
      "/",
    );
    expect(screen.getByRole("link", { name: "Temporizador" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute(
      "href",
      "/historial",
    );
  });

  it("no muestra el historial en la pantalla del temporizador", () => {
    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Resumen por materia")).toBeNull();
    expect(screen.queryByText("Filtrar por materia")).toBeNull();
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
    expect(screen.getByRole("link", { name: "Historial" })).toHaveFocus();

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

  it("registra y completa la sesión sin mostrar el historial", () => {
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

    expect(userStorage.loadSessions()).toHaveLength(1);
    expect(userStorage.loadSessions()[0]?.status).toBe("completed");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("consume la solicitud de reanudación guardada por el historial", () => {
    userStorage.saveSubjects(["Matemáticas"]);
    setResumeRequest(USER_ID, {
      sessionId: "paused-1",
      subject: "Matemáticas",
      remainingSeconds: 120,
    });

    render(
      <StudyApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
        durations={{ focus: 60 }}
      />,
    );

    expect(screen.getByText("02:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    expect(getResumeRequestSnapshot()).toEqual({
      sessionId: "paused-1",
      subject: "Matemáticas",
      remainingSeconds: 120,
    });
    expect(
      window.sessionStorage.getItem(`pomodoro.${USER_ID}.resumeRequest.v1`),
    ).toBeNull();
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

  it("comparte las materias entre el temporizador y el administrador", async () => {
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
