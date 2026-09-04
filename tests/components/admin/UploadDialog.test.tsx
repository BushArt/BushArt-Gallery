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

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("upload-retry-save")).not.toBeInTheDocument();
  });
});
