import { Suspense } from "react";
import { toPublicSettingsResponse } from "@/lib/api/settings-response";
import { findFeaturedArtworks } from "@/lib/db/models/artwork";
import { findSettings } from "@/lib/db/models/settings";
import { HeroSection } from "@/components/hero/HeroSection";
import { GallerySection } from "@/components/gallery/GallerySection";

async function HeroLoader() {
  const [settings, featuredArtworks] = await Promise.all([
    findSettings(),
    findFeaturedArtworks(),
  ]);

  const publicSettings = toPublicSettingsResponse(settings);

  return <HeroSection settings={publicSettings} featuredArtworks={featuredArtworks} />;
}

function HeroFallback() {
  return (
    <header className="bg-ink-950 px-4 py-12">
      <div className="mx-auto max-w-[1400px] animate-pulse space-y-4">
        <div className="h-10 w-48 rounded-md bg-ink-800" />
        <div className="h-4 w-full max-w-xl rounded-md bg-ink-800" />
        <div className="h-4 w-2/3 max-w-lg rounded-md bg-ink-800" />
      </div>
    </header>
  );
}

export function HomePageShell() {
  return (
    <main className="min-h-screen bg-ink-950">
      <Suspense fallback={<HeroFallback />}>
        <HeroLoader />
      </Suspense>
      <GallerySection />
    </main>
  );
}
