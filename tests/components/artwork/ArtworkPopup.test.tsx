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
      preview: null,
      isLoading: false,
      error: null,
      isRetryable: false,
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
      preview: null,
      isLoading: false,
      error: null,
      isRetryable: false,
      refresh: vi.fn(),
    });

    render(<ArtworkPopup slug="test-art" initialData={makeArtwork()} />);

    expect(screen.queryByTestId("related-artworks")).not.toBeInTheDocument();
    expect(screen.queryByText(/you might also like/i)).not.toBeInTheDocument();
  });

  // The hover prefetch is only useful if the modal can render something from
  // it while the full document loads. It must never become a way around the
  // NSFW gate: the loading shell renders *before* the popup's own interstitial
  // check, so it has to enforce the gate itself.
  describe("loading shell from the hover prefetch", () => {
    const preview = {
      slug: "test-art",
      title: "Warmed Title",
      nsfw: false,
      coverImage: { publicId: "cover-art", width: 800, height: 600 },
      descriptionPreview: null,
    };

    function mockLoading(overrides: Partial<ReturnType<typeof useArtwork>> = {}) {
      vi.mocked(useArtwork).mockReturnValue({
        artwork: null,
        preview: null,
        isLoading: true,
        error: null,
        isRetryable: false,
        refresh: vi.fn(),
        ...overrides,
      });
    }

    it("shows the plain loading text when no preview is warm", () => {
      mockLoading();

      render(<ArtworkPopup slug="test-art" />);

      expect(screen.getByText(/loading artwork/i)).toBeInTheDocument();
      expect(screen.queryByText("Warmed Title")).not.toBeInTheDocument();
    });

    it("renders the cover and title from the preview instead of a spinner", () => {
      mockLoading({ preview });

      render(<ArtworkPopup slug="test-art" />);

      expect(screen.getByText("Warmed Title")).toBeInTheDocument();
      expect(screen.getByAltText("Warmed Title")).toBeInTheDocument();
      expect(screen.queryByText(/loading artwork/i)).not.toBeInTheDocument();
    });

    it("withholds the preview image from an NSFW artwork when SFW is preferred", () => {
      // The regression this guards: adding an image to a shell that runs before
      // the interstitial would flash NSFW media the visitor opted out of.
      localStorage.setItem(NSFW_STORAGE_KEY, "exclude");
      mockLoading({ preview: { ...preview, nsfw: true } });

      render(<ArtworkPopup slug="test-art" />);

      expect(screen.queryByAltText("Warmed Title")).not.toBeInTheDocument();
      expect(screen.queryByText("Warmed Title")).not.toBeInTheDocument();
      expect(screen.getByText(/loading artwork/i)).toBeInTheDocument();
    });

    it("shows the preview image for an NSFW artwork when the visitor opted in", () => {
      localStorage.setItem(NSFW_STORAGE_KEY, "include");
      mockLoading({ preview: { ...preview, nsfw: true } });

      render(<ArtworkPopup slug="test-art" />);

      expect(screen.getByAltText("Warmed Title")).toBeInTheDocument();
    });

    it("does not render the edit form from a preview while still loading", () => {
      mockAuth({ isAuthenticated: true, isLoading: false });
      mockLoading({ preview });

      render(<ArtworkPopup slug="test-art" />);

      // Saving from a preview would persist a truncated document: it carries
      // no images[], tags, medium, type, completionDate or id.
      expect(screen.queryByTestId("artwork-edit-button")).not.toBeInTheDocument();
    });
  });

  it("shows NSFW interstitial when artwork is NSFW and preference is SFW", async () => {
    localStorage.setItem(NSFW_STORAGE_KEY, "exclude");
    vi.mocked(useArtwork).mockReturnValue({
      artwork: makeArtwork({ nsfw: true }),
      preview: null,
      isLoading: false,
      error: null,
      isRetryable: false,
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
      preview: null,
      isLoading: false,
      error: null,
      isRetryable: false,
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
