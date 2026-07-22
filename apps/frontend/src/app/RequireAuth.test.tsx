import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequireAuth from "./RequireAuth";

const useAuthMock = vi.fn();

vi.mock("@/features/auth/components/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderBoundary() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/" element={<div>public landing</div>} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <div>private application</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("does not expose protected content while the session is unresolved", () => {
    useAuthMock.mockReturnValue({ authStatus: "checking_session" });
    renderBoundary();

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.queryByText("private application")).toBeNull();
  });

  it("redirects unauthenticated visitors to the public landing page", () => {
    useAuthMock.mockReturnValue({ authStatus: "unauthenticated" });
    renderBoundary();

    expect(screen.getByText("public landing")).toBeTruthy();
    expect(screen.queryByText("private application")).toBeNull();
  });

  it("renders protected content for an authenticated user", () => {
    useAuthMock.mockReturnValue({ authStatus: "authenticated" });
    renderBoundary();

    expect(screen.getByText("private application")).toBeTruthy();
  });
});
