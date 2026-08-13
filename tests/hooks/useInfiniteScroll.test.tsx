import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

function ScrollHarness({
  onLoadMore,
  hasMore,
  isLoading,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}) {
  const { sentinelRef } = useInfiniteScroll({ onLoadMore, hasMore, isLoading });
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe("useInfiniteScroll", () => {
  let observerCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    observerCallback = null;

    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls onLoadMore when sentinel intersects", () => {
    const onLoadMore = vi.fn();
    render(<ScrollHarness onLoadMore={onLoadMore} hasMore isLoading={false} />);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("does not call onLoadMore when isLoading", () => {
    const onLoadMore = vi.fn();
    render(<ScrollHarness onLoadMore={onLoadMore} hasMore isLoading />);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not attach observer when hasMore is false", () => {
    const onLoadMore = vi.fn();
    render(<ScrollHarness onLoadMore={onLoadMore} hasMore={false} isLoading={false} />);
    expect(observerCallback).toBeNull();
  });
});