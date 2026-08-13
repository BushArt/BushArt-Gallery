import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onClose when Escape is pressed by default", async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} testId="test-modal">
        <button type="button">Inside</button>
      </Modal>,
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape when closeOnEscape is false", async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} closeOnEscape={false} testId="test-modal">
        <button type="button">Inside</button>
      </Modal>,
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("associates the dialog with labelledBy", () => {
    render(
      <Modal onClose={vi.fn()} labelledBy="custom-title" testId="test-modal">
        <h2 id="custom-title">Dialog title</h2>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby", "custom-title");
  });
});
