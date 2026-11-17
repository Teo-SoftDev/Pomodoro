import { describe, expect, it } from "vitest";
import {
  DEFAULT_DURATIONS,
  FOCUS_CYCLES_BEFORE_LONG_BREAK,
  createTimer,
  formatTime,
  pause,
  reset,
  resumeTimer,
  start,
  tick,
  updateDurations,
  type TimerState,
} from "./timer";

function completeCurrentInterval(state: TimerState): TimerState {
  let current = start(state);
  while (current.status === "running") {
    current = tick(current);
  }
  return current;
}

describe("createTimer", () => {
  it("crea un temporizador por defecto en modo focus", () => {
    const timer = createTimer();

    expect(timer.mode).toBe("focus");
    expect(timer.status).toBe("idle");
    expect(timer.remaining).toBe(DEFAULT_DURATIONS.focus);
    expect(timer.completedFocusSessions).toBe(0);
  });

  it("define las duraciones por defecto en segundos", () => {
    expect(DEFAULT_DURATIONS).toEqual({
      focus: 1500,
      shortBreak: 300,
      longBreak: 900,
    });
  });

  it("fusiona duraciones personalizadas con los valores por defecto", () => {
    const timer = createTimer({ focus: 60 });

    expect(timer.durations).toEqual({
      focus: 60,
      shortBreak: 300,
      longBreak: 900,
    });
    expect(timer.remaining).toBe(60);
  });
});

describe("start", () => {
  it("pasa de idle a running", () => {
    const timer = start(createTimer());

    expect(timer.status).toBe("running");
    expect(timer.remaining).toBe(DEFAULT_DURATIONS.focus);
  });

  it("reanuda desde paused", () => {
    const paused = pause(start(createTimer()));
    const resumed = start(paused);

    expect(resumed.status).toBe("running");
  });

  it("no cambia si ya está running", () => {
    const running = start(createTimer());

    expect(start(running)).toEqual(running);
  });
});

describe("pause", () => {
  it("pasa de running a paused", () => {
    const paused = pause(start(createTimer()));

    expect(paused.status).toBe("paused");
  });

  it("no cambia si está idle", () => {
    const idle = createTimer();

    expect(pause(idle)).toEqual(idle);
  });

  it("no cambia si ya está paused", () => {
    const paused = pause(start(createTimer()));

    expect(pause(paused)).toEqual(paused);
  });
});

describe("reset", () => {
  it("vuelve a idle con la duración completa del modo actual", () => {
    const running = start(createTimer({ focus: 10 }));
    const advanced = tick(tick(running));
    const reseted = reset(advanced);

    expect(reseted.status).toBe("idle");
    expect(reseted.mode).toBe("focus");
    expect(reseted.remaining).toBe(10);
  });

  it("conserva los ciclos de foco completados", () => {
    const durations = { focus: 1, shortBreak: 1, longBreak: 1 };
    const afterFocus = completeCurrentInterval(createTimer(durations));
    const reseted = reset(afterFocus);

    expect(reseted.completedFocusSessions).toBe(1);
    expect(reseted.mode).toBe("shortBreak");
    expect(reseted.remaining).toBe(1);
    expect(reseted.status).toBe("idle");
  });
});

describe("resumeTimer", () => {
  it("crea un temporizador en marcha con el tiempo restante indicado", () => {
    const timer = resumeTimer(42, { focus: 60 });

    expect(timer.status).toBe("running");
    expect(timer.mode).toBe("focus");
    expect(timer.remaining).toBe(42);
    expect(timer.durations.focus).toBe(60);
  });

  it("normaliza el tiempo restante a segundos enteros positivos", () => {
    expect(resumeTimer(-10).remaining).toBe(1);
    expect(resumeTimer(12.9).remaining).toBe(12);
  });
});

