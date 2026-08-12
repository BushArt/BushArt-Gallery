import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NsfwToggle } from "@/components/gallery/FilterBar";

describe("NsfwToggle", () => {
  it("toggles NSFW visibility and updates aria-pressed", () => {
    const onChange = vi.fn();

    render(<NsfwToggle nsfw="exclude" onChange={onChange} />);

    const toggle = screen.getByTestId("nsfw-toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("NSFW hidden")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith("include");
  });

  it("shows visible state when nsfw is include", () => {
    render(<NsfwToggle nsfw="include" onChange={vi.fn()} />);

    expect(screen.getByTestId("nsfw-toggle")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("NSFW visible")).toBeInTheDocument();
  });
});
