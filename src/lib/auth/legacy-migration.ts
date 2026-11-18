import { getAdminFirestore } from "../firebase-admin";
import {
  CONFIG_COLLECTION,
  SESSION_COLLECTION,
  SUBJECTS_DOCUMENT,
  documentToSession,
  documentToSubjects,
  sessionToDocument,
  subjectsToDocument,
  userConfigPath,
  userSessionsPath,
} from "../firestore-mapping";

const MIGRATIONS_COLLECTION = "migrations";
const LEGACY_CLAIM_DOCUMENT = "legacyClaim";

export async function readLegacyClaimOwner(): Promise<string | null> {
  try {
    const snapshot = await getAdminFirestore()
      .collection(MIGRATIONS_COLLECTION)
      .doc(LEGACY_CLAIM_DOCUMENT)
      .get();
    const owner = snapshot.data()?.claimedBy;
    return typeof owner === "string" && owner.trim().length > 0 ? owner : null;
  } catch {
    return null;
  }
}

export async function claimLegacyData(userId: string): Promise<void> {
  const firestore = getAdminFirestore();
  const [subjectsSnapshot, sessionsSnapshot] = await Promise.all([
    firestore.collection(CONFIG_COLLECTION).doc(SUBJECTS_DOCUMENT).get(),
    firestore.collection(SESSION_COLLECTION).get(),
  ]);

  await firestore.runTransaction(async (transaction) => {
    const marker = firestore
      .collection(MIGRATIONS_COLLECTION)
      .doc(LEGACY_CLAIM_DOCUMENT);
    const snapshot = await transaction.get(marker);
    if (snapshot.exists) {
      return;
    }
    transaction.set(marker, {
      claimedBy: userId,
      claimedAt: new Date().toISOString(),
    });

    const subjects = documentToSubjects(subjectsSnapshot.data());
    if (subjects.length > 0) {
      transaction.set(
        firestore.collection(userConfigPath(userId)).doc(SUBJECTS_DOCUMENT),
        subjectsToDocument(subjects),
      );
    }

    for (const document of sessionsSnapshot.docs) {
      const session = documentToSession(document.id, document.data());
      if (session) {
        transaction.set(
          firestore.collection(userSessionsPath(userId)).doc(session.id),
          sessionToDocument(session),
        );
      }
    }
  });
}
