import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";

function Boom(): never {
  throw new Error("boom");
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
});