describe("updateDurations", () => {
  it("actualiza la duración y el tiempo restante cuando está idle", () => {
    const updated = updateDurations(createTimer(), { focus: 300 });

    expect(updated.durations.focus).toBe(300);
    expect(updated.remaining).toBe(300);
    expect(updated.status).toBe("idle");
  });

  it("no altera el tiempo restante si el temporizador corre", () => {
    const running = tick(start(createTimer({ focus: 100 })));
    const updated = updateDurations(running, { focus: 600 });

    expect(updated.durations.focus).toBe(600);
    expect(updated.remaining).toBe(99);
  });

  it("devuelve el mismo estado si las duraciones no cambian", () => {
    const timer = createTimer();

    expect(updateDurations(timer, { focus: timer.durations.focus })).toBe(
      timer,
    );
  });
});

describe("tick", () => {
  it("no avanza si no está running", () => {
    const idle = createTimer();

    expect(tick(idle)).toEqual(idle);
  });

  it("resta un segundo mientras está running", () => {
    const running = start(createTimer({ focus: 10 }));

    expect(tick(running).remaining).toBe(9);
  });

  it("pasa a shortBreak al completar un foco", () => {
    const durations = { focus: 2, shortBreak: 5, longBreak: 9 };
    const completed = completeCurrentInterval(createTimer(durations));

    expect(completed.mode).toBe("shortBreak");
    expect(completed.remaining).toBe(5);
    expect(completed.completedFocusSessions).toBe(1);
    expect(completed.status).toBe("idle");
  });

  it("pasa a longBreak al completar el cuarto ciclo de foco", () => {
    const durations = { focus: 1, shortBreak: 1, longBreak: 7 };
    let state = createTimer(durations);

    for (let cycle = 1; cycle <= FOCUS_CYCLES_BEFORE_LONG_BREAK; cycle += 1) {
      state = completeCurrentInterval(state);
      if (cycle < FOCUS_CYCLES_BEFORE_LONG_BREAK) {
        expect(state.mode).toBe("shortBreak");
        state = completeCurrentInterval(state);
        expect(state.mode).toBe("focus");
      }
    }

    expect(state.mode).toBe("longBreak");
    expect(state.remaining).toBe(7);
    expect(state.completedFocusSessions).toBe(FOCUS_CYCLES_BEFORE_LONG_BREAK);
  });

  it("vuelve a longBreak en el octavo ciclo de foco", () => {
    const durations = { focus: 1, shortBreak: 1, longBreak: 1 };
    let state = createTimer(durations);

    for (let cycle = 1; cycle <= 8; cycle += 1) {
      state = completeCurrentInterval(state);
      if (state.mode !== "longBreak") {
        state = completeCurrentInterval(state);
      }
    }

    expect(state.mode).toBe("longBreak");
    expect(state.completedFocusSessions).toBe(8);
  });

  it("vuelve a focus al completar un descanso", () => {
    const durations = { focus: 1, shortBreak: 1, longBreak: 1 };
    const onBreak = completeCurrentInterval(createTimer(durations));
    const backToFocus = completeCurrentInterval(onBreak);

    expect(backToFocus.mode).toBe("focus");
    expect(backToFocus.remaining).toBe(1);
    expect(backToFocus.completedFocusSessions).toBe(1);
  });

  it("no baja de cero al llegar al final del intervalo", () => {
    const running = start(createTimer({ focus: 1 }));
    const completed = tick(running);

    expect(completed.remaining).toBeGreaterThanOrEqual(0);
  });

  it("usa las duraciones personalizadas para el siguiente intervalo", () => {
    const durations = { focus: 1, shortBreak: 42, longBreak: 90 };
    const completed = completeCurrentInterval(createTimer(durations));

    expect(completed.remaining).toBe(42);
  });
});

describe("formatTime", () => {
  it("formatea los segundos como MM:SS", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(1500)).toBe("25:00");
    expect(formatTime(900)).toBe("15:00");
    expect(formatTime(3600)).toBe("60:00");
    expect(formatTime(5999)).toBe("99:59");
  });

  it("recorta los valores negativos a cero", () => {
    expect(formatTime(-5)).toBe("00:00");
  });
});

describe("pureza", () => {
  it("no muta el estado de entrada", () => {
    const frozen: Readonly<TimerState> = Object.freeze(
      createTimer({ focus: 10 }),
    );
    const snapshot = { ...frozen };

    start(frozen);
    pause(frozen);
    reset(frozen);
    tick(frozen);
    formatTime(frozen.remaining);

    expect(frozen).toEqual(snapshot);
  });
});
