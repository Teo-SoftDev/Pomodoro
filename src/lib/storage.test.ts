import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudySession } from "./sessions";
import {
  DEFAULT_STATE,
  clearAll,
  clearSessions,
  createUserStorage,
  loadDurations,
  loadSessions,
  loadSubjects,
  migrateLegacyLocalStorage,
  saveDurations,
  saveSessions,
  saveSubjects,
} from "./storage";
import { DEFAULT_DURATIONS } from "./timer";

const SUBJECTS_KEY = "pomodoro.subjects.v1";
const DURATIONS_KEY = "pomodoro.durations.v1";
const SESSIONS_KEY = "pomodoro.sessions.v1";

class FakeStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const sampleSession: StudySession = {
  id: "s1",
  subject: "Matemáticas",
  durationMinutes: 25,
  mode: "focus",
  completedAt: "2026-11-16T09:00:00.000Z",
};

describe("SSR", () => {
  it("expone un estado por defecto limpio", () => {
    expect(DEFAULT_STATE).toEqual({
      subjects: [],
      durations: DEFAULT_DURATIONS,
      sessions: [],
    });
  });

  it("devuelve los valores por defecto sin window", () => {
    expect(loadSubjects()).toEqual([]);
    expect(loadDurations()).toEqual(DEFAULT_DURATIONS);
    expect(loadSessions()).toEqual([]);
  });

  it("no lanza al guardar o limpiar sin window", () => {
    expect(() => {
      saveSubjects(["Historia"]);
      saveDurations(DEFAULT_DURATIONS);
      saveSessions([sampleSession]);
      clearSessions();
      clearAll();
    }).not.toThrow();
  });
});

describe("detección de window", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa window.localStorage cuando está disponible", () => {
    const fake = new FakeStorage();
    vi.stubGlobal("window", { localStorage: fake });

    saveSubjects(["Historia"]);

    expect(fake.getItem(SUBJECTS_KEY)).toBe(JSON.stringify(["Historia"]));
  });
});

describe("round-trip", () => {
  it("guarda y lee la lista de materias", () => {
    const storage = new FakeStorage();

    saveSubjects(["Matemáticas", "Física"], storage);

    expect(loadSubjects(storage)).toEqual(["Matemáticas", "Física"]);
  });

  it("guarda y lee la configuración de tiempos", () => {
    const storage = new FakeStorage();
    const durations = { focus: 1, shortBreak: 2, longBreak: 3 };

    saveDurations(durations, storage);

    expect(loadDurations(storage)).toEqual(durations);
  });

  it("guarda y lee el historial de sesiones", () => {
    const storage = new FakeStorage();

    saveSessions([sampleSession], storage);

    expect(loadSessions(storage)).toEqual([sampleSession]);
  });
});

describe("datos corruptos", () => {
  it("devuelve los valores por defecto si el JSON es inválido", () => {
    const storage = new FakeStorage();
    storage.setItem(SUBJECTS_KEY, "{ no es json");
    storage.setItem(DURATIONS_KEY, "{ no es json");
    storage.setItem(SESSIONS_KEY, "{ no es json");

    expect(loadSubjects(storage)).toEqual([]);
    expect(loadDurations(storage)).toEqual(DEFAULT_DURATIONS);
    expect(loadSessions(storage)).toEqual([]);
  });

  it("devuelve los valores por defecto si la forma es inválida", () => {
    const storage = new FakeStorage();
    storage.setItem(SUBJECTS_KEY, JSON.stringify([1, 2, 3]));
    storage.setItem(DURATIONS_KEY, JSON.stringify({ focus: "25" }));
    storage.setItem(SESSIONS_KEY, JSON.stringify([{ id: 1 }]));

    expect(loadSubjects(storage)).toEqual([]);
    expect(loadDurations(storage)).toEqual(DEFAULT_DURATIONS);
    expect(loadSessions(storage)).toEqual([]);
  });

  it("rechaza valores que no son objetos", () => {
    const storage = new FakeStorage();
    storage.setItem(DURATIONS_KEY, JSON.stringify(42));
    storage.setItem(SESSIONS_KEY, JSON.stringify([42]));

    expect(loadDurations(storage)).toEqual(DEFAULT_DURATIONS);
    expect(loadSessions(storage)).toEqual([]);
  });

  it("rechaza sesiones con un modo desconocido", () => {
    const storage = new FakeStorage();
    storage.setItem(
      SESSIONS_KEY,
      JSON.stringify([{ ...sampleSession, mode: "rest" }]),
    );

    expect(loadSessions(storage)).toEqual([]);
  });

  it("rechaza sesiones a las que les falta completedAt", () => {
    const storage = new FakeStorage();
    storage.setItem(
      SESSIONS_KEY,
      JSON.stringify([
        { id: "a", subject: "x", durationMinutes: 1, mode: "focus" },
      ]),
    );

    expect(loadSessions(storage)).toEqual([]);
  });
});

