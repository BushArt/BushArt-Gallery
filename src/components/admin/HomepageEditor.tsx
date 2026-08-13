"use client";

import clsx from "clsx";
import { ExternalLink, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import { uploadFileToCloudinary } from "@/lib/cloudinary/uploadClient";
import { useAuth } from "@/hooks/useAuth";
import type { PublicSettingsResponse } from "@/types/api";
import type { ArtworkListItem } from "@/types/artwork";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FeaturedArtwork } from "@/components/hero/FeaturedArtwork";

interface HomepageEditorProps {
  initialSettings: PublicSettingsResponse;
  initialFeaturedArtworks: ArtworkListItem[];
}

export function HomepageEditor({
  initialSettings,
  initialFeaturedArtworks,
}: HomepageEditorProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [contactDraft, setContactDraft] = useState({
    contactEmail: initialSettings.contactEmail ?? "",
    contactUrl: initialSettings.contactUrl ?? "",
  });
  const [socialDraft, setSocialDraft] = useState({ platform: "", url: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const savePatch = useCallback(
    async (patch: Record<string, unknown>) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? "Save failed");
        }
        const updated = (await res.json()) as PublicSettingsResponse;
        setSettings(updated);
        setEditingField(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setIsSaving(false);
      }
    },
    [router],
  );

  const startEdit = useCallback((field: string, value: string) => {
    setEditingField(field);
    setDraft(value);
    setError(null);
  }, []);

  const handleImageUpload = useCallback(
    async (field: "bannerImage" | "profileImage", file: File) => {
      setIsSaving(true);
      setError(null);
      try {
        const result = await uploadFileToCloudinary(file, "image");
        await savePatch({
          [field]: {
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            order: 0,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setIsSaving(false);
      }
    },
    [savePatch],
  );

  const bannerUrl = settings.bannerImage
    ? getTransformationUrl(settings.bannerImage.publicId, "popup")
    : null;
  const profileUrl = settings.profileImage
    ? getTransformationUrl(settings.profileImage.publicId, "grid")
    : null;

  const contactHref =
    settings.contactUrl ?? (settings.contactEmail ? `mailto:${settings.contactEmail}` : null);
  const contactLabel = settings.contactUrl ? "Contact" : settings.contactEmail ? "Email" : null;

  const admin = isAuthenticated && !isLoading;

  return (
    <header className="relative bg-ink-950" data-testid="homepage-editor">
      {(bannerUrl || admin) && (
        <div className="relative h-40 w-full overflow-hidden sm:h-52 md:h-64">
          {bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" aria-hidden="true" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-ink-900 text-body-sm text-paper-500">
              No banner image
            </div>
          )}
          {admin && (
            <label className="absolute bottom-3 right-3 cursor-pointer rounded-sm bg-ink-900/90 px-3 py-1.5 text-body-sm text-paper-100">
              <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {bannerUrl ? "Change banner" : "Add banner"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload("bannerImage", file);
                }}
                data-testid="edit-banner"
              />
            </label>
          )}
        </div>
      )}

      <div
        className={clsx(
          "mx-auto max-w-[1400px] px-4 pb-12",
          bannerUrl ? "-mt-16 relative z-10" : "pt-12",
        )}
      >
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
          <div className="relative shrink-0">
            {profileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileUrl}
                alt={settings.artistName ? `${settings.artistName} profile` : "Artist profile"}
                className="h-28 w-28 rounded-full border-4 border-ink-900 object-cover shadow-float md:h-36 md:w-36"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-ink-900 bg-ink-800 text-body-sm text-paper-500 md:h-36 md:w-36">
                No photo
              </div>
            )}
            {admin && (
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-ink-900 p-2 text-paper-100">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Change profile image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageUpload("profileImage", file);
                  }}
                  data-testid="edit-profile"
                />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            {editingField === "artistName" ? (
              <div className="flex gap-2">
                <Input
                  label="Artist name"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  data-testid="edit-artist-name-input"
                />
                <Button
                  type="button"
                  variant="primary"
                  disabled={isSaving}
                  onClick={() => void savePatch({ artistName: draft })}
                  data-testid="save-artist-name"
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="group flex items-start gap-2">
                <h1 className="font-fraunces text-display-lg leading-display-lg text-paper-100">
                  {settings.artistName || "Artist"}
                </h1>
                {admin && (
                  <button
                    type="button"
                    onClick={() => startEdit("artistName", settings.artistName)}
                    className="mt-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Edit artist name"
                    data-testid="edit-artist-name"
                  >
                    <Pencil className="h-4 w-4 text-paper-500" />
                  </button>
                )}
              </div>
            )}

            {editingField === "tagline" ? (
              <div className="flex gap-2">
                <Input label="Tagline" value={draft} onChange={(e) => setDraft(e.target.value)} data-testid="edit-tagline-input" />
                <Button type="button" variant="primary" onClick={() => void savePatch({ tagline: draft || null })} data-testid="save-tagline">
                  Save
                </Button>
              </div>
            ) : settings.tagline ? (
              <p className="font-inter text-body-lg leading-body-lg text-paper-300">
                {settings.tagline}
                {admin && (
                  <button
                    type="button"
                    onClick={() => startEdit("tagline", settings.tagline ?? "")}
                    className="ml-2 inline text-paper-500"
                    aria-label="Edit tagline"
                  >
                    <Pencil className="inline h-3.5 w-3.5" />
                  </button>
                )}
              </p>
            ) : admin ? (
              <Button type="button" variant="ghost" onClick={() => startEdit("tagline", "")} data-testid="add-tagline">
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Add tagline
              </Button>
            ) : null}

            {editingField === "biography" ? (
              <div className="space-y-2">
                <label className="block text-body-sm text-paper-500">Biography</label>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className="w-full rounded-sm border border-ink-700 bg-ink-900 px-3 py-2 text-body-md text-paper-100"
                  data-testid="edit-biography-input"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void savePatch({ biography: draft || null })}
                  data-testid="save-biography"
                >
                  Save
                </Button>
              </div>
            ) : settings.biography ? (
              <p className="max-w-2xl font-inter text-body-md leading-body-md text-paper-300">
                {settings.biography}
                {admin && (
                  <button
                    type="button"
                    onClick={() => startEdit("biography", settings.biography ?? "")}
                    className="ml-2 inline text-paper-500"
                    aria-label="Edit biography"
                    data-testid="edit-biography"
                  >
                    <Pencil className="inline h-3.5 w-3.5" />
                  </button>
                )}
              </p>
            ) : admin ? (
              <Button type="button" variant="ghost" onClick={() => startEdit("biography", "")} data-testid="add-biography">
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Add biography
              </Button>
            ) : null}

            {settings.socialLinks.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {settings.socialLinks.map((link, index) => (
                  <li key={`${link.platform}-${index}`} className="flex items-center gap-1">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-body-sm text-accent-brass underline-offset-2 hover:underline"
                    >
                      {link.platform}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                    {admin && (
                      <button
                        type="button"
                        aria-label={`Remove ${link.platform}`}
                        className="text-paper-500 hover:text-accent-ember"
                        onClick={() =>
                          void savePatch({
                            socialLinks: settings.socialLinks.filter((_, i) => i !== index),
                          })
                        }
                        data-testid={`remove-social-${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {admin && editingField === "social" ? (
              <div className="flex flex-wrap gap-2">
                <Input
                  label="Platform"
                  value={socialDraft.platform}
                  onChange={(e) => setSocialDraft((s) => ({ ...s, platform: e.target.value }))}
                  data-testid="social-platform-input"
                />
                <Input
                  label="URL"
                  value={socialDraft.url}
                  onChange={(e) => setSocialDraft((s) => ({ ...s, url: e.target.value }))}
                  data-testid="social-url-input"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    void savePatch({
                      socialLinks: [...settings.socialLinks, socialDraft],
                    });
                    setSocialDraft({ platform: "", url: "" });
                    setEditingField(null);
                  }}
                  data-testid="save-social-link"
                >
                  Add link
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditingField(null)}>
                  Cancel
                </Button>
              </div>
            ) : admin ? (
              <Button type="button" variant="ghost" onClick={() => setEditingField("social")} data-testid="add-social-link">
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Add social link
              </Button>
            ) : null}

            {editingField === "contact" ? (
              <div className="space-y-2 rounded-sm border border-ink-800 p-3">
                <Input
                  label="Contact email"
                  type="email"
                  value={contactDraft.contactEmail}
                  onChange={(e) => setContactDraft((c) => ({ ...c, contactEmail: e.target.value }))}
                  data-testid="edit-contact-email"
                />
                <Input
                  label="Contact URL (optional)"
                  type="url"
                  value={contactDraft.contactUrl}
                  onChange={(e) => setContactDraft((c) => ({ ...c, contactUrl: e.target.value }))}
                  data-testid="edit-contact-url"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() =>
                      void savePatch({
                        contactEmail: contactDraft.contactEmail || null,
                        contactUrl: contactDraft.contactUrl || null,
                      })
                    }
                    data-testid="save-contact"
                  >
                    Save contact
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingField(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : contactHref && contactLabel ? (
              <div className="flex items-center gap-2">
                <a
                  href={contactHref}
                  {...(settings.contactUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-brass px-4 py-2 text-body-md font-medium text-ink-950"
                >
                  {contactLabel}
                  {settings.contactUrl ? (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  )}
                </a>
                {admin && (
                  <button
                    type="button"
                    onClick={() => {
                      setContactDraft({
                        contactEmail: settings.contactEmail ?? "",
                        contactUrl: settings.contactUrl ?? "",
                      });
                      setEditingField("contact");
                    }}
                    aria-label="Edit contact"
                    data-testid="edit-contact"
                  >
                    <Pencil className="h-4 w-4 text-paper-500" />
                  </button>
                )}
              </div>
            ) : admin ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingField("contact")}
                data-testid="add-contact"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Add contact
              </Button>
            ) : null}

            {error && (
              <p className="text-body-sm text-accent-ember" role="alert" data-testid="hero-edit-error">
                {error}
              </p>
            )}
          </div>
        </div>

        {initialFeaturedArtworks.length > 0 && (
          <FeaturedArtwork artworks={initialFeaturedArtworks} />
        )}
      </div>
    </header>
  );
}
