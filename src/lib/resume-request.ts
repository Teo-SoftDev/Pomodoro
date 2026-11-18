import { isRecord } from "./schema";

export interface TimerResumeRequest {
  sessionId: string;
  subject: string;
  remainingSeconds: number;
}

let current: TimerResumeRequest | null = null;
const listeners = new Set<() => void>();

function storageKey(userId: string): string {
  return `pomodoro.${userId}.resumeRequest.v1`;
}

function parseResumeRequest(value: unknown): TimerResumeRequest | null {
  if (!isRecord(value)) {
    return null;
  }
  const { sessionId, subject, remainingSeconds } = value;
  if (
    typeof sessionId !== "string" ||
    sessionId.length === 0 ||
    typeof subject !== "string" ||
    subject.length === 0 ||
    typeof remainingSeconds !== "number" ||
    !Number.isFinite(remainingSeconds) ||
    remainingSeconds < 0
  ) {
    return null;
  }
  return { sessionId, subject, remainingSeconds };
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeResumeRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getResumeRequestSnapshot(): TimerResumeRequest | null {
  return current;
}

export function getResumeRequestServerSnapshot(): null {
  return null;
}

export function setResumeRequest(
  userId: string,
  request: TimerResumeRequest,
): void {
  current = request;
  try {
    getSessionStorage()?.setItem(storageKey(userId), JSON.stringify(request));
  } catch {
    current = request;
  }
  emit();
}

export function loadResumeRequest(userId: string): void {
  let stored: string | null = null;
  try {
    stored = getSessionStorage()?.getItem(storageKey(userId)) ?? null;
  } catch {
    return;
  }
  if (stored === null) {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return;
  }
  const request = parseResumeRequest(parsed);
  if (request === null) {
    return;
  }
  current = request;
  emit();
}

export function clearPersistedResumeRequest(userId: string): void {
  try {
    getSessionStorage()?.removeItem(storageKey(userId));
  } catch {
    return;
  }
}

export function resetResumeRequest(): void {
  current = null;
  emit();
}
