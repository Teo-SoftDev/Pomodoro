import { connection } from "next/server";
import { Suspense } from "react";
import StudyHistoryApp from "@/components/StudyHistoryApp";
import { requireUser } from "@/lib/auth/dal";
import { readLegacyClaimOwner } from "@/lib/auth/legacy-migration";

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cargando tu historial…
          </p>
        </main>
      }
    >
      <AuthenticatedHistory />
    </Suspense>
  );
}

async function AuthenticatedHistory() {
  await connection();
  const [user, legacyOwnerId] = await Promise.all([
    requireUser(),
    readLegacyClaimOwner(),
  ]);
  return (
    <StudyHistoryApp
      userId={user.id}
      email={user.email}
      isLegacyOwner={user.id === legacyOwnerId}
    />
  );
}
