export type TimerMode = "focus" | "shortBreak" | "longBreak";

export type TimerStatus = "idle" | "running" | "paused";

export interface TimerDurations {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  remaining: number;
  completedFocusSessions: number;
  durations: TimerDurations;
}

export const DEFAULT_DURATIONS: TimerDurations = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const FOCUS_CYCLES_BEFORE_LONG_BREAK = 4;

export function createTimer(
  overrides: Partial<TimerDurations> = {},
): TimerState {
  const durations: TimerDurations = { ...DEFAULT_DURATIONS, ...overrides };
  return {
    mode: "focus",
    status: "idle",
    remaining: durations.focus,
    completedFocusSessions: 0,
    durations,
  };
}

export function start(state: TimerState): TimerState {
  if (state.status === "running") {
    return state;
  }
  return { ...state, status: "running" };
}

export function pause(state: TimerState): TimerState {
  if (state.status !== "running") {
    return state;
  }
  return { ...state, status: "paused" };
}

export function reset(state: TimerState): TimerState {
  return { ...state, status: "idle", remaining: state.durations[state.mode] };
}

function nextModeAfterFocus(completedFocusSessions: number): TimerMode {
  const isLongBreak =
    completedFocusSessions % FOCUS_CYCLES_BEFORE_LONG_BREAK === 0;
  return isLongBreak ? "longBreak" : "shortBreak";
}

function advance(state: TimerState): TimerState {
  if (state.mode !== "focus") {
    return {
      ...state,
      mode: "focus",
      status: "idle",
      remaining: state.durations.focus,
    };
  }
  const completedFocusSessions = state.completedFocusSessions + 1;
  const mode = nextModeAfterFocus(completedFocusSessions);
  return {
    ...state,
    mode,
    status: "idle",
    remaining: state.durations[mode],
    completedFocusSessions,
  };
}

export function tick(state: TimerState): TimerState {
  if (state.status !== "running") {
    return state;
  }
  if (state.remaining <= 1) {
    return advance(state);
  }
  return { ...state, remaining: state.remaining - 1 };
}

export function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
