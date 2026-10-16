import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

export const FONT_SANS = `${GeistSans.style.fontFamily}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
export const FONT_MONO = `${GeistMono.style.fontFamily}, ui-monospace, SFMono-Regular, Menlo, monospace`;

export const COLORS = {
  text: "#ededed",
  body: "#b8b8b8",
  muted: "#8a8a8a",
  dim: "#5e5e5e",
  accent: "#ff3b3b",
  rule: "#222222",
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
