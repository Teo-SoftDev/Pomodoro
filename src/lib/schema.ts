import type { SessionMode, StudySession } from "./sessions";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isSessionMode(value: unknown): value is SessionMode {
  return value === "focus" || value === "break";
}

export function parseSession(value: unknown, id?: string): StudySession | null {
  if (!isRecord(value)) {
    return null;
  }
  const {
    subject,
    durationMinutes,
    mode,
    completedAt,
    status,
    remainingSeconds,
  } = value;
  const sessionId = id ?? value.id;
  if (
    typeof sessionId !== "string" ||
    typeof subject !== "string" ||
    typeof durationMinutes !== "number" ||
    !isSessionMode(mode) ||
    typeof completedAt !== "string"
  ) {
    return null;
  }
  if (
    status !== undefined &&
    status !== "in-progress" &&
    status !== "paused" &&
    status !== "completed"
  ) {
    return null;
  }
  if (
    remainingSeconds !== undefined &&
    (typeof remainingSeconds !== "number" ||
      !Number.isFinite(remainingSeconds) ||
      remainingSeconds < 0)
  ) {
    return null;
  }
  const session: StudySession = {
    id: sessionId,
    subject,
    durationMinutes,
    mode,
    completedAt,
  };
  if (status !== undefined) {
    session.status = status;
  }
  if (remainingSeconds !== undefined) {
    session.remainingSeconds = remainingSeconds;
  }
  return session;
}

export function isStudySession(value: unknown): value is StudySession {
  return parseSession(value) !== null;
}

export function isStringArray(value: unknown): value is string[] {
  return (
    isUnknownArray(value) && value.every((item) => typeof item === "string")
  );
}

export function isSessionArray(value: unknown): value is StudySession[] {
  return isUnknownArray(value) && value.every(isStudySession);
}
