import { cookies } from "next/headers";
import { deleteAuthSession } from "./auth-store";
import { sessionDays } from "./config";
import { hashSessionToken, SESSION_COOKIE } from "./session-token";

const SECONDS_PER_DAY = 24 * 60 * 60;

interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

function cookieOptions(maxAge: number): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(
    SESSION_COOKIE,
    token,
    cookieOptions(sessionDays() * SECONDS_PER_DAY),
  );
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", cookieOptions(0));
}

export async function revokeCurrentSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteAuthSession(hashSessionToken(token));
  }
  await clearSessionCookie();
}
