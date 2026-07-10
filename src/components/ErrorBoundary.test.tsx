import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  let container: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: { mockRestore: () => void };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error is thrown", async () => {
    await act(async () => {
      root.render(
        <ErrorBoundary>
          <div>Healthy child</div>
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toContain("Healthy child");
  });

  it("shows the fallback UI when a child throws", async () => {
    const Thrower = () => {
      throw new Error("Kaboom");
    };

    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>,
      );
    });

    expect(container.textContent).toContain("Error");
    expect(container.textContent).toContain("Kaboom");
    expect(container.textContent).toContain("Go Home");
  });

  it("calls the reload handlers when the fallback buttons are clicked", async () => {
    const Thrower = () => {
      throw new Error("Kaboom");
    };

    const handleReloadSpy = vi.spyOn(ErrorBoundary.prototype, "handleReload");
    const handleReloadPageSpy = vi.spyOn(ErrorBoundary.prototype, "handleReloadPage");

    await act(async () => {
      root.render(
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>,
      );
    });

    const [reloadPageButton, goHomeButton] = Array.from(container.querySelectorAll("button"));

    await act(async () => {
      reloadPageButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      goHomeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(handleReloadPageSpy).toHaveBeenCalledTimes(1);
    expect(handleReloadSpy).toHaveBeenCalledTimes(1);

    handleReloadSpy.mockRestore();
    handleReloadPageSpy.mockRestore();
  });
});
