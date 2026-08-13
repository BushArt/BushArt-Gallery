import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { FullscreenViewer } from "@/components/artwork/FullscreenViewer";

vi.mock("@/lib/cloudinary/transformations", () => ({
  getTransformationUrl: (publicId: string) => `https://cdn.example.com/${publicId}`,
}));

vi.mock("@/components/ui/SketchReveal", () => ({
  SketchRevealImage: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => true,
}));

const items = [
  { publicId: "img-1", alt: "Image 1", resourceType: "image" as const },
  { publicId: "img-2", alt: "Image 2", resourceType: "image" as const },
];

describe("FullscreenViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(
      <FullscreenViewer
        items={items}
        currentIndex={0}
        onIndexChange={vi.fn()}
        onClose={onClose}
      />,
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("announces current position for multiple items", () => {
    render(
      <FullscreenViewer
        items={items}
        currentIndex={1}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Image 2 of 2")).toBeInTheDocument();
  });
});
