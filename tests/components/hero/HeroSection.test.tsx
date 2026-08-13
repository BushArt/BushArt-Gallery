import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroSection } from "@/components/hero/HeroSection";
import type { PublicSettingsResponse } from "@/types/api";
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
    <img src={src} alt={alt} />
  ),
}));

const populatedSettings: PublicSettingsResponse = {
  artistName: "Jane Artist",
  tagline: "Digital sketchbook",
  biography: "A painter exploring light and form.",
  profileImage: { publicId: "profile-1", width: 400, height: 400 },
  bannerImage: { publicId: "banner-1", width: 1200, height: 400 },
  socialLinks: [{ platform: "Instagram", url: "https://instagram.com/jane" }],
  contactEmail: "jane@example.com",
  contactUrl: null,
};

const emptySettings: PublicSettingsResponse = {
  artistName: "",
  tagline: null,
  biography: null,
  profileImage: null,
  bannerImage: null,
  socialLinks: [],
  contactEmail: null,
  contactUrl: null,
};

const featuredFixture: ArtworkListItem[] = [
  {
    id: "a1",
    slug: "featured-piece",
    title: "Featured Piece",
    medium: "Ink",
    type: "personal",
    nsfw: false,
    completionDate: "2024-03-01T00:00:00.000Z",
    coverImage: { publicId: "art-1", width: 800, height: 600 },
    descriptionPreview: null,
    tagSlugs: [],
  },
];

describe("HeroSection", () => {
  it("renders populated settings with artist name, bio, social links, and contact", () => {
    render(<HeroSection settings={populatedSettings} featuredArtworks={featuredFixture} />);

    expect(screen.getByRole("heading", { level: 1, name: "Jane Artist" })).toBeInTheDocument();
    expect(screen.getByText("Digital sketchbook")).toBeInTheDocument();
    expect(screen.getByText(/exploring light and form/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Instagram/i })).toHaveAttribute(
      "href",
      "https://instagram.com/jane",
    );
    expect(screen.getByRole("link", { name: /Email/i })).toHaveAttribute(
      "href",
      "mailto:jane@example.com",
    );
    expect(screen.getByRole("region", { name: "Featured artwork" })).toBeInTheDocument();
    expect(screen.getByText("Featured Piece")).toBeInTheDocument();
  });

  it("renders gracefully with empty settings and no featured artwork", () => {
    render(<HeroSection settings={emptySettings} featuredArtworks={[]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Artist" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Featured artwork" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Email/i })).not.toBeInTheDocument();
  });
});
