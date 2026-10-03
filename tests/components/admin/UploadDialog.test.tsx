import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadDialog } from "@/components/admin/UploadDialog";
import { uploadFileToCloudinary } from "@/lib/cloudinary/uploadClient";

vi.mock("@/lib/cloudinary/uploadClient", () => ({
  uploadFileToCloudinary: vi.fn(),
}));

vi.mock("@/components/admin/TagPicker", () => ({
  TagPicker: () => <div data-testid="tag-picker-mock" />,
  useTagsList: () => ({ tags: [], createTag: vi.fn() }),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("UploadDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadFileToCloudinary).mockResolvedValue({
      public_id: "bushart/uploads/test-image",
      secure_url: "https://res.cloudinary.com/demo/test.jpg",
      width: 800,
      height: 600,
      resource_type: "image",
    });
  });

  it("retries metadata save without re-uploading Cloudinary media", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Database temporarily unavailable" } }), {
          status: 503,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "art-1", slug: "test-art" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadDialog onClose={onClose} onSuccess={onSuccess} />);

    const file = new File(["image"], "test.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Images"), file);
    await waitFor(() => expect(screen.getByText("1 image(s) ready")).toBeInTheDocument());
    await user.type(screen.getByTestId("upload-title"), "Test artwork");
    await user.type(screen.getByTestId("upload-medium"), "Ink");
    await user.type(screen.getByTestId("upload-completion-date"), "2026-03-01");

    await user.click(screen.getByTestId("upload-submit"));
    await expect(screen.findByTestId("upload-retry-save")).resolves.toBeInTheDocument();
    expect(uploadFileToCloudinary).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("upload-retry-save"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(uploadFileToCloudinary).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      images: Array<{ publicId: string }>;
    };
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      images: Array<{ publicId: string }>;
    };
    expect(firstBody.images).toEqual(secondBody.images);
    expect(secondBody.images[0].publicId).toBe("bushart/uploads/test-image");
  });

  it("does not offer retry for terminal metadata errors", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Invalid artwork" } }), { status: 400 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadDialog onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.upload(
      screen.getByLabelText("Images"),
      new File(["image"], "test.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByText("1 image(s) ready")).toBeInTheDocument());
    await user.type(screen.getByTestId("upload-title"), "Test artwork");
    await user.type(screen.getByTestId("upload-medium"), "Ink");
    await user.type(screen.getByTestId("upload-completion-date"), "2026-03-01");
    await user.click(screen.getByTestId("upload-submit"));

    await waitFor(() => expect(screen.getByTestId("upload-error")).toHaveTextContent("Invalid artwork"));
    expect(screen.queryByTestId("upload-retry-save")).not.toBeInTheDocument();
  });

  it("destroys orphaned Cloudinary uploads after a terminal save failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/api/upload/cleanup")) {
        return new Response(JSON.stringify({ destroyed: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { message: "Invalid artwork" } }), {
        status: 400,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadDialog onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.upload(
      screen.getByLabelText("Images"),
      new File(["image"], "test.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByText("1 image(s) ready")).toBeInTheDocument());
    await user.type(screen.getByTestId("upload-title"), "Test artwork");
    await user.type(screen.getByTestId("upload-medium"), "Ink");
    await user.type(screen.getByTestId("upload-completion-date"), "2026-03-01");
    await user.click(screen.getByTestId("upload-submit"));

    await waitFor(() => {
      const cleanup = fetchMock.mock.calls.find(([url]) =>
        String(url).includes("/api/upload/cleanup"),
      );
      expect(cleanup).toBeDefined();
    });

    const [, cleanupInit] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/api/upload/cleanup"),
    )!;
    const cleanupBody = JSON.parse(String(cleanupInit?.body)) as {
      assets: Array<{ publicId: string; resourceType: string }>;
    };
    expect(cleanupBody.assets).toEqual([
      { publicId: "bushart/uploads/test-image", resourceType: "image" },
    ]);
  });

  it("includes a timelapse video in the cleanup batch", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadFileToCloudinary).mockImplementation(async (_file, resourceType) =>
      resourceType === "video"
        ? ({
            public_id: "bushart/uploads/clip",
            secure_url: "https://res.cloudinary.com/demo/clip.mp4",
            width: 1920,
            height: 1080,
            duration: 12,
            resource_type: "video",
          } as never)
        : ({
            public_id: "bushart/uploads/test-image",
            secure_url: "https://res.cloudinary.com/demo/test.jpg",
            width: 800,
            height: 600,
            resource_type: "image",
          } as never),
    );

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/api/upload/cleanup")) {
        return new Response(JSON.stringify({ destroyed: 2 }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { message: "Invalid artwork" } }), {
        status: 400,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadDialog onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.upload(
      screen.getByLabelText("Images"),
      new File(["image"], "test.png", { type: "image/png" }),
    );
    await user.upload(
      screen.getByLabelText("Timelapse (optional)"),
      new File(["video"], "clip.mp4", { type: "video/mp4" }),
    );
    await waitFor(() => expect(screen.getByText("Timelapse attached")).toBeInTheDocument());

    await user.type(screen.getByTestId("upload-title"), "Test artwork");
    await user.type(screen.getByTestId("upload-medium"), "Ink");
    await user.type(screen.getByTestId("upload-completion-date"), "2026-03-01");
    await user.click(screen.getByTestId("upload-submit"));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes("/api/upload/cleanup")),
      ).toBe(true);
    });

    const [, cleanupInit] = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/api/upload/cleanup"),
    )!;
    const cleanupBody = JSON.parse(String(cleanupInit?.body)) as {
      assets: Array<{ publicId: string; resourceType: string }>;
    };
    expect(cleanupBody.assets).toContainEqual({
      publicId: "bushart/uploads/clip",
      resourceType: "video",
    });
  });

  // Retryable failures keep the uploads so "Retry save" can reuse them; deleting
  // them would force the admin to re-upload and re-consume storage quota.
  it("keeps uploads on a retryable failure so Retry save can reuse them", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Database temporarily unavailable" } }), {
          status: 503,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadDialog onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.upload(
      screen.getByLabelText("Images"),
      new File(["image"], "test.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByText("1 image(s) ready")).toBeInTheDocument());
    await user.type(screen.getByTestId("upload-title"), "Test artwork");
    await user.type(screen.getByTestId("upload-medium"), "Ink");
    await user.type(screen.getByTestId("upload-completion-date"), "2026-03-01");
    await user.click(screen.getByTestId("upload-submit"));

    await expect(screen.findByTestId("upload-retry-save")).resolves.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("/api/upload/cleanup")),
    ).toBe(false);
    expect(screen.getByText("1 image(s) ready")).toBeInTheDocument();
  });

  // A failed cleanup must not mask the original save error the admin needs to see.
  it("still surfaces the save error when cleanup itself fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/upload/cleanup")) {
        throw new TypeError("network down");
      }
      return new Response(JSON.stringify({ error: { message: "Invalid artwork" } }), {
        status: 400,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadDialog onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.upload(
      screen.getByLabelText("Images"),
      new File(["image"], "test.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByText("1 image(s) ready")).toBeInTheDocument());
    await user.type(screen.getByTestId("upload-title"), "Test artwork");
    await user.type(screen.getByTestId("upload-medium"), "Ink");
    await user.type(screen.getByTestId("upload-completion-date"), "2026-03-01");
    await user.click(screen.getByTestId("upload-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("upload-error")).toHaveTextContent("Invalid artwork"),
    );
  });
});
