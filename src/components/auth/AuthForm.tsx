"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";

export interface AuthFormProps {
  mode: "login" | "register";
  action: (
    previous: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
}

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function LockCountdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const isBlocked = remaining > 0;

  useEffect(() => {
    if (!isBlocked) {
      return;
    }
    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isBlocked]);

  return (
    <p
      aria-live="polite"
      className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
    >
      Intenta de nuevo en {formatSeconds(remaining)}.
    </p>
  );
}

export default function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  const isRegister = mode === "register";
  const isBlocked = state.retryAfterSeconds > 0;

  const title = isRegister ? "Crear cuenta" : "Iniciar sesión";
  const submitLabel = pending
    ? "Procesando…"
    : isRegister
      ? "Crear cuenta"
      : "Entrar";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-background p-6 shadow-sm dark:border-zinc-800 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Pomodoro de estudio
        </p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          {isRegister
            ? "Regístrate para guardar tus materias y sesiones por cuenta."
            : "Accede a tu historial, materias y sesiones guardadas."}
        </p>

        <form
          action={formAction}
          className="mt-6 flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={state.email}
              aria-invalid={Boolean(state.fieldErrors.email)}
              aria-describedby={
                state.fieldErrors.email ? "email-error" : undefined
              }
              className="min-h-11 w-full rounded-lg border border-zinc-300 bg-background px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:border-zinc-700"
            />
            {state.fieldErrors.email ? (
              <p
                id="email-error"
                className="text-sm text-red-700 dark:text-red-400"
              >
                {state.fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              aria-invalid={Boolean(state.fieldErrors.password)}
              aria-describedby={
                isRegister ? "password-requirements" : undefined
              }
              className="min-h-11 w-full rounded-lg border border-zinc-300 bg-background px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:border-zinc-700"
            />
            {isRegister ? (
              <p
                id="password-requirements"
                className="text-sm text-zinc-600 dark:text-zinc-400"
              >
                Mínimo 10 caracteres y al menos un símbolo.
              </p>
            ) : null}
            {state.fieldErrors.password ? (
              <p
                className="text-sm text-red-700 dark:text-red-400"
                role="alert"
              >
                {state.fieldErrors.password}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300"
            >
              {state.error}
            </p>
          ) : null}

          {isBlocked ? (
            <LockCountdown
              key={state.retryAfterSeconds}
              seconds={state.retryAfterSeconds}
            />
          ) : null}

          <button
            type="submit"
            disabled={pending || isBlocked}
            className="min-h-11 w-full rounded-lg bg-foreground px-4 text-base font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {submitLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-700 dark:text-zinc-300">
          {isRegister ? "¿Ya tienes cuenta? " : "¿Aún no tienes cuenta? "}
          <Link
            href={isRegister ? "/login" : "/registro"}
            className="font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </Link>
        </p>
      </div>
    </main>
  );
}
