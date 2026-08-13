import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeaturedArtwork } from "@/components/hero/FeaturedArtwork";
import type { ArtworkListItem } from "@/types/artwork";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));

vi.mock("@/lib/cloudinary/transformations", () => ({
  getTransformationUrl: (publicId: string) => `https://cdn.example.com/${publicId}`,
}));

vi.mock("@/components/ui/SketchReveal", () => ({
  SketchRevealImage: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="sketch-reveal-image" />
  ),
}));

const artwork: ArtworkListItem = {
  id: "1",
  slug: "featured-one",
  title: "Featured One",
  medium: "Ink",
  type: "personal",
  nsfw: false,
  completionDate: "2026-01-01T00:00:00.000Z",
  coverImage: { publicId: "bushart/featured/one", width: 400, height: 400 },
  descriptionPreview: null,
  tagSlugs: [],
};

describe("FeaturedArtwork", () => {
  it("renders featured items with sketch reveal images", () => {
    render(<FeaturedArtwork artworks={[artwork]} />);

    expect(screen.getByRole("region", { name: "Featured artwork" })).toBeInTheDocument();
    expect(screen.getByText("Featured One")).toBeInTheDocument();
    expect(screen.getByTestId("sketch-reveal-image")).toHaveAttribute("alt", "Featured One");
  });
});
