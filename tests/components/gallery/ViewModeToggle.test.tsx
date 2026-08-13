import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ViewModeToggle } from "@/components/gallery/ViewModeToggle";

describe("ViewModeToggle", () => {
  it("reflects active mode with aria-pressed", async () => {
    const onChange = vi.fn();
    render(<ViewModeToggle mode="grid" onChange={onChange} />);

    expect(screen.getByRole("button", { name: /grid/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /list/i })).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(screen.getByRole("button", { name: /list/i }));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});
