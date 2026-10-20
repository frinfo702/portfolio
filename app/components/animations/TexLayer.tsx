"use client";

import katex from "katex";
import { useRef, type ComponentProps, type RefObject } from "react";

export type TexOptions = {
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  alpha?: number;
  // Plain text instead of TeX.
  text?: boolean;
  // Trusted markup (our own constants), for two-line labels: <b>title</b><small>sub</small>.
  html?: boolean;
  // Text in the site's font with $...$ spans typeset as math.
  inline?: boolean;
  mono?: boolean;
  // A frosted plate behind the label, for labels drawn over busy fills.
  plate?: boolean;
};

export type Tex = (key: string, source: string, x: number, y: number, options?: TexOptions) => void;

type Node = { el: HTMLSpanElement; source: string; used: boolean };

const SHIFT = { left: "0", center: "-50%", right: "-100%" };

export const texHtml = (source: string) => katex.renderToString(source, { throwOnError: false });

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "row $i$ of $N$": odd segments between dollars are math.
export const texInline = (source: string) =>
  source
    .split("$")
    .map((part, k) => (k % 2 ? texHtml(part) : escape(part)))
    .join("");

// Places a label the way ctx.fillText would: y is the baseline, and the
// context's current alpha carries over.
export function texAt(
  tex: Tex,
  ctx: CanvasRenderingContext2D,
  key: string,
  source: string,
  x: number,
  baseline: number,
  options: TexOptions = {},
) {
  const size = options.size ?? 12;
  tex(key, source, x, baseline - size * 0.35, { ...options, size, alpha: ctx.globalAlpha * (options.alpha ?? 1) });
}

// Canvas cannot typeset math, so labels are DOM nodes laid over the canvas
// and moved every frame. `tex(...)` places one; `flush()` hides the rest.
export function useTexLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, Node>());

  const tex: Tex = (key, source, x, y, options = {}) => {
    const layer = layerRef.current;
    if (!layer) return;
    let node = nodes.current.get(key);
    if (!node) {
      const el = document.createElement("span");
      el.className = "tex-label";
      layer.appendChild(el);
      node = { el, source: "", used: false };
      nodes.current.set(key, node);
    }
    const mode = options.html ? "h" : options.inline ? "i" : options.text ? "t" : "m";
    if (node.source !== mode + source) {
      node.source = mode + source;
      if (options.html) node.el.innerHTML = source;
      else if (options.inline) node.el.innerHTML = texInline(source);
      else if (options.text) node.el.textContent = source;
      else node.el.innerHTML = texHtml(source);
    }
    const { style } = node.el;
    style.transform = `translate(${x}px, ${y}px) translate(${SHIFT[options.align ?? "left"]}, -50%)`;
    style.fontSize = `${options.size ?? 12}px`;
    style.color = options.color ?? "";
    style.opacity = String(options.alpha ?? 1);
    node.el.classList.toggle("tex-plate", options.plate ?? false);
    node.el.classList.toggle("tex-text", (options.text || options.mono) ?? false);
    node.el.classList.toggle("tex-html", options.html ?? false);
    node.used = true;
  };

  const flush = () => {
    nodes.current.forEach((node) => {
      if (!node.used) node.el.style.opacity = "0";
      node.used = false;
    });
  };

  return { layerRef, tex, flush };
}

type StageProps = ComponentProps<"canvas"> & {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  layerRef: RefObject<HTMLDivElement | null>;
};

export function CanvasStage({ canvasRef, layerRef, ...canvas }: StageProps) {
  return (
    <div className="canvas-stage">
      <canvas ref={canvasRef} {...canvas} />
      <div className="tex-layer" ref={layerRef} aria-hidden="true" />
    </div>
  );
}
