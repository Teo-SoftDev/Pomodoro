import { parseSessionsPayload, parseSubjectsPayload } from "./api-payload";
import type { StudySession } from "./sessions";

export interface RemoteState {
  subjects: string[];
  sessions: StudySession[];
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function pullRemoteState(
  signal?: AbortSignal,
): Promise<RemoteState | null> {
  if (typeof fetch !== "function") {
    return null;
  }
  try {
    const [subjectsResponse, sessionsResponse] = await Promise.all([
      fetch("/api/subjects", { signal, cache: "no-store" }),
      fetch("/api/sessions", { signal, cache: "no-store" }),
    ]);
    if (!subjectsResponse.ok || !sessionsResponse.ok) {
      return null;
    }
    const subjects = parseSubjectsPayload(await readJson(subjectsResponse));
    const sessions = parseSessionsPayload(await readJson(sessionsResponse));
    if (!subjects || !sessions) {
      return null;
    }
    return { subjects, sessions };
  } catch {
    return null;
  }
}

async function sendJson(
  url: string,
  method: "POST" | "PUT",
  body: unknown,
): Promise<boolean> {
  if (typeof fetch !== "function") {
    return false;
  }
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function pushSession(session: StudySession): Promise<boolean> {
  return sendJson("/api/sessions", "POST", session);
}

export function replaceSubjects(subjects: readonly string[]): Promise<boolean> {
  return sendJson("/api/subjects", "PUT", { subjects });
}
