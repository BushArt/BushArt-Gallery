import { Suspense } from "react";
import { toPublicSettingsResponse } from "@/lib/api/settings-response";
import { findFeaturedArtworks } from "@/lib/db/models/artwork";
import { findSettings } from "@/lib/db/models/settings";
import { HomePageClient } from "./HomePageClient";

function HomePageFallback() {
  return (
    <main className="min-h-screen bg-ink-950">
      <header className="bg-ink-950 px-4 py-12">
        <div className="mx-auto max-w-[1400px] animate-pulse space-y-4">
          <div className="h-10 w-48 rounded-md bg-ink-800" />
          <div className="h-4 w-full max-w-xl rounded-md bg-ink-800" />
          <div className="h-4 w-2/3 max-w-lg rounded-md bg-ink-800" />
        </div>
      </header>
      <p className="py-12 text-center text-paper-500">Loading gallery…</p>
    </main>
  );
}

async function HomePageDataLoader() {
  const [settings, featuredArtworks] = await Promise.all([
    findSettings(),
    findFeaturedArtworks(),
  ]);

  const publicSettings = toPublicSettingsResponse(settings);

  return (
    <HomePageClient settings={publicSettings} featuredArtworks={featuredArtworks} />
  );
}

export function HomePageShell() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageDataLoader />
    </Suspense>
  );
}