describe("clearSessions", () => {
  it("elimina solo las sesiones y conserva el resto", () => {
    const storage = new FakeStorage();
    saveSubjects(["Matemáticas"], storage);
    saveDurations(DEFAULT_DURATIONS, storage);
    saveSessions([sampleSession], storage);

    clearSessions(storage);

    expect(loadSessions(storage)).toEqual([]);
    expect(loadSubjects(storage)).toEqual(["Matemáticas"]);
    expect(loadDurations(storage)).toEqual(DEFAULT_DURATIONS);
  });
});

describe("clearAll", () => {
  it("elimina los tres bloques", () => {
    const storage = new FakeStorage();
    saveSubjects(["Matemáticas"], storage);
    saveDurations(DEFAULT_DURATIONS, storage);
    saveSessions([sampleSession], storage);

    clearAll(storage);

    expect(storage.getItem(SUBJECTS_KEY)).toBeNull();
    expect(storage.getItem(DURATIONS_KEY)).toBeNull();
    expect(storage.getItem(SESSIONS_KEY)).toBeNull();
  });
});

describe("storage por usuario", () => {
  it("usa claves distintas para cada usuario", () => {
    const storage = new FakeStorage();
    const first = createUserStorage("user-1");
    const second = createUserStorage("user-2");

    first.saveSubjects(["Matemáticas"], storage);
    second.saveSubjects(["Física"], storage);

    expect(storage.getItem("pomodoro.user-1.subjects.v1")).toBe(
      JSON.stringify(["Matemáticas"]),
    );
    expect(storage.getItem("pomodoro.user-2.subjects.v1")).toBe(
      JSON.stringify(["Física"]),
    );
    expect(first.loadSubjects(storage)).toEqual(["Matemáticas"]);
    expect(second.loadSubjects(storage)).toEqual(["Física"]);
  });

  it("migra los datos legacy del dueño una sola vez", () => {
    const storage = new FakeStorage();
    saveSubjects(["Historia"], storage);
    saveSessions([sampleSession], storage);
    const userStorage = createUserStorage("user-1");

    migrateLegacyLocalStorage("user-1", true, storage);
    expect(userStorage.loadSubjects(storage)).toEqual(["Historia"]);
    expect(userStorage.loadSessions(storage)).toEqual([sampleSession]);
    expect(storage.getItem("pomodoro.legacyMigrated.v1")).toBe("1");

    userStorage.saveSubjects(["Física"], storage);
    migrateLegacyLocalStorage("user-1", true, storage);
    expect(userStorage.loadSubjects(storage)).toEqual(["Física"]);
  });

  it("no migra datos legacy a cuentas que no son dueñas", () => {
    const storage = new FakeStorage();
    saveSubjects(["Historia"], storage);
    saveSessions([sampleSession], storage);
    const userStorage = createUserStorage("user-2");

    migrateLegacyLocalStorage("user-2", false, storage);

    expect(userStorage.loadSubjects(storage)).toEqual([]);
    expect(userStorage.loadSessions(storage)).toEqual([]);
    expect(storage.getItem("pomodoro.legacyMigrated.v1")).toBeNull();
  });

  it("elimina copias legacy previas de cuentas que no son dueñas", () => {
    const storage = new FakeStorage();
    saveSubjects(["Historia"], storage);
    saveSessions([sampleSession], storage);
    const userStorage = createUserStorage("user-2");
    userStorage.saveSubjects(["Historia", "Química"], storage);
    userStorage.saveSessions(
      [sampleSession, { ...sampleSession, id: "s2", subject: "Química" }],
      storage,
    );
    storage.setItem("pomodoro.user-2.legacyMigrated.v1", "1");

    migrateLegacyLocalStorage("user-2", false, storage);

    expect(userStorage.loadSubjects(storage)).toEqual(["Química"]);
    expect(
      userStorage.loadSessions(storage).map((session) => session.id),
    ).toEqual(["s2"]);
    expect(storage.getItem("pomodoro.user-2.legacyMigrated.v1")).toBeNull();
  });

  it("no sobrescribe los datos del dueño al migrar en otro navegador", () => {
    const storage = new FakeStorage();
    saveSubjects(["Historia"], storage);
    const userStorage = createUserStorage("user-1");
    userStorage.saveSubjects(["Física"], storage);

    migrateLegacyLocalStorage("user-1", true, storage);

    expect(userStorage.loadSubjects(storage)).toEqual(["Física"]);
    expect(storage.getItem("pomodoro.legacyMigrated.v1")).toBe("1");
  });

  it("no hace nada sin almacenamiento disponible", () => {
    expect(() => migrateLegacyLocalStorage("user-1", true, null)).not.toThrow();
  });
});
