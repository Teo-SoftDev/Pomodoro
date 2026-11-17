import { getAdminFirestore } from "./firebase-admin";
import {
  CONFIG_COLLECTION,
  SESSION_COLLECTION,
  SUBJECTS_DOCUMENT,
  documentToSession,
  documentToSubjects,
  sessionToDocument,
  subjectsToDocument,
} from "./firestore-mapping";
import type { StudySession } from "./sessions";

export async function pingFirestore(): Promise<void> {
  await getAdminFirestore()
    .collection(CONFIG_COLLECTION)
    .doc(SUBJECTS_DOCUMENT)
    .get();
}

export async function listSessions(): Promise<StudySession[]> {
  const snapshot = await getAdminFirestore()
    .collection(SESSION_COLLECTION)
    .get();
  const sessions: StudySession[] = [];
  for (const document of snapshot.docs) {
    const session = documentToSession(document.id, document.data());
    if (session) {
      sessions.push(session);
    }
  }
  return sessions.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export async function saveSession(session: StudySession): Promise<void> {
  await getAdminFirestore()
    .collection(SESSION_COLLECTION)
    .doc(session.id)
    .set(sessionToDocument(session));
}

export async function deleteSession(id: string): Promise<boolean> {
  const reference = getAdminFirestore().collection(SESSION_COLLECTION).doc(id);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    return false;
  }
  await reference.delete();
  return true;
}

export async function readSubjects(): Promise<string[]> {
  const snapshot = await getAdminFirestore()
    .collection(CONFIG_COLLECTION)
    .doc(SUBJECTS_DOCUMENT)
    .get();
  return documentToSubjects(snapshot.data());
}

export async function writeSubjects(
  subjects: readonly string[],
): Promise<void> {
  await getAdminFirestore()
    .collection(CONFIG_COLLECTION)
    .doc(SUBJECTS_DOCUMENT)
    .set(subjectsToDocument(subjects));
}
