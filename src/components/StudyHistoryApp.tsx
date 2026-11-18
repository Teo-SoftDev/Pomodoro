"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { resetResumeRequest, setResumeRequest } from "@/lib/resume-request";
import type { StudySession } from "@/lib/sessions";
import type { TimerDurations } from "@/lib/timer";
import StudyLog from "./StudyLog";
import StudyPageShell from "./StudyPageShell";

export interface StudyHistoryAppProps {
  userId: string;
  email: string;
  isLegacyOwner: boolean;
  durations?: Partial<TimerDurations>;
}

export default function StudyHistoryApp({
  userId,
  email,
  isLegacyOwner,
  durations,
}: StudyHistoryAppProps) {
  const data = useStudyData({ userId, isLegacyOwner, durations });
  const router = useRouter();

  useEffect(() => {
    resetResumeRequest();
  }, []);

  function handleResume(session: StudySession) {
    data.resumeSession(session.id);
    setResumeRequest(userId, {
      sessionId: session.id,
      subject: session.subject,
      remainingSeconds:
        session.remainingSeconds ?? session.durationMinutes * 60,
    });
    router.push("/");
  }

  return (
    <StudyPageShell
      email={email}
      active="history"
      title="Historial de estudio"
      description="Revisa tus sesiones y retoma las que dejaste en pausa."
    >
      <StudyLog
        id="historial-sesiones"
        sessions={data.sessions}
        subjects={data.subjects}
        onResumeSession={handleResume}
      />
    </StudyPageShell>
  );
}
