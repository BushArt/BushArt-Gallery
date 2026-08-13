import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagManager } from "@/components/admin/TagManager";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({
    children,
    onClose,
    testId,
  }: {
    children: React.ReactNode;
    onClose: () => void;
    testId?: string;
  }) => (
    <div data-testid={testId}>
      <button type="button" onClick={onClose} aria-label="Close dialog">
        close
      </button>
      {children}
    </div>
  ),
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => true,
}));

const mockTags = [
  {
    id: "65e2e2e2e2e2e2e2e2e2e2e2",
    name: "Sketch",
    slug: "sketch",
    usageCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("TagManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1", username: "admin" },
      isAuthenticated: true,
      isLoading: false,
      loginModalOpen: false,
      tagManagerOpen: true,
      openLoginModal: vi.fn(),
      closeLoginModal: vi.fn(),
      openTagManager: vi.fn(),
      closeTagManager: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/tags" && (!init || init.method === undefined)) {
          return new Response(JSON.stringify({ items: mockTags }), { status: 200 });
        }
        if (url.includes("/api/tags/") && init?.method === "DELETE") {
          return new Response(null, { status: 200 });
        }
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }),
    );
  });

  it("requires confirmation before delete API call", async () => {
    const user = userEvent.setup();
    render(<TagManager />);

    await waitFor(() => {
      expect(screen.getByTestId("tag-row-sketch")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("tag-delete-sketch"));
    expect(screen.getByTestId("tag-delete-confirm-dialog")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/tags/"),
      expect.objectContaining({ method: "DELETE" }),
    );

    await user.click(screen.getByTestId("tag-delete-confirm-button"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tags/65e2e2e2e2e2e2e2e2e2e2e2"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
