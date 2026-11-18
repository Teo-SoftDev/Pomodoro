// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPersistedResumeRequest,
  getResumeRequestSnapshot,
  loadResumeRequest,
  resetResumeRequest,
  setResumeRequest,
  subscribeResumeRequest,
} from "./resume-request";

const USER_ID = "test-user";
const request = {
  sessionId: "paused-1",
  subject: "Matemáticas",
  remainingSeconds: 300,
};

beforeEach(() => {
  resetResumeRequest();
  window.sessionStorage.clear();
});

describe("resume-request", () => {
  it("persiste la solicitud y la recupera tras recargar", () => {
    setResumeRequest(USER_ID, request);
    resetResumeRequest();

    loadResumeRequest(USER_ID);

    expect(getResumeRequestSnapshot()).toEqual(request);
  });

  it("limpia sessionStorage sin perder la solicitud activa", () => {
    setResumeRequest(USER_ID, request);

    clearPersistedResumeRequest(USER_ID);

    expect(getResumeRequestSnapshot()).toEqual(request);
    expect(
      window.sessionStorage.getItem(`pomodoro.${USER_ID}.resumeRequest.v1`),
    ).toBeNull();

    resetResumeRequest();
    expect(getResumeRequestSnapshot()).toBeNull();
  });

  it("ignora datos corruptos o inválidos", () => {
    const key = `pomodoro.${USER_ID}.resumeRequest.v1`;
    window.sessionStorage.setItem(key, "{no-json");
    loadResumeRequest(USER_ID);
    expect(getResumeRequestSnapshot()).toBeNull();

    window.sessionStorage.setItem(
      key,
      JSON.stringify({ ...request, remainingSeconds: -1 }),
    );
    loadResumeRequest(USER_ID);
    expect(getResumeRequestSnapshot()).toBeNull();
  });

  it("notifica a los suscriptores hasta que se dan de baja", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeResumeRequest(listener);

    setResumeRequest(USER_ID, request);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setResumeRequest(USER_ID, request);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
