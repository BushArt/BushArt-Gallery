"use client";

import { useCallback, useRef } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { HomepageEditor } from "@/components/admin/HomepageEditor";
import { GallerySection } from "@/components/gallery/GallerySection";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import type { PublicSettingsResponse } from "@/types/api";
import type { ArtworkListItem } from "@/types/artwork";

interface HomePageClientProps {
  settings: PublicSettingsResponse;
  featuredArtworks: ArtworkListItem[];
}

export function HomePageClient({ settings, featuredArtworks }: HomePageClientProps) {
  const refreshRef = useRef<(() => void) | null>(null);

  const handleGalleryRefresh = useCallback(() => {
    refreshRef.current?.();
  }, []);

  return (
    <AdminShell onGalleryRefresh={handleGalleryRefresh}>
      <main className="min-h-screen bg-ink-950">
        <HomepageEditor
          initialSettings={settings}
          initialFeaturedArtworks={featuredArtworks}
        />
        <SectionErrorBoundary fallbackLabel="The gallery failed to load.">
          <GallerySection refreshRef={refreshRef} />
        </SectionErrorBoundary>
      </main>
    </AdminShell>
  );
}
