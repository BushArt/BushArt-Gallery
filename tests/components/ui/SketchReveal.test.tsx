import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useReducedMotionMock = vi.fn(() => false);

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => useReducedMotionMock(),
  };
});

import { SketchRevealImage } from "@/components/ui/SketchReveal";

describe("SketchReveal", () => {
  it("hides sketch trace when prefers-reduced-motion is set", () => {
    useReducedMotionMock.mockReturnValue(true);

    render(
      <SketchRevealImage src="https://cdn.example.com/test.jpg" alt="Test artwork" />,
    );

    expect(screen.queryByTestId("sketch-trace")).not.toBeInTheDocument();
    expect(screen.getByTestId("sketch-content")).toBeInTheDocument();
  });

  it("shows sketch trace when reduced motion is not preferred", () => {
    useReducedMotionMock.mockReturnValue(false);

    render(
      <SketchRevealImage src="https://cdn.example.com/test.jpg" alt="Test artwork" />,
    );

    expect(screen.getByTestId("sketch-trace")).toBeInTheDocument();
  });

  it("shows fallback when image fails to load", () => {
    useReducedMotionMock.mockReturnValue(false);

    render(
      <SketchRevealImage src="https://cdn.example.com/broken.jpg" alt="Test artwork" />,
    );

    fireEvent.error(screen.getByTestId("sketch-content"));

    expect(screen.getByTestId("sketch-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("sketch-trace")).not.toBeInTheDocument();
  });
});
