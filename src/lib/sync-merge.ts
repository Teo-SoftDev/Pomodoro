import type { StudySession } from "./sessions";

export function mergeSubjects(
  local: readonly string[],
  remote: readonly string[],
): string[] {
  const merged: string[] = [];
  for (const subject of [...remote, ...local]) {
    if (!merged.includes(subject)) {
      merged.push(subject);
    }
  }
  return merged;
}

export function mergeSessions(
  local: readonly StudySession[],
  remote: readonly StudySession[],
): StudySession[] {
  const byId = new Map<string, StudySession>();
  for (const session of remote) {
    byId.set(session.id, session);
  }
  for (const session of local) {
    byId.set(session.id, session);
  }
  return [...byId.values()].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
}
