"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import { formatCompletionDate } from "@/lib/utils/formatDate";
import { useArtwork } from "@/hooks/useArtwork";
import { NSFW_STORAGE_KEY } from "@/hooks/useFilters";
import { NSFW_PREFERENCE_CHANGED } from "@/lib/utils/nsfwEvents";
import type { ArtworkDetailResponse } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SketchReveal, SketchRevealImage } from "@/components/ui/SketchReveal";
import { TagPill } from "@/components/ui/TagPill";
import { DownloadButton } from "./DownloadButton";
import { ShareButton } from "./ShareButton";
import { FullscreenViewer, type FullscreenMediaItem } from "./FullscreenViewer";

interface ArtworkPopupProps {
  slug: string;
  initialData?: ArtworkDetailResponse | null;
  /** Full-page `/artwork/[slug]` visits should navigate home; intercepted modals use history back. */
  closeMode?: "back" | "home";
}

function readNsfwPreferenceFromStorage(): "include" | "exclude" {
  if (typeof window === "undefined") return "exclude";
  return localStorage.getItem(NSFW_STORAGE_KEY) === "include" ? "include" : "exclude";
}

function NsfwInterstitial({
  titleId,
  onConfirm,
  onCancel,
}: {
  titleId: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-8 text-center" data-testid="nsfw-interstitial">
      <h2 id={titleId} className="font-fraunces text-display-sm text-paper-100">
        Sensitive content
      </h2>
      <p className="mt-3 text-body-md text-paper-300">
        This artwork is marked NSFW. Continue to view the media?
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Go back
        </Button>
        <Button variant="primary" onClick={onConfirm} data-testid="nsfw-confirm">
          View artwork
        </Button>
      </div>
    </div>
  );
}

