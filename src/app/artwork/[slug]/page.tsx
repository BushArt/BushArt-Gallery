import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { toArtworkDetailResponse } from "@/lib/api/artwork-response";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import { findArtworkBySlug } from "@/lib/db/models/artwork";
import { findTagsByIds } from "@/lib/db/models/tag";
import { HomePageShell } from "@/components/home/HomePageShell";
import {
  ArtworkPopupLoadingShell,
} from "@/components/artwork/ArtworkPopup";
import { ArtworkPopupWithAuth } from "@/components/artwork/ArtworkPopupWithAuth";

interface ArtworkPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArtworkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await findArtworkBySlug(slug, true);

  if (!artwork) {
    return { title: "Artwork not found — BushArt" };
  }

  const cover = [...artwork.images].sort((a, b) => a.order - b.order)[0];
  const description =
    artwork.description?.slice(0, 160) ?? `${artwork.title} — ${artwork.medium}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ogImage = cover
    ? getTransformationUrl(cover.publicId, "popup")
    : undefined;

  return {
    title: `${artwork.title} — BushArt`,
    description,
    openGraph: {
      title: artwork.title,
      description,
      url: `${siteUrl}/artwork/${slug}`,
      images: ogImage ? [{ url: ogImage, alt: artwork.title }] : undefined,
    },
  };
}

async function ArtworkPopupLoader({ slug }: { slug: string }) {
  const artwork = await findArtworkBySlug(slug, true);

  if (!artwork) {
    notFound();
  }

  const tags = await findTagsByIds(artwork.tagIds);
  const initialData = toArtworkDetailResponse(artwork, tags);

  return <ArtworkPopupWithAuth slug={slug} initialData={initialData} closeMode="home" />;
}

async function ArtworkPageContent({ params }: ArtworkPageProps) {
  const { slug } = await params;

  return (
    <>
      <HomePageShell />
      <Suspense fallback={<ArtworkPopupLoadingShell closeMode="home" />}>
        <ArtworkPopupLoader slug={slug} />
      </Suspense>
    </>
  );
}

function ArtworkPageFallback() {
  return (
    <main className="min-h-screen bg-ink-950">
      <div className="px-4 py-12 text-center text-paper-500">Loading…</div>
    </main>
  );
}

export default function ArtworkPage({ params }: ArtworkPageProps) {
  return (
    <Suspense fallback={<ArtworkPageFallback />}>
      <ArtworkPageContent params={params} />
    </Suspense>
  );
}
