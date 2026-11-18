import { isRecord, isStringArray, parseSession } from "./schema";
import type { StudySession } from "./sessions";

export const SESSION_COLLECTION = "sessions";
export const CONFIG_COLLECTION = "config";
export const SUBJECTS_DOCUMENT = "subjects";
export const USERS_COLLECTION = "users";

export function userSessionsPath(userId: string): string {
  return `${USERS_COLLECTION}/${userId}/${SESSION_COLLECTION}`;
}

export function userConfigPath(userId: string): string {
  return `${USERS_COLLECTION}/${userId}/${CONFIG_COLLECTION}`;
}

export function sessionToDocument(
  session: StudySession,
): Record<string, unknown> {
  const document: Record<string, unknown> = {
    id: session.id,
    subject: session.subject,
    durationMinutes: session.durationMinutes,
    mode: session.mode,
    completedAt: session.completedAt,
  };
  if (session.status) {
    document.status = session.status;
  }
  if (session.remainingSeconds !== undefined) {
    document.remainingSeconds = session.remainingSeconds;
  }
  return document;
}

export function documentToSession(
  id: string,
  data: unknown,
): StudySession | null {
  return parseSession(data, id);
}

export function subjectsToDocument(
  subjects: readonly string[],
): Record<string, unknown> {
  return { items: [...subjects] };
}

export function documentToSubjects(data: unknown): string[] {
  if (!isRecord(data)) {
    return [];
  }
  return isStringArray(data.items) ? data.items : [];
}
