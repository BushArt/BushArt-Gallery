import { Suspense } from "react";
import { ArtworkModalClient } from "@/components/artwork/ArtworkModalClient";

export default function ArtworkModalPage() {
  return (
    <Suspense fallback={null}>
      <ArtworkModalClient />
    </Suspense>
  );
}
