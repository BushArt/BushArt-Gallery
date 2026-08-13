import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DownloadButton, buildDownloadUrl } from "@/components/artwork/DownloadButton";

describe("DownloadButton", () => {
  it("links to the download API for the selected image index", () => {
    render(<DownloadButton slug="test-art" imageIndex={2} />);

    const link = screen.getByTestId("download-button");
    expect(link).toHaveAttribute("href", buildDownloadUrl("test-art", 2));
  });

  it("links to timelapse download when asset is timelapse", () => {
    render(<DownloadButton slug="test-art" imageIndex={0} asset="timelapse" />);

    const link = screen.getByTestId("download-button");
    expect(link).toHaveAttribute("href", buildDownloadUrl("test-art", 0, "timelapse"));
  });
});
