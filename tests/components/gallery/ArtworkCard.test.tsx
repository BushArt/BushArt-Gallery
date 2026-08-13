import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtworkCard } from "@/components/gallery/ArtworkCard";
import type { ArtworkListItem } from "@/types/artwork";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/cloudinary/transformations", () => ({
  getTransformationUrl: (publicId: string) => `https://cdn.example.com/${publicId}`,
}));

vi.mock("@/components/ui/SketchReveal", () => ({
  SketchRevealImage: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="card-image" />
  ),
}));

function makeArtwork(overrides: Partial<ArtworkListItem> & Pick<ArtworkListItem, "type" | "nsfw">): ArtworkListItem {
  return {
    id: "1",
    slug: "test-art",
    title: "Test Art",
    medium: "Watercolor",
    completionDate: "2024-06-15T00:00:00.000Z",
    coverImage: { publicId: "cover-1", width: 600, height: 800 },
    tagSlugs: [],
    ...overrides,
  };
}

describe("ArtworkCard", () => {
  it("shows NSFW badge in grid mode", () => {
    const artwork = makeArtwork({ type: "personal", nsfw: true });
    render(<ArtworkCard artwork={artwork} viewMode="grid" />);

    expect(screen.getByLabelText("NSFW content")).toBeInTheDocument();
    expect(screen.queryByLabelText("Commissioned work")).not.toBeInTheDocument();
  });

  it("shows commission badge in grid mode", () => {
    const artwork = makeArtwork({ type: "commission", nsfw: false });
    render(<ArtworkCard artwork={artwork} viewMode="grid" />);

    expect(screen.getByLabelText("Commissioned work")).toBeInTheDocument();
    expect(screen.queryByLabelText("NSFW content")).not.toBeInTheDocument();
  });

  it("renders list mode with title and metadata", () => {
    const artwork = makeArtwork({ type: "personal", nsfw: false });
    render(<ArtworkCard artwork={artwork} viewMode="list" />);

    expect(screen.getByRole("link", { name: /Test Art/i })).toBeInTheDocument();
    expect(screen.getByText(/Watercolor/)).toBeInTheDocument();
  });
});
