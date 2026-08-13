"use client";

import { useParams } from "next/navigation";
import { ArtworkPopup } from "@/components/artwork/ArtworkPopup";

export function ArtworkModalClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  if (!slug) return null;

  return <ArtworkPopup slug={slug} />;
}
