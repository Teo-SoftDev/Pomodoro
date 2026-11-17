export type SessionMode = "focus" | "break";

export type SessionStatus = "in-progress" | "paused" | "completed";

export interface StudySession {
  id: string;
  subject: string;
  durationMinutes: number;
  mode: SessionMode;
  completedAt: string;
  status?: SessionStatus;
  remainingSeconds?: number;
}

export interface SubjectStats {
  subject: string;
  totalMinutes: number;
  pomodoros: number;
}

export function createSession(input: StudySession): StudySession {
  return { ...input, subject: input.subject.trim() };
}

export function addSession(
  sessions: readonly StudySession[],
  session: StudySession,
): StudySession[] {
  return [...sessions, session];
}

export function isSessionInProgress(session: StudySession): boolean {
  return session.status === "in-progress";
}

export function isSessionCompleted(session: StudySession): boolean {
  return session.status === undefined || session.status === "completed";
}

export function pauseSession(
  sessions: readonly StudySession[],
  id: string,
  remainingSeconds: number,
): StudySession[] {
  return sessions.map((session) =>
    session.id === id
      ? {
          ...session,
          status: "paused",
          remainingSeconds: Math.max(0, Math.floor(remainingSeconds)),
        }
      : session,
  );
}

export function resumeSession(
  sessions: readonly StudySession[],
  id: string,
): StudySession[] {
  return sessions.map((session) =>
    session.id === id ? { ...session, status: "in-progress" } : session,
  );
}

export function updateSessionDuration(
  sessions: readonly StudySession[],
  id: string,
  durationMinutes: number,
  remainingSeconds: number,
): StudySession[] {
  return sessions.map((session) =>
    session.id === id
      ? {
          ...session,
          durationMinutes,
          remainingSeconds: Math.max(0, Math.floor(remainingSeconds)),
        }
      : session,
  );
}

export function completeSession(
  sessions: readonly StudySession[],
  id: string,
): StudySession[] {
  return sessions.map((session) =>
    session.id === id ? { ...session, status: "completed" } : session,
  );
}

export function filterBySubject(
  sessions: readonly StudySession[],
  subject: string,
): StudySession[] {
  const target = subject.trim();
  return sessions.filter((session) => session.subject === target);
}

export function filterByDate(
  sessions: readonly StudySession[],
  isoDate: string,
): StudySession[] {
  return sessions.filter(
    (session) => session.completedAt.slice(0, 10) === isoDate,
  );
}

export function totalMinutes(sessions: readonly StudySession[]): number {
  return sessions
    .filter((session) => session.mode === "focus")
    .filter(isSessionCompleted)
    .reduce((total, session) => total + session.durationMinutes, 0);
}

export function completedPomodoros(sessions: readonly StudySession[]): number {
  return sessions
    .filter((session) => session.mode === "focus")
    .filter(isSessionCompleted).length;
}

export function statsBySubject(
  sessions: readonly StudySession[],
): SubjectStats[] {
  const stats = new Map<string, SubjectStats>();
  for (const session of sessions) {
    if (session.mode !== "focus" || !isSessionCompleted(session)) {
      continue;
    }
    const current = stats.get(session.subject);
    if (current) {
      current.totalMinutes += session.durationMinutes;
      current.pomodoros += 1;
      continue;
    }
    stats.set(session.subject, {
      subject: session.subject,
      totalMinutes: session.durationMinutes,
      pomodoros: 1,
    });
  }
  return [...stats.values()];
}
