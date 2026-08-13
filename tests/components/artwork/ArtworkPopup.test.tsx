import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ArtworkDetailResponse } from "@/types/api";
import { ArtworkPopup } from "@/components/artwork/ArtworkPopup";
import { NSFW_STORAGE_KEY } from "@/hooks/useFilters";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
    rect: (props: React.SVGProps<SVGRectElement>) => <rect {...props} />,
  },
  useReducedMotion: () => true,
}));

vi.mock("@/lib/cloudinary/transformations", () => ({
  getTransformationUrl: (publicId: string) => `https://cdn.example.com/${publicId}`,
}));

vi.mock("@/components/ui/SketchReveal", () => ({
  SketchReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SketchRevealImage: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/hooks/useArtwork", () => ({
  useArtwork: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useArtwork } from "@/hooks/useArtwork";
import { useAuth } from "@/hooks/useAuth";

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    loginModalOpen: false,
    tagManagerOpen: false,
    openLoginModal: vi.fn(),
    closeLoginModal: vi.fn(),
    openTagManager: vi.fn(),
    closeTagManager: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  });
}

function makeArtwork(overrides: Partial<ArtworkDetailResponse> = {}): ArtworkDetailResponse {
  return {
    id: "1",
    slug: "test-art",
    title: "Test Artwork",
    description: "A test piece",
    medium: "Ink",
    type: "personal",
    nsfw: false,
    completionDate: "2024-01-15T00:00:00.000Z",
    images: [{ publicId: "img-1", url: "https://cdn.example.com/img-1", width: 800, height: 600, order: 0 }],
    timelapse: null,
    tags: [
      { id: "t1", name: "Sketch", slug: "sketch" },
      { id: "t2", name: "Ink", slug: "ink" },
    ],
    featured: false,
    featuredOrder: null,
    ...overrides,
  };
}

describe("ArtworkPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    localStorage.setItem(NSFW_STORAGE_KEY, "include");
    vi.mocked(useArtwork).mockReturnValue({
      artwork: makeArtwork(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("does not show edit controls for non-admin sessions", () => {
    mockAuth({ isAuthenticated: false, isLoading: false });
    render(<ArtworkPopup slug="test-art" initialData={makeArtwork()} />);
    expect(screen.queryByTestId("artwork-edit-button")).not.toBeInTheDocument();
  });

  it("does not render a related-artwork module when tags are present", () => {
    render(<ArtworkPopup slug="test-art" initialData={makeArtwork()} />);

    expect(screen.getByTestId("artwork-popup")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test Artwork" })).toBeInTheDocument();
    expect(screen.queryByTestId("related-artworks")).not.toBeInTheDocument();
    expect(screen.queryByText(/related/i)).not.toBeInTheDocument();
  });

  it("does not render related artwork even with many shared tags", () => {
    vi.mocked(useArtwork).mockReturnValue({
      artwork: makeArtwork({
        tags: Array.from({ length: 6 }, (_, i) => ({
          id: `t${i}`,
          name: `Tag ${i}`,
          slug: `tag-${i}`,
        })),
      }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<ArtworkPopup slug="test-art" initialData={makeArtwork()} />);

    expect(screen.queryByTestId("related-artworks")).not.toBeInTheDocument();
    expect(screen.queryByText(/you might also like/i)).not.toBeInTheDocument();
  });

  it("shows NSFW interstitial when artwork is NSFW and preference is SFW", async () => {
    localStorage.setItem(NSFW_STORAGE_KEY, "exclude");
    vi.mocked(useArtwork).mockReturnValue({
      artwork: makeArtwork({ nsfw: true }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<ArtworkPopup slug="test-art" initialData={makeArtwork({ nsfw: true })} />);

    expect(screen.getByTestId("nsfw-interstitial")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("nsfw-confirm"));

    expect(screen.queryByTestId("nsfw-interstitial")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test Artwork" })).toBeInTheDocument();
  });

  it("passes sorted display index to DownloadButton for the API", () => {
    vi.mocked(useArtwork).mockReturnValue({
      artwork: makeArtwork({
        images: [
          { publicId: "img-b", width: 800, height: 600, order: 1 },
          { publicId: "img-a", width: 800, height: 600, order: 0 },
        ],
      }),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <ArtworkPopup
        slug="test-art"
        initialData={makeArtwork({
          images: [
            { publicId: "img-b", width: 800, height: 600, order: 1 },
            { publicId: "img-a", width: 800, height: 600, order: 0 },
          ],
        })}
      />,
    );

    const download = screen.getByTestId("download-button");
    expect(download).toHaveAttribute("href", expect.stringContaining("image=0"));
  });
});
