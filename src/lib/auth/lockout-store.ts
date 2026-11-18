import { getAdminFirestore } from "../firebase-admin";
import { lockMinutes } from "./config";
import { ipKey, readIpSecret } from "./ip";
import {
  nextAttemptState,
  parseAttemptState,
  type AttemptState,
} from "./lockout";
import { emailKey } from "./validation";

const ATTEMPTS_COLLECTION = "loginAttempts";

export interface FailedAttemptResult {
  account: AttemptState;
  ip: AttemptState;
}

function accountId(email: string): string {
  return `account_${emailKey(email)}`;
}

function ipId(ip: string): string {
  return `ip_${ipKey(ip, readIpSecret())}`;
}

async function readAttempt(id: string): Promise<AttemptState | null> {
  const snapshot = await getAdminFirestore()
    .collection(ATTEMPTS_COLLECTION)
    .doc(id)
    .get();
  if (!snapshot.exists) {
    return null;
  }
  return parseAttemptState(snapshot.data());
}

export function readAccountAttempts(
  email: string,
): Promise<AttemptState | null> {
  return readAttempt(accountId(email));
}

export function readIpAttempts(ip: string): Promise<AttemptState | null> {
  return readAttempt(ipId(ip));
}

export async function registerFailedAttempts(
  email: string,
  ip: string,
  now: Date = new Date(),
): Promise<FailedAttemptResult> {
  const firestore = getAdminFirestore();
  const accountRef = firestore
    .collection(ATTEMPTS_COLLECTION)
    .doc(accountId(email));
  const ipRef = firestore.collection(ATTEMPTS_COLLECTION).doc(ipId(ip));

  return firestore.runTransaction(async (transaction) => {
    const [accountSnapshot, ipSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(ipRef),
    ]);
    const account = nextAttemptState(
      parseAttemptState(accountSnapshot.data()),
      now,
      lockMinutes(),
    );
    const ipAttempt = nextAttemptState(
      parseAttemptState(ipSnapshot.data()),
      now,
      lockMinutes(),
    );
    transaction.set(accountRef, account);
    transaction.set(ipRef, ipAttempt);
    return { account, ip: ipAttempt };
  });
}

export async function clearAttempts(email: string, ip: string): Promise<void> {
  const firestore = getAdminFirestore();
  const batch = firestore.batch();
  batch.delete(firestore.collection(ATTEMPTS_COLLECTION).doc(accountId(email)));
  batch.delete(firestore.collection(ATTEMPTS_COLLECTION).doc(ipId(ip)));
  await batch.commit();
}
