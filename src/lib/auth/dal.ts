import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteAuthSession, findAuthSession, findUserById } from "./auth-store";
import {
  hashSessionToken,
  isAuthSessionExpired,
  SESSION_COOKIE,
} from "./session-token";
import { toAuthUser, type AuthUser } from "./user";

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const tokenHash = hashSessionToken(token);
  const session = await findAuthSession(tokenHash);
  if (!session || isAuthSessionExpired(session)) {
    if (session) {
      await deleteAuthSession(tokenHash);
    }
    return null;
  }
  const user = await findUserById(session.userId);
  return user ? toAuthUser(user) : null;
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireApiUser(): Promise<AuthUser | null> {
  return getAuthUser();
}
