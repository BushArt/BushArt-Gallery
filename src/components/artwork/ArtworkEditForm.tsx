"use client";

import { useCallback, useState, type FormEvent } from "react";
import { uploadFileToCloudinary } from "@/lib/cloudinary/uploadClient";
import type { ArtworkDetailResponse } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TagPicker, useTagsList } from "@/components/admin/TagPicker";

interface EditableImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
  order: number;
}

interface EditableTimelapse {
  publicId: string;
  url: string;
  durationSeconds: number;
  width: number;
  height: number;
}

interface ArtworkEditFormProps {
  artwork: ArtworkDetailResponse;
  onSave: (updated: ArtworkDetailResponse) => void;
  onCancel: () => void;
}

function toEditableImages(artwork: ArtworkDetailResponse): EditableImage[] {
  return [...artwork.images]
    .sort((a, b) => a.order - b.order)
    .map((img, index) => ({
      publicId: img.publicId,
      url: img.url ?? `https://res.cloudinary.com/placeholder/${img.publicId}`,
      width: img.width,
      height: img.height,
      order: index,
    }));
}

export function ArtworkEditForm({ artwork, onSave, onCancel }: ArtworkEditFormProps) {
  const { tags, createTag } = useTagsList();

  const [title, setTitle] = useState(artwork.title);
  const [description, setDescription] = useState(artwork.description ?? "");
  const [medium, setMedium] = useState(artwork.medium);
  const [completionDate, setCompletionDate] = useState(
    artwork.completionDate.slice(0, 10),
  );
  const [type, setType] = useState<"personal" | "commission">(artwork.type);
  const [nsfw, setNsfw] = useState(artwork.nsfw);
  const [tagIds, setTagIds] = useState(artwork.tags.map((t) => t.id));
  const [images, setImages] = useState<EditableImage[]>(() => toEditableImages(artwork));
  const [imagesDirty, setImagesDirty] = useState(false);
  const [timelapse, setTimelapse] = useState<EditableTimelapse | null>(
    artwork.timelapse
      ? {
          publicId: artwork.timelapse.publicId,
          url: "",
          durationSeconds: artwork.timelapse.durationSeconds,
          width: artwork.timelapse.width,
          height: artwork.timelapse.height,
        }
      : null,
  );
  const [timelapseDirty, setTimelapseDirty] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [featured, setFeatured] = useState(artwork.featured);
  const [featuredOrder, setFeaturedOrder] = useState<string>(
    artwork.featuredOrder != null ? String(artwork.featuredOrder) : "",
  );
  const [featuredDirty, setFeaturedDirty] = useState(false);
  const [featuredOrderError, setFeaturedOrderError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeaturedChange = useCallback((checked: boolean) => {
    setFeaturedDirty(true);
    setFeatured(checked);
    if (!checked) {
      setFeaturedOrder("");
      setFeaturedOrderError(null);
    }
  }, []);

  const handleAddImages = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadProgress("Uploading images…");
    setError(null);
    try {
      const uploaded: EditableImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const result = await uploadFileToCloudinary(files[i], "image");
        uploaded.push({
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          order: images.length + i,
        });
      }
      setImages((prev) => [...prev, ...uploaded].map((img, index) => ({ ...img, order: index })));
      setImagesDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadProgress(null);
    }
  }, [images.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })));
    setImagesDirty(true);
  }, []);

  const handleTimelapseFile = useCallback(async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploadProgress("Uploading timelapse…");
    setError(null);
    try {
      const result = await uploadFileToCloudinary(files[0], "video");
      setTimelapse({
        publicId: result.public_id,
        url: result.secure_url,
        durationSeconds: result.duration ?? 0,
        width: result.width,
        height: result.height,
      });
      setTimelapseDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Timelapse upload failed");
    } finally {
      setUploadProgress(null);
    }
  }, []);

  const handleRemoveTimelapse = useCallback(() => {
    setTimelapse(null);
    setTimelapseDirty(true);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError(null);
      setFeaturedOrderError(null);

      if (images.length === 0) {
        setError("At least one image is required");
        return;
      }

      if (featuredDirty && featured) {
        const order = Number(featuredOrder);
        if (!featuredOrder.trim() || Number.isNaN(order)) {
          setFeaturedOrderError("Featured order is required when featured is on");
          return;
        }
      }

      setIsSubmitting(true);
      try {
        const body: Record<string, unknown> = {
          title,
          description: description || null,
          medium,
          type,
          nsfw,
          completionDate: new Date(completionDate).toISOString(),
          tagIds,
        };

        if (imagesDirty) {
          body.images = images;
        }

        if (timelapseDirty) {
          body.timelapse = timelapse;
        }

        if (featuredDirty) {
          if (featured) {
            body.featured = true;
            body.featuredOrder = Number(featuredOrder);
          } else {
            body.featured = false;
            body.featuredOrder = null;
          }
        }

        const res = await fetch(`/api/artworks/${artwork.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error?.message ?? "Save failed");
        }

        const updated = (await res.json()) as ArtworkDetailResponse;
        onSave(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      artwork.id,
      completionDate,
      description,
      featured,
      featuredDirty,
      featuredOrder,
      images,
      imagesDirty,
      medium,
      nsfw,
      onSave,
      tagIds,
      timelapse,
      timelapseDirty,
      title,
      type,
    ],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4" data-testid="artwork-edit-form">
      <div className="space-y-2">
        <label className="block text-body-sm text-paper-500">Images</label>
        <ul className="space-y-1">
          {images.map((img, index) => (
            <li
              key={`${img.publicId}-${index}`}
              className="flex items-center justify-between rounded-sm border border-ink-800 px-3 py-2 text-body-sm text-paper-300"
            >
              <span>{img.publicId.split("/").pop()}</span>
              <Button
                type="button"
                variant="ghost"
                className="text-accent-ember"
                onClick={() => handleRemoveImage(index)}
                disabled={images.length <= 1}
                data-testid={`remove-image-${index}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => void handleAddImages(e.target.files)}
          className="text-body-sm text-paper-300"
          data-testid="edit-add-images"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-body-sm text-paper-500">Timelapse (optional)</label>
        {timelapse ? (
          <div className="flex items-center justify-between rounded-sm border border-ink-800 px-3 py-2 text-body-sm text-paper-300">
            <span>{timelapse.publicId.split("/").pop()}</span>
            <Button type="button" variant="ghost" className="text-accent-ember" onClick={handleRemoveTimelapse}>
              Remove
            </Button>
          </div>
        ) : null}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => void handleTimelapseFile(e.target.files)}
          className="text-body-sm text-paper-300"
          data-testid="edit-timelapse-input"
        />
      </div>

      <Input
        label="Title"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        data-testid="edit-title"
      />
      <div className="space-y-1">
        <label htmlFor="edit-description" className="block text-body-sm text-paper-500">
          Description
        </label>
        <textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-sm border border-ink-700 bg-ink-900 px-3 py-2 text-body-md text-paper-100"
        />
      </div>
      <Input
        label="Medium"
        name="medium"
        value={medium}
        onChange={(e) => setMedium(e.target.value)}
        required
      />
      <Input
        label="Completion date"
        name="completionDate"
        type="date"
        value={completionDate}
        onChange={(e) => setCompletionDate(e.target.value)}
        required
      />

      <fieldset className="space-y-2">
        <legend className="text-body-sm text-paper-500">Type</legend>
        <div className="flex gap-4">
          {(["personal", "commission"] as const).map((value) => (
            <label key={value} className="flex items-center gap-2 text-body-md text-paper-300">
              <input
                type="radio"
                name="edit-type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
              />
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-body-md text-paper-300">
        <input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} />
        NSFW
      </label>

      <TagPicker
        tags={tags}
        selectedIds={tagIds}
        onChange={setTagIds}
        onCreateTag={createTag}
        disabled={isSubmitting}
      />

      <fieldset className="space-y-2 rounded-sm border border-ink-800 p-3" data-testid="featured-fields">
        <legend className="text-body-sm text-paper-500">Featured on homepage</legend>
        <label className="flex items-center gap-2 text-body-md text-paper-300">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => handleFeaturedChange(e.target.checked)}
            data-testid="edit-featured"
          />
          Featured
        </label>
        {featured && (
          <Input
            label="Featured order"
            name="featuredOrder"
            type="number"
            min={0}
            value={featuredOrder}
            onChange={(e) => {
              setFeaturedDirty(true);
              setFeaturedOrder(e.target.value);
              setFeaturedOrderError(null);
            }}
            error={featuredOrderError}
            data-testid="edit-featured-order"
          />
        )}
      </fieldset>

      {uploadProgress && (
        <p className="text-body-sm text-paper-500" aria-live="polite">
          {uploadProgress}
        </p>
      )}
      {error && (
        <p className="text-body-sm text-accent-ember" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting} data-testid="edit-save">
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
