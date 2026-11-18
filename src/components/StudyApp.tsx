"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { clearPersistedResumeRequest } from "@/lib/resume-request";
import type { StudySession } from "@/lib/sessions";
import {
  getResumeRequestServerSnapshot,
  getResumeRequestSnapshot,
  loadResumeRequest,
  subscribeResumeRequest,
} from "@/lib/resume-request";
import type { TimerDurations } from "@/lib/timer";
import PomodoroTimer from "./PomodoroTimer";
import StudyPageShell from "./StudyPageShell";
import SubjectManager from "./SubjectManager";

export interface StudyAppProps {
  userId: string;
  email: string;
  isLegacyOwner: boolean;
  durations?: Partial<TimerDurations>;
}

export default function StudyApp({
  userId,
  email,
  isLegacyOwner,
  durations,
}: StudyAppProps) {
  const data = useStudyData({ userId, isLegacyOwner, durations });
  const pendingResume = useSyncExternalStore(
    subscribeResumeRequest,
    getResumeRequestSnapshot,
    getResumeRequestServerSnapshot,
  );

  useEffect(() => {
    loadResumeRequest(userId);
    clearPersistedResumeRequest(userId);
  }, [userId]);

  function handleSessionStart(session: StudySession) {
    data.startSession(session);
  }

  function handleSessionPause(sessionId: string, remainingSeconds: number) {
    data.pauseSession(sessionId, remainingSeconds);
  }

  function handleSessionDurationChange(
    sessionId: string,
    durationMinutes: number,
    remainingSeconds: number,
  ) {
    data.changeSessionDuration(sessionId, durationMinutes, remainingSeconds);
  }

  return (
    <StudyPageShell
      email={email}
      active="timer"
      title="Pomodoro de estudio"
      description="Enfócate por ciclos y administra tus materias."
    >
      <div className="mx-auto w-full max-w-3xl px-4">
        <PomodoroTimer
          key={pendingResume?.sessionId ?? "timer"}
          id="temporizador"
          subjects={data.subjects}
          durations={data.durations}
          resumeRequest={pendingResume ?? undefined}
          onFocusMinutesChange={data.changeFocusMinutes}
          onSessionStart={handleSessionStart}
          onSessionPause={handleSessionPause}
          onSessionResume={data.resumeSession}
          onSessionDurationChange={handleSessionDurationChange}
          onSessionComplete={data.completeSession}
        />
      </div>
      <SubjectManager
        id="materias"
        subjects={data.subjects}
        onAddSubject={data.addSubject}
        onRemoveSubject={data.removeSubject}
      />
    </StudyPageShell>
  );
}
