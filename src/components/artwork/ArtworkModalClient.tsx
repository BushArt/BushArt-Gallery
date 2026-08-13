"use client";

import { useParams } from "next/navigation";
import { ArtworkPopupWithAuth } from "@/components/artwork/ArtworkPopupWithAuth";

export function ArtworkModalClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  if (!slug) return null;

  return <ArtworkPopupWithAuth slug={slug} />;
}
