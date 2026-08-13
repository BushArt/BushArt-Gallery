import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtworkDetailResponse } from "@/types/api";
import { ArtworkEditForm } from "@/components/artwork/ArtworkEditForm";

vi.mock("@/components/admin/TagPicker", () => ({
  TagPicker: () => <div data-testid="tag-picker-mock" />,
  useTagsList: () => ({ tags: [], createTag: vi.fn() }),
}));

const artwork: ArtworkDetailResponse = {
  id: "65e2e2e2e2e2e2e2e2e2e2e3",
  slug: "test-art",
  title: "Test",
  description: null,
  medium: "Ink",
  type: "personal",
  nsfw: false,
  completionDate: "2024-01-15T00:00:00.000Z",
  images: [{ publicId: "img-1", url: "https://cdn.example.com/img-1", width: 800, height: 600, order: 0 }],
  timelapse: null,
  tags: [],
  featured: false,
  featuredOrder: null,
};

describe("ArtworkEditForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requires featuredOrder when featured is toggled on", async () => {
    const user = userEvent.setup();
    render(
      <ArtworkEditForm artwork={artwork} onSave={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByTestId("edit-featured"));
    await user.click(screen.getByTestId("edit-save"));

    expect(screen.getByText("Featured order is required when featured is on")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not send featured fields when only title changes on featured artwork", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const featuredArtwork: ArtworkDetailResponse = {
      ...artwork,
      title: "Featured Title",
      featured: true,
      featuredOrder: 1,
    };

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(featuredArtwork), { status: 200 }),
    );

    render(
      <ArtworkEditForm artwork={featuredArtwork} onSave={onSave} onCancel={vi.fn()} />,
    );

    const titleInput = screen.getByTestId("edit-title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title");
    await user.click(screen.getByTestId("edit-save"));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.title).toBe("Updated Title");
    expect(body).not.toHaveProperty("featured");
    expect(body).not.toHaveProperty("featuredOrder");
  });

  it("removes an image and PATCHes updated images list", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const multiImageArtwork: ArtworkDetailResponse = {
      ...artwork,
      images: [
        { publicId: "img-1", url: "https://cdn.example.com/img-1", width: 800, height: 600, order: 0 },
        { publicId: "img-2", url: "https://cdn.example.com/img-2", width: 800, height: 600, order: 1 },
      ],
    };

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ...multiImageArtwork, images: [multiImageArtwork.images[1]] }), {
        status: 200,
      }),
    );

    render(
      <ArtworkEditForm artwork={multiImageArtwork} onSave={onSave} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByTestId("remove-image-0"));
    await user.click(screen.getByTestId("edit-save"));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { images: { publicId: string }[] };
    expect(body.images).toHaveLength(1);
    expect(body.images[0].publicId).toBe("img-2");
  });
});
