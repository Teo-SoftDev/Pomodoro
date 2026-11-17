import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { parseFirebaseAdminConfig } from "./firebase-config";

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) {
    return cachedApp;
  }
  const existing = getApps()[0];
  cachedApp =
    existing ??
    initializeApp({ credential: cert(parseFirebaseAdminConfig(process.env)) });
  return cachedApp;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}
