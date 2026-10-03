export const FONT_SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const COLORS = {
  text: "#f8fafc",
  body: "#d1d5db",
  muted: "#9ca3af",
  dim: "#64748b",
  accent: "#34d399",
  rule: "#273244",
  blue: "#60a5fa",
};

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function phase(time: number, start: number, end: number) {
  return clamp01((time - start) / (end - start));
}

export function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export function easeInOut(p: number) {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}

export function easeOut(p: number) {
  return 1 - (1 - p) ** 3;
}
