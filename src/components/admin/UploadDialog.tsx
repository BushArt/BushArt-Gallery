"use client";

import { useCallback, useId, useState, type FormEvent } from "react";
import { uploadFileToCloudinary } from "@/lib/cloudinary/uploadClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TagPicker, useTagsList } from "./TagPicker";

interface UploadDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadedImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
  order: number;
}

export function UploadDialog({ onClose, onSuccess }: UploadDialogProps) {
  const titleId = useId();
  const { tags, createTag } = useTagsList();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [type, setType] = useState<"personal" | "commission">("personal");
  const [nsfw, setNsfw] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [timelapse, setTimelapse] = useState<{
    publicId: string;
    url: string;
    durationSeconds: number;
    width: number;
    height: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handleImageFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadProgress("Uploading images…");
    setError(null);
    try {
      const uploaded: UploadedImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFileToCloudinary(file, "image");
        uploaded.push({
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          order: images.length + i,
        });
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadProgress(null);
    }
  }, [images.length]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Timelapse upload failed");
    } finally {
      setUploadProgress(null);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError(null);

      if (images.length === 0) {
        setError("At least one image is required");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch("/api/artworks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || null,
            medium,
            type,
            nsfw,
            completionDate: new Date(completionDate).toISOString(),
            images,
            timelapse,
            tagIds,
            featured: false,
            featuredOrder: null,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? "Failed to create artwork");
        }

        onSuccess();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create artwork");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      completionDate,
      description,
      images,
      medium,
      nsfw,
      onClose,
      onSuccess,
      tagIds,
      timelapse,
      title,
      type,
    ],
  );

  return (
    <Modal onClose={onClose} testId="upload-dialog" labelledBy={titleId} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 p-6" data-testid="upload-form">
        <h2 id={titleId} className="font-fraunces text-display-sm text-paper-100">
          Upload artwork
        </h2>

        <div className="space-y-2">
          <label className="block text-body-sm text-paper-500">Images</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => void handleImageFiles(e.target.files)}
            className="text-body-sm text-paper-300"
            data-testid="upload-images-input"
          />
          {images.length > 0 && (
            <p className="text-body-sm text-paper-500">{images.length} image(s) ready</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-body-sm text-paper-500">Timelapse (optional)</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => void handleTimelapseFile(e.target.files)}
            className="text-body-sm text-paper-300"
            data-testid="upload-timelapse-input"
          />
          {timelapse && (
            <p className="text-body-sm text-paper-500">Timelapse attached</p>
          )}
        </div>

        <Input
          label="Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          data-testid="upload-title"
        />
        <div className="space-y-1">
          <label htmlFor="upload-description" className="block text-body-sm text-paper-500">
            Description
          </label>
          <textarea
            id="upload-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-sm border border-ink-700 bg-ink-900 px-3 py-2 text-body-md text-paper-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
            data-testid="upload-description"
          />
        </div>
        <Input
          label="Medium"
          name="medium"
          value={medium}
          onChange={(e) => setMedium(e.target.value)}
          required
          data-testid="upload-medium"
        />
        <Input
          label="Completion date"
          name="completionDate"
          type="date"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          required
          data-testid="upload-completion-date"
        />

        <fieldset className="space-y-2">
          <legend className="text-body-sm text-paper-500">Type</legend>
          <div className="flex gap-4">
            {(["personal", "commission"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2 text-body-md text-paper-300">
                <input
                  type="radio"
                  name="type"
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
          <input
            type="checkbox"
            checked={nsfw}
            onChange={(e) => setNsfw(e.target.checked)}
            data-testid="upload-nsfw"
          />
          NSFW
        </label>

        <TagPicker
          tags={tags}
          selectedIds={tagIds}
          onChange={setTagIds}
          onCreateTag={createTag}
          disabled={isSubmitting}
        />

        {uploadProgress && (
          <p className="text-body-sm text-paper-500" aria-live="polite">
            {uploadProgress}
          </p>
        )}
        {error && (
          <p className="text-body-sm text-accent-ember" role="alert" data-testid="upload-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} data-testid="upload-submit">
            {isSubmitting ? "Saving…" : "Upload"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
