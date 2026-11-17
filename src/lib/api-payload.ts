import {
  isRecord,
  isStringArray,
  isUnknownArray,
  parseSession,
} from "./schema";
import type { StudySession } from "./sessions";

export function parseSessionPayload(value: unknown): StudySession | null {
  return parseSession(value);
}

export function parseSubjectsPayload(value: unknown): string[] | null {
  if (!isRecord(value)) {
    return null;
  }
  return isStringArray(value.subjects) ? value.subjects : null;
}

export function parseSessionsPayload(value: unknown): StudySession[] | null {
  if (!isRecord(value) || !isUnknownArray(value.sessions)) {
    return null;
  }
  const sessions: StudySession[] = [];
  for (const item of value.sessions) {
    const session = parseSession(item);
    if (!session) {
      return null;
    }
    sessions.push(session);
  }
  return sessions;
}
