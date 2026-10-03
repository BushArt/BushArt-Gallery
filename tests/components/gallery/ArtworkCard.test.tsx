import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArtworkCard } from "@/components/gallery/ArtworkCard";
import { clearArtworkPreviewCache, getCachedArtworkPreview } from "@/lib/utils/artworkPreviewCache";
import type { ArtworkListItem } from "@/types/artwork";

const prefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: (...args: unknown[]) => prefetch(...args),
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

function makeArtwork(
  overrides: Partial<ArtworkListItem> & Pick<ArtworkListItem, "type" | "nsfw">,
): ArtworkListItem {
  return {
    id: "1",
    slug: "test-art",
    title: "Test Art",
    medium: "Watercolor",
    completionDate: "2024-06-15T00:00:00.000Z",
    coverImage: { publicId: "cover-1", width: 600, height: 800 },
    descriptionPreview: null,
    tagSlugs: [],
    ...overrides,
  };
}

const previewResponse = (slug: string) =>
  new Response(
    JSON.stringify({
      slug,
      title: "Test Art",
      nsfw: false,
      coverImage: { publicId: "cover-1", width: 600, height: 800 },
      descriptionPreview: null,
    }),
    { status: 200 },
  );

beforeEach(() => {
  vi.clearAllMocks();
  clearArtworkPreviewCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ArtworkCard — NSFW badge", () => {
  it("shows NSFW badge in grid mode", () => {
    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: true })} viewMode="grid" />);
    expect(screen.getByLabelText("NSFW content")).toBeInTheDocument();
  });

  it("shows commission badge in grid mode", () => {
    render(<ArtworkCard artwork={makeArtwork({ type: "commission", nsfw: false })} viewMode="grid" />);
    expect(screen.getByLabelText("Commissioned work")).toBeInTheDocument();
  });

  it("renders list mode with title and metadata", () => {
    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: false })} viewMode="list" />);
    expect(screen.getByRole("link", { name: /Test Art/i })).toBeInTheDocument();
    expect(screen.getByText(/Watercolor/)).toBeInTheDocument();
  });
});

describe("ArtworkCard — hover prefetch", () => {
  // The old implementation fetched the full detail document on every hover,
  // pulling all images, the timelapse, and tag ids to render a preview.
  it("prefetches the lightweight preview endpoint, not the full detail route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_url: unknown) => previewResponse("test-art"));
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: false })} viewMode="grid" />);

    await user.hover(screen.getByRole("link", { name: /Test Art/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/artworks/test-art/preview");
  });

  it("debounces rapid hovers into a single request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => previewResponse("test-art"));
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: false })} viewMode="grid" />);
    const link = screen.getByRole("link", { name: /Test Art/i });

    // Re-entering the same link before the debounce elapses must not queue
    // additional requests.
    await user.hover(link);
    await user.hover(link);
    await user.hover(link);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("does not fetch again once the preview is cached", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => previewResponse("test-art"));
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: false })} viewMode="grid" />);
    const link = screen.getByRole("link", { name: /Test Art/i });

    await user.hover(link);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Wait for the response to be read and cached before re-hovering.
    await waitFor(() => expect(getCachedArtworkPreview("test-art")).not.toBeNull());

    await user.unhover(link);
    await user.hover(link);

    // A second hover of an already-cached slug adds nothing.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // The previous implementation stored one window.__prefetchTimeout shared by
  // every card, so hovering a second card cancelled the first card's pending
  // request and no preview was ever fetched while moving across the gallery.
  it("does not cancel another card's pending prefetch", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string) =>
      previewResponse(String(url).includes("first") ? "first" : "second"),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <>
        <ArtworkCard
          artwork={makeArtwork({ slug: "first", title: "First Art", type: "personal", nsfw: false })}
          viewMode="grid"
        />
        <ArtworkCard
          artwork={makeArtwork({ slug: "second", title: "Second Art", type: "personal", nsfw: false })}
          viewMode="grid"
        />
      </>,
    );

    // Hover the first card, then immediately move to the second before the
    // first card's 300ms debounce has elapsed.
    await user.hover(screen.getByRole("link", { name: /First Art/i }));
    await user.hover(screen.getByRole("link", { name: /Second Art/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain("/api/artworks/first/preview");
    expect(urls).toContain("/api/artworks/second/preview");
  });

  it("ignores a failed preview fetch without surfacing an error", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: false })} viewMode="grid" />);

    await user.hover(screen.getByRole("link", { name: /Test Art/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("still prefetches the route on keyboard focus", async () => {
    const fetchMock = vi.fn(async () => previewResponse("test-art"));
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: false })} viewMode="grid" />);
    const link = screen.getByRole("link", { name: /Test Art/i });

    await act(async () => {
      link.focus();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("prefetch()es the route immediately, without waiting for the debounce", () => {
    vi.stubGlobal("fetch", vi.fn(async () => previewResponse("test-art")));

    render(<ArtworkCard artwork={makeArtwork({ type: "personal", nsfw: false })} viewMode="grid" />);
    const link = screen.getByRole("link", { name: /Test Art/i });

    act(() => {
      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(prefetch).toHaveBeenCalledWith("/artwork/test-art");
  });
});