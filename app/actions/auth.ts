"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";
import { authenticate, registerUser } from "@/lib/auth/auth-service";
import { isAuthConfigurationError } from "@/lib/auth/config-errors";
import { clientIpFromHeaders } from "@/lib/auth/ip";
import { revokeCurrentSession, setSessionCookie } from "@/lib/auth/session";
import { authDependencies } from "@/lib/auth/server-dependencies";
import {
  parseCredentials,
  parseRegistration,
  registrationFieldErrors,
} from "@/lib/auth/validation";

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function currentIp(): Promise<string> {
  const requestHeaders = await headers();
  return clientIpFromHeaders(
    requestHeaders.get("x-forwarded-for"),
    requestHeaders.get("x-real-ip"),
  );
}

export async function registerAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const state: AuthActionState = { ...initialAuthState, email };
  const fieldErrors = registrationFieldErrors(email, password);
  const credentials = parseRegistration({ email, password });

  if (!credentials || Object.keys(fieldErrors).length > 0) {
    return {
      ...state,
      error: "Revisa los campos del formulario.",
      fieldErrors,
    };
  }

  const result = await registerUser(credentials, authDependencies);
  if (!result.ok) {
    return {
      ...state,
      error:
        result.error === "exists"
          ? "Ya existe una cuenta con ese correo."
          : "No se pudo crear la cuenta.",
    };
  }

  await setSessionCookie(result.token);
  redirect("/");
}

export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const state: AuthActionState = { ...initialAuthState, email };
  const credentials = parseCredentials({ email, password });

  if (!credentials) {
    return { ...state, error: "Correo o contraseña incorrectos." };
  }

  let result: Awaited<ReturnType<typeof authenticate>>;
  try {
    result = await authenticate(
      credentials,
      await currentIp(),
      authDependencies,
    );
  } catch (error) {
    if (isAuthConfigurationError(error)) {
      return {
        ...state,
        error:
          "El servidor no está configurado correctamente. Inténtalo más tarde.",
      };
    }
    throw error;
  }
  if (!result.ok) {
    return {
      ...state,
      error:
        result.error === "locked"
          ? "Demasiados intentos fallidos. Tu acceso está bloqueado temporalmente."
          : "Correo o contraseña incorrectos.",
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  await setSessionCookie(result.token);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await revokeCurrentSession();
  redirect("/login");
}
