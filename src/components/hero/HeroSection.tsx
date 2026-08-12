import clsx from "clsx";
import { ExternalLink, Mail } from "lucide-react";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import type { PublicSettingsResponse } from "@/types/api";
import type { ArtworkListItem } from "@/types/artwork";
import { FeaturedArtwork } from "./FeaturedArtwork";

interface HeroSectionProps {
  settings: PublicSettingsResponse;
  featuredArtworks: ArtworkListItem[];
}

export function HeroSection({ settings, featuredArtworks }: HeroSectionProps) {
  const bannerUrl = settings.bannerImage
    ? getTransformationUrl(settings.bannerImage.publicId, "popup")
    : null;
  const profileUrl = settings.profileImage
    ? getTransformationUrl(settings.profileImage.publicId, "grid")
    : null;

  const contactHref = settings.contactUrl ?? (settings.contactEmail ? `mailto:${settings.contactEmail}` : null);
  const contactLabel = settings.contactUrl ? "Contact" : settings.contactEmail ? "Email" : null;

  return (
    <header className="relative bg-ink-950">
      {bannerUrl && (
        <div className="relative h-40 w-full overflow-hidden sm:h-52 md:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        </div>
      )}

      <div
        className={clsx(
          "mx-auto max-w-[1400px] px-4 pb-12",
          bannerUrl ? "-mt-16 relative z-10" : "pt-12",
        )}
      >
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
          {profileUrl && (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profileUrl}
                alt={settings.artistName ? `${settings.artistName} profile` : "Artist profile"}
                className="h-28 w-28 rounded-full border-4 border-ink-900 object-cover shadow-float md:h-36 md:w-36"
              />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-4">
            {settings.artistName ? (
              <h1 className="font-fraunces text-display-lg leading-display-lg text-paper-100">
                {settings.artistName}
              </h1>
            ) : (
              <h1 className="font-fraunces text-display-lg leading-display-lg text-paper-500">
                Artist
              </h1>
            )}

            {settings.tagline && (
              <p className="font-inter text-body-lg leading-body-lg text-paper-300">
                {settings.tagline}
              </p>
            )}

            {settings.biography && (
              <p className="max-w-2xl font-inter text-body-md leading-body-md text-paper-300">
                {settings.biography}
              </p>
            )}

            {settings.socialLinks.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {settings.socialLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-body-sm text-accent-brass underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
                    >
                      {link.platform}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {contactHref && contactLabel && (
              <div>
                <a
                  href={contactHref}
                  {...(settings.contactUrl
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-brass px-4 py-2 text-body-md font-medium text-ink-950 transition-colors hover:bg-accent-brass/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
                >
                  {contactLabel}
                  {settings.contactUrl ? (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  )}
                </a>
              </div>
            )}
          </div>
        </div>

        {featuredArtworks.length > 0 && (
          <FeaturedArtwork artworks={featuredArtworks} />
        )}
      </div>
    </header>
  );
}
