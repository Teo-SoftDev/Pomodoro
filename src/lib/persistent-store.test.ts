import { describe, expect, it, vi } from "vitest";
import { createPersistentStore } from "./persistent-store";

describe("createPersistentStore", () => {
  it("lee el valor inicial una sola vez", () => {
    const read = vi.fn(() => ["a"]);
    const store = createPersistentStore<string[]>(read, () => {}, []);

    expect(store.getSnapshot()).toEqual(["a"]);
    expect(store.getSnapshot()).toEqual(["a"]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("devuelve el snapshot del servidor", () => {
    const store = createPersistentStore<string[]>(
      () => ["a"],
      () => {},
      [],
    );

    expect(store.getServerSnapshot()).toEqual([]);
  });

  it("persiste y notifica a los suscriptores al escribir", () => {
    const write = vi.fn();
    const store = createPersistentStore<string[]>(() => [], write, []);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(["b"]);

    expect(write).toHaveBeenCalledWith(["b"]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual(["b"]);

    unsubscribe();
    store.set(["c"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("invalida la caché y vuelve a leer", () => {
    let value = ["a"];
    const read = vi.fn(() => value);
    const store = createPersistentStore<string[]>(read, () => {}, []);

    expect(store.getSnapshot()).toEqual(["a"]);

    value = ["b"];
    store.invalidate();

    expect(store.getSnapshot()).toEqual(["b"]);
  });
});
