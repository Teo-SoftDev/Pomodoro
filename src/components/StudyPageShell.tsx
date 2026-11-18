"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "../../app/actions/auth";

export interface StudyPageShellProps {
  email: string;
  active: "timer" | "history";
  title: string;
  description: string;
  children: ReactNode;
}

const NAV_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium " +
  "text-foreground underline-offset-4 hover:underline " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-foreground";

function navClass(active: boolean): string {
  return active ? `${NAV_LINK_CLASS} font-semibold` : NAV_LINK_CLASS;
}

export default function StudyPageShell({
  email,
  active,
  title,
  description,
  children,
}: StudyPageShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-background/95 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <nav aria-label="Secciones principales">
              <ul className="flex flex-wrap gap-1">
                <li>
                  <Link
                    href="/"
                    className={navClass(active === "timer")}
                    aria-current={active === "timer" ? "page" : undefined}
                  >
                    Temporizador
                  </Link>
                </li>
                <li>
                  <Link
                    href="/historial"
                    className={navClass(active === "history")}
                    aria-current={active === "history" ? "page" : undefined}
                  >
                    Historial
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <p
                className="max-w-[14rem] truncate text-xs text-zinc-600 dark:text-zinc-400"
                title={email}
              >
                {email}
              </p>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="min-h-11 rounded-lg border border-zinc-300 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:border-zinc-700"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="flex flex-1 flex-col gap-8 py-8"
      >
        {children}
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-zinc-200 bg-background/95 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Los datos se guardan en este navegador y se sincronizan con
            Firestore cuando el servidor está configurado.
          </p>
        </div>
      </footer>
    </div>
  );
}
