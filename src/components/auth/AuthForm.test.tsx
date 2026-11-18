// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";
import AuthForm from "./AuthForm";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mockAction(result: AuthActionState) {
  return vi.fn(async (): Promise<AuthActionState> => result);
}

async function fillAndSubmit(): Promise<void> {
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Correo electrónico"),
    "usuario@ejemplo.com",
  );
  await user.type(screen.getByLabelText("Contraseña"), "MiClave!2026");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("AuthForm", () => {
  it("muestra el formulario de registro y su enlace de acceso", () => {
    render(<AuthForm mode="register" action={mockAction(initialAuthState)} />);

    expect(
      screen.getByRole("heading", { name: "Crear cuenta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mínimo 10 caracteres y al menos un símbolo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("muestra errores de validación del servidor", async () => {
    const action = mockAction({
      ...initialAuthState,
      error: "Revisa los campos del formulario.",
      fieldErrors: {
        password: "La contraseña debe incluir al menos un símbolo.",
      },
    });
    render(<AuthForm mode="register" action={action} />);
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "usuario@ejemplo.com",
    );
    await user.type(screen.getByLabelText("Contraseña"), "SoloLetras123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      await screen.findByText(
        "La contraseña debe incluir al menos un símbolo.",
      ),
    ).toBeInTheDocument();
  });

  it("muestra el error genérico y deshabilita el acceso durante el bloqueo", async () => {
    const action = mockAction({
      ...initialAuthState,
      error:
        "Demasiados intentos fallidos. Tu acceso está bloqueado temporalmente.",
      retryAfterSeconds: 900,
    });
    render(<AuthForm mode="login" action={action} />);

    await fillAndSubmit();

    expect(
      await screen.findByText(
        "Demasiados intentos fallidos. Tu acceso está bloqueado temporalmente.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Intenta de nuevo en 15:00.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = render(
      <AuthForm mode="login" action={mockAction(initialAuthState)} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
