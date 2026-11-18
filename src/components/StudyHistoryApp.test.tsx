// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getResumeRequestSnapshot,
  resetResumeRequest,
} from "@/lib/resume-request";
import { createUserStorage, saveSessions } from "@/lib/storage";
import StudyHistoryApp from "./StudyHistoryApp";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

const USER_ID = "test-user";
const userStorage = createUserStorage(USER_ID);

beforeEach(() => {
  mocks.push.mockClear();
  resetResumeRequest();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("pomodoro.legacyMigrated.v1", "1");
});

afterEach(() => {
  cleanup();
  resetResumeRequest();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("StudyHistoryApp", () => {
  it("usa landmarks, un único h1 y marca el historial como ruta activa", () => {
    render(
      <StudyHistoryApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Temporizador" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute(
      "aria-current",
      "page",
    );
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
      <StudyHistoryApp
        userId="user-2"
        email="otra@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    expect(screen.getByText("No hay sesiones registradas")).toBeInTheDocument();
    expect(screen.queryByText("Historia")).toBeNull();
  });

  it("guarda la solicitud de reanudación y vuelve al temporizador", async () => {
    const user = userEvent.setup();
    userStorage.saveSessions([
      {
        id: "paused-1",
        subject: "Matemáticas",
        durationMinutes: 25,
        mode: "focus",
        completedAt: "2026-11-16T10:00:00.000Z",
        status: "paused",
        remainingSeconds: 300,
      },
    ]);

    render(
      <StudyHistoryApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    const table = screen.getByRole("table");
    await user.click(
      within(table).getByRole("button", {
        name: "Reanudar sesión de Matemáticas",
      }),
    );

    expect(userStorage.loadSessions()[0]?.status).toBe("in-progress");
    expect(getResumeRequestSnapshot()).toEqual({
      sessionId: "paused-1",
      subject: "Matemáticas",
      remainingSeconds: 300,
    });
    expect(mocks.push).toHaveBeenCalledWith("/");
  });

  it("no muestra el administrador de materias en el historial", () => {
    render(
      <StudyHistoryApp
        userId={USER_ID}
        email="usuario@ejemplo.com"
        isLegacyOwner={false}
      />,
    );

    expect(screen.queryByLabelText("Nueva materia")).toBeNull();
    expect(screen.queryByRole("button", { name: "Agregar" })).toBeNull();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    userStorage.saveSubjects(["Matemáticas"]);
    const { container } = render(
      <StudyHistoryApp
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