export function ArtworkPopupLoadingShell({ closeMode = "back" }: { closeMode?: "back" | "home" }) {
  const router = useRouter();
  const handleClose = useCallback(() => {
    if (closeMode === "home") {
      router.push("/");
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router, closeMode]);

  return (
    <Modal onClose={handleClose} testId="artwork-modal">
      <div className="p-12 text-center text-body-md text-paper-500" data-testid="artwork-popup">
        Loading artwork…
      </div>
    </Modal>
  );
}

export function ArtworkPopup({ slug, initialData = null, closeMode = "back" }: ArtworkPopupProps) {
  const router = useRouter();
  const titleId = useId();

  const handleClose = useCallback(() => {
    if (closeMode === "home") {
      router.push("/");
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router, closeMode]);

  const { artwork, isLoading, error } = useArtwork({ slug, initialData });
  const [nsfwPreference, setNsfwPreference] = useState<"include" | "exclude">(
    readNsfwPreferenceFromStorage,
  );
  const [nsfwConfirmed, setNsfwConfirmed] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    const syncPreference = () => {
      const next = readNsfwPreferenceFromStorage();
      setNsfwPreference(next);
      if (next === "exclude") {
        setNsfwConfirmed(false);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === NSFW_STORAGE_KEY || event.key === null) {
        syncPreference();
      }
    };

    const handleNsfwEvent = () => syncPreference();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(NSFW_PREFERENCE_CHANGED, handleNsfwEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(NSFW_PREFERENCE_CHANGED, handleNsfwEvent);
    };
  }, []);

  const sortedImages = useMemo(
    () => (artwork ? [...artwork.images].sort((a, b) => a.order - b.order) : []),
    [artwork],
  );

  const nsfwBlocked =
    artwork?.nsfw === true && nsfwPreference === "exclude" && !nsfwConfirmed;

  const fullscreenItems: FullscreenMediaItem[] = useMemo(() => {
    if (!artwork) return [];
    const imageItems = sortedImages.map((img, index) => ({
      publicId: img.publicId,
      alt: `${artwork.title} — image ${index + 1}`,
      resourceType: "image" as const,
    }));
    if (artwork.timelapse) {
      return [
        ...imageItems,
        {
          publicId: artwork.timelapse.publicId,
          alt: `${artwork.title} — timelapse`,
          resourceType: "video" as const,
        },
      ];
    }
    return imageItems;
  }, [artwork, sortedImages]);

  const activeFullscreenIndex =
    showTimelapse && artwork?.timelapse ? sortedImages.length : mediaIndex;

  const openFullscreen = useCallback(() => {
    setFullscreenOpen(true);
  }, []);

  const currentImage = sortedImages[mediaIndex];
  const popupMediaUrl = currentImage
    ? getTransformationUrl(currentImage.publicId, "popup")
    : null;

  if (isLoading) {
    return <ArtworkPopupLoadingShell closeMode={closeMode} />;
  }

  if (error || !artwork) {
    return (
      <Modal onClose={handleClose} testId="artwork-modal" labelledBy={titleId}>
        <div className="p-12 text-center" data-testid="artwork-popup" role="alert">
          <h2 id={titleId} className="sr-only">
            Artwork error
          </h2>
          <p className="text-body-md text-accent-ember">{error ?? "Artwork not found"}</p>
          <Button variant="secondary" className="mt-4" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        onClose={handleClose}
        testId="artwork-modal"
        labelledBy={titleId}
        closeOnEscape={!fullscreenOpen}
        ariaHidden={fullscreenOpen}
      >
        <div className="relative" data-testid="artwork-popup">
          {nsfwBlocked ? (
            <NsfwInterstitial
              titleId={titleId}
              onConfirm={() => setNsfwConfirmed(true)}
              onCancel={handleClose}
            />
          ) : (
            <>
              <div className="flex items-center justify-end gap-1 border-b border-ink-800 px-4 py-3">
                <DownloadButton
                  slug={artwork.slug}
                  imageIndex={mediaIndex}
                  asset={showTimelapse && artwork.timelapse ? "timelapse" : undefined}
                />
                <ShareButton slug={artwork.slug} />
                <Button
                  variant="ghost"
                  className="px-3 py-2"
                  onClick={handleClose}
                  aria-label="Close artwork popup"
                  data-testid="popup-close"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:p-6">
                <div>
                  {showTimelapse && artwork.timelapse ? (
                    <button
                      type="button"
                      className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
                      onClick={openFullscreen}
                      aria-label="Open timelapse in fullscreen viewer"
                      data-testid="timelapse-fullscreen-trigger"
                    >
                      <SketchReveal className="aspect-[4/3] rounded-md bg-ink-950">
                        <video
                          src={getTransformationUrl(
                            artwork.timelapse.publicId,
                            "popup",
                            "video",
                          )}
                          controls
                          className="h-full w-full rounded-md object-contain"
                          aria-label={`${artwork.title} timelapse`}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </SketchReveal>
                    </button>
                  ) : (
                    popupMediaUrl && (
                      <button
                        type="button"
                        className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
                        onClick={openFullscreen}
                        aria-label="Open fullscreen viewer"
                        data-testid="popup-media-trigger"
                      >
                        <SketchReveal className="aspect-[4/3] rounded-md bg-ink-950">
                          <SketchRevealImage
                            src={popupMediaUrl}
                            alt={artwork.title}
                            loading="eager"
                            className="[&_img]:object-contain"
                          />
                        </SketchReveal>
                      </button>
                    )
                  )}

                  {sortedImages.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2" data-testid="image-thumbnails">
                      {sortedImages.map((img, index) => (
                        <button
                          key={img.publicId}
                          type="button"
                          onClick={() => {
                            setShowTimelapse(false);
                            setMediaIndex(index);
                          }}
                          className={clsx(
                            "h-16 w-16 overflow-hidden rounded-sm border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
                            !showTimelapse && mediaIndex === index
                              ? "border-accent-brass"
                              : "border-ink-700 hover:border-ink-600",
                          )}
                          aria-label={`View image ${index + 1}`}
                          aria-pressed={!showTimelapse && mediaIndex === index}
                        >
                          <SketchRevealImage
                            src={getTransformationUrl(img.publicId, "list")}
                            alt=""
                            className="h-full w-full"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {artwork.timelapse && (
                    <button
                      type="button"
                      onClick={() => setShowTimelapse(true)}
                      className={clsx(
                        "mt-3 rounded-sm border px-3 py-2 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
                        showTimelapse
                          ? "border-accent-brass text-accent-brass"
                          : "border-ink-700 text-paper-300 hover:border-ink-600",
                      )}
                      aria-pressed={showTimelapse}
                      data-testid="timelapse-toggle"
                    >
                      Timelapse
                    </button>
                  )}
                </div>

                <aside className="space-y-4">
                  <div>
                    <h2
                      id={titleId}
                      className="font-fraunces text-display-md leading-display-md text-paper-100"
                    >
                      {artwork.title}
                    </h2>
                    <p className="mt-2 font-ibm-plex-mono text-label leading-label tracking-label text-paper-500">
                      {artwork.medium} · {formatCompletionDate(artwork.completionDate)}
                    </p>
                  </div>

                  {artwork.description && (
                    <p className="font-inter text-body-md leading-body-md text-paper-300">
                      {artwork.description}
                    </p>
                  )}

                  {artwork.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2" data-testid="artwork-tags">
                      {artwork.tags.map((tag) => (
                        <TagPill key={tag.id} name={tag.name} />
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </Modal>

      {fullscreenOpen && !nsfwBlocked && (
        <FullscreenViewer
          items={fullscreenItems}
          currentIndex={activeFullscreenIndex}
          onIndexChange={(index) => {
            if (artwork.timelapse && index === sortedImages.length) {
              setShowTimelapse(true);
            } else {
              setShowTimelapse(false);
              setMediaIndex(index);
            }
          }}
          onClose={() => setFullscreenOpen(false)}
        />
      )}
    </>
  );
}
