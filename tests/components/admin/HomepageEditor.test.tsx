import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicSettingsResponse } from "@/types/api";
import { HomepageEditor } from "@/components/admin/HomepageEditor";
import { useAuth } from "@/hooks/useAuth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/cloudinary/transformations", () => ({
  getTransformationUrl: (id: string) => `https://cdn.example.com/${id}`,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => true,
}));

vi.mock("@/components/ui/SketchReveal", () => ({
  SketchRevealImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const settings: PublicSettingsResponse = {
  artistName: "Test Artist",
  tagline: "Hello",
  biography: "Bio text",
  profileImage: null,
  bannerImage: null,
  socialLinks: [],
  contactEmail: null,
  contactUrl: null,
};

describe("HomepageEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1", username: "admin" },
      isAuthenticated: true,
      isLoading: false,
      loginModalOpen: false,
      tagManagerOpen: false,
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
        if (url === "/api/settings" && init?.method === "PATCH") {
          const body = JSON.parse(init.body as string) as Record<string, unknown>;
          return new Response(JSON.stringify({ ...settings, ...body }), { status: 200 });
        }
        return new Response(JSON.stringify(settings), { status: 200 });
      }),
    );
  });

  it("edit save re-renders updated artist name", async () => {
    const user = userEvent.setup();
    render(<HomepageEditor initialSettings={settings} initialFeaturedArtworks={[]} />);

    await user.click(screen.getByTestId("edit-artist-name"));
    const input = screen.getByTestId("edit-artist-name-input");
    await user.clear(input);
    await user.type(input, "Updated Name");
    await user.click(screen.getByTestId("save-artist-name"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Updated Name");
    });
  });

  it("allows editing contact email and url", async () => {
    const user = userEvent.setup();
    render(<HomepageEditor initialSettings={settings} initialFeaturedArtworks={[]} />);

    await user.click(screen.getByTestId("add-contact"));
    await user.type(screen.getByTestId("edit-contact-email"), "hello@example.com");
    await user.type(screen.getByTestId("edit-contact-url"), "https://example.com");
    await user.click(screen.getByTestId("save-contact"));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /^Contact$/i })).toHaveAttribute(
        "href",
        "https://example.com",
      );
    });
  });

  it("shows mailto link when only contact email is set", async () => {
    const user = userEvent.setup();
    render(<HomepageEditor initialSettings={settings} initialFeaturedArtworks={[]} />);

    await user.click(screen.getByTestId("add-contact"));
    await user.type(screen.getByTestId("edit-contact-email"), "hello@example.com");
    await user.click(screen.getByTestId("save-contact"));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /^Email$/i })).toHaveAttribute(
        "href",
        "mailto:hello@example.com",
      );
    });
  });

  it("allows adding a social link", async () => {
    const user = userEvent.setup();
    render(<HomepageEditor initialSettings={settings} initialFeaturedArtworks={[]} />);

    await user.click(screen.getByTestId("add-social-link"));
    await user.type(screen.getByTestId("social-platform-input"), "Instagram");
    await user.type(screen.getByTestId("social-url-input"), "https://instagram.com/artist");
    await user.click(screen.getByTestId("save-social-link"));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
        "href",
        "https://instagram.com/artist",
      );
    });
  });
});
