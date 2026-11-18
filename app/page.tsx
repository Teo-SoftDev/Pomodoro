import { connection } from "next/server";
import { Suspense } from "react";
import StudyApp from "@/components/StudyApp";
import { requireUser } from "@/lib/auth/dal";
import { readLegacyClaimOwner } from "@/lib/auth/legacy-migration";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cargando tu espacio de estudio…
          </p>
        </main>
      }
    >
      <AuthenticatedApp />
    </Suspense>
  );
}

async function AuthenticatedApp() {
  await connection();
  const [user, legacyOwnerId] = await Promise.all([
    requireUser(),
    readLegacyClaimOwner(),
  ]);
  return (
    <StudyApp
      userId={user.id}
      email={user.email}
      isLegacyOwner={user.id === legacyOwnerId}
    />
  );
}
