import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ShareButton, buildShareUrl } from "@/components/artwork/ShareButton";

describe("ShareButton", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses Web Share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    render(<ShareButton slug="test-art" />);
    await userEvent.click(screen.getByTestId("share-button"));

    expect(share).toHaveBeenCalledWith({
      url: buildShareUrl("test-art"),
      title: document.title,
    });
    expect(screen.queryByTestId("share-confirmation")).not.toBeInTheDocument();
  });

  it("falls back to clipboard copy when Web Share API is unavailable", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<ShareButton slug="test-art" />);
    await userEvent.click(screen.getByTestId("share-button"));

    expect(writeText).toHaveBeenCalledWith(buildShareUrl("test-art"));
    expect(await screen.findByTestId("share-confirmation")).toHaveTextContent(
      "Link copied to clipboard",
    );
  });
});
