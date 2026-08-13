export const NSFW_PREFERENCE_CHANGED = "bushart-nsfw-preference-changed";

export function dispatchNsfwPreferenceChanged(value: "include" | "exclude"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NSFW_PREFERENCE_CHANGED, { detail: { nsfw: value } }),
  );
}
