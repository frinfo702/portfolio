export const FONT_SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif';
export const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const COLORS = {
  background: "#0c0e10",
  surface: "#131619",
  text: "#ece8df",
  body: "#b4b6b5",
  muted: "#858a8e",
  dim: "#565c62",
  accent: "#cfd7de",
  rule: "#1f2428",
  blue: "#8ea3b8",
};

// Vectors live in one of two spaces: the vision encoder's, drawn cool, and
// the language model's, drawn warm. A token changing tint means it moved.
export function visionColor(value: number) {
  return `hsl(212 16% ${16 + value * 50}%)`;
}

export function textColor(value: number) {
  return `hsl(36 24% ${18 + value * 58}%)`;
}

// Muted hues for telling paired items apart (image i belongs with caption i).
export const PAIR_COLORS = [
  "#d39a74",
  "#c9b46e",
  "#86b08f",
  "#7fa6c4",
  "#a493c9",
  "#c68aa8",
];

export function hash01(a: number, b = 0) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

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

// Opacity for a scene that fades in at `start` and out at `end`.
export function window01(time: number, start: number, end: number, fade = 0.35) {
  return phase(time, start, start + fade) * (1 - phase(time, end - fade, end));
}

export function softmax(values: number[]) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}
