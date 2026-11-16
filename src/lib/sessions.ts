export type SessionMode = "focus" | "break";

export interface StudySession {
  id: string;
  subject: string;
  durationMinutes: number;
  mode: SessionMode;
  completedAt: string;
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
    .reduce((total, session) => total + session.durationMinutes, 0);
}

export function completedPomodoros(sessions: readonly StudySession[]): number {
  return sessions.filter((session) => session.mode === "focus").length;
}

export function statsBySubject(
  sessions: readonly StudySession[],
): SubjectStats[] {
  const stats = new Map<string, SubjectStats>();
  for (const session of sessions) {
    if (session.mode !== "focus") {
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
