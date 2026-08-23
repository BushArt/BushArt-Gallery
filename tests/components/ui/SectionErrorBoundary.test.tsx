import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

function Healthy() {
  return <p>Healthy section content</p>;
}

describe("SectionErrorBoundary", () => {
  it("renders fallback when child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SectionErrorBoundary fallbackLabel="Gallery failed">
        <Boom />
      </SectionErrorBoundary>,
    );

    expect(screen.getByTestId("section-error-fallback")).toBeInTheDocument();
    expect(screen.getByText("Gallery failed")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("keeps sibling sections rendering when one section errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <div>
        <SectionErrorBoundary fallbackLabel="Gallery failed">
          <Boom />
        </SectionErrorBoundary>
        <SectionErrorBoundary fallbackLabel="Artwork popup failed">
          <Healthy />
        </SectionErrorBoundary>
      </div>,
    );

    // The broken section shows its fallback…
    expect(screen.getByTestId("section-error-fallback")).toBeInTheDocument();
    expect(screen.getByText("Gallery failed")).toBeInTheDocument();

    // …while the healthy sibling still renders its content (independent recovery).
    expect(screen.getByText("Healthy section content")).toBeInTheDocument();

    spy.mockRestore();
  });
});
