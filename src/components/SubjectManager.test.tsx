// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import SubjectManager from "./SubjectManager";

afterEach(cleanup);

describe("SubjectManager", () => {
  it("permite agregar una materia con el valor recortado", async () => {
    const user = userEvent.setup();
    const onAddSubject = vi.fn();
    const onRemoveSubject = vi.fn();
    render(
      <SubjectManager
        subjects={["Matemáticas"]}
        onAddSubject={onAddSubject}
        onRemoveSubject={onRemoveSubject}
      />,
    );

    await user.type(screen.getByLabelText("Nueva materia"), "  Química  ");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onAddSubject).toHaveBeenCalledWith("Química");
  });

  it("no agrega materias vacías ni duplicadas", async () => {
    const user = userEvent.setup();
    const onAddSubject = vi.fn();
    const onRemoveSubject = vi.fn();
    render(
      <SubjectManager
        subjects={["Matemáticas"]}
        onAddSubject={onAddSubject}
        onRemoveSubject={onRemoveSubject}
      />,
    );

    const input = screen.getByLabelText("Nueva materia");
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    await user.clear(input);
    await user.type(input, "Matemáticas");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onAddSubject).not.toHaveBeenCalled();
  });

  it("permite eliminar una materia", async () => {
    const user = userEvent.setup();
    const onAddSubject = vi.fn();
    const onRemoveSubject = vi.fn();
    render(
      <SubjectManager
        subjects={["Matemáticas", "Física"]}
        onAddSubject={onAddSubject}
        onRemoveSubject={onRemoveSubject}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar Física" }));

    expect(onRemoveSubject).toHaveBeenCalledWith("Física");
  });

  it("muestra un estado vacío accesible", () => {
    render(
      <SubjectManager
        subjects={[]}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay materias registradas."),
    ).toBeInTheDocument();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = render(
      <SubjectManager
        subjects={["Matemáticas"]}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
      />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
