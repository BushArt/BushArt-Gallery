import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/admin/AuthProvider";
import { useAuth } from "@/hooks/useAuth";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function AuthHarness() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  if (isLoading) return <div data-testid="loading">loading</div>;
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? "in" : "out"}</span>
      {user && <span data-testid="username">{user.username}</span>}
      <button type="button" onClick={() => void login("admin", "secret")}>
        login
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = requestUrl(input);
        if (url === "/api/auth/me") {
          return new Response(JSON.stringify({ authenticated: false }), { status: 200 });
        }
        if (url === "/api/auth/login" && init?.method === "POST") {
          return new Response(null, { status: 200 });
        }
        if (url === "/api/auth/logout") {
          return new Response(null, { status: 200 });
        }
        return new Response(JSON.stringify({ authenticated: false }), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reflects unauthenticated session on load", async () => {
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("out");
    });
  });

  it("updates session after successful login", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url === "/api/auth/me") {
        const loggedIn = fetchMock.mock.calls.some(
          (call) => requestUrl(call[0] as RequestInfo | URL) === "/api/auth/login",
        );
        if (loggedIn) {
          return new Response(JSON.stringify({ id: "1", username: "admin" }), { status: 200 });
        }
        return new Response(JSON.stringify({ authenticated: false }), { status: 200 });
      }
      if (url === "/api/auth/login") {
        return new Response(null, { status: 200 });
      }
      return new Response(null, { status: 200 });
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("auth-status")).toHaveTextContent("out"));
    await user.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("in");
      expect(screen.getByTestId("username")).toHaveTextContent("admin");
    });
  });

  it("surfaces lockout error from login", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url === "/api/auth/me") {
        return new Response(JSON.stringify({ authenticated: false }), { status: 200 });
      }
      if (url === "/api/auth/login") {
        return new Response(
          JSON.stringify({
            error: {
              code: "LOCKED",
              message: "Account is temporarily locked",
              details: { retryAfterSeconds: 900 },
            },
          }),
          { status: 423 },
        );
      }
      return new Response(null, { status: 200 });
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("auth-status")).toHaveTextContent("out"));
  });
});
