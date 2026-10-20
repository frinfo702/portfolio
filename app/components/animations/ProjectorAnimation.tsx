"use client";

import { useRef, useState } from "react";
import {
  COLORS,
  FONT_MONO,
  FONT_SANS,
  easeInOut,
  hash01,
  phase,
  textColor,
  visionColor,
} from "./canvas";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";
import { Figure } from "./Figure";

type Mode = "mlp" | "merge" | "resampler";

const GRID = 4;
const N = GRID * GRID;
const QUERIES = 6;
const LOOP = 3.6;
const PAD = 16;

const MODES: Record<
  Mode,
  { label: string; out: number; llava: number; note: string }
> = {
  mlp: {
    label: "MLP (LLaVA-1.5)",
    out: N,
    llava: 576,
    note: "one in, one out · width 1024 → 4096",
  },
  merge: {
    label: "2×2 merge",
    out: N / 4,
    llava: 144,
    note: "four neighbors concatenated · N/4 tokens, 4× channels",
  },
  resampler: {
    label: "Q-Former / resampler",
    out: QUERIES,
    llava: 64,
    note: "M learned queries cross-attend to all patches · M is fixed",
  },
};

const value = (i: number) => 0.25 + 0.6 * hash01(i, 3);

function layout(width: number) {
  const narrow = width < 560;
  const block = narrow ? Math.min(118, width * 0.34) : 200;
  const top = 30;
  const inX = PAD;
  const outX = width - PAD - block;
  return { narrow, block, top, inX, outX, height: top + block + 84 };
}

type Layout = ReturnType<typeof layout>;

function inputCell(i: number, l: Layout) {
  const c = l.block / GRID;
  return { x: l.inX + (i % GRID) * c, y: l.top + Math.floor(i / GRID) * c, s: c };
}

function outputs(mode: Mode, l: Layout) {
  if (mode === "mlp") return Array.from({ length: N }, (_, i) => inputCell(i, { ...l, inX: l.outX }));
  if (mode === "merge") {
    const c = l.block / 2;
    return Array.from({ length: 4 }, (_, k) => ({ x: l.outX + (k % 2) * c, y: l.top + Math.floor(k / 2) * c, s: c }));
  }
  const s = Math.min(l.block / QUERIES, 34);
  const x = l.outX + (l.block - s) / 2;
  return Array.from({ length: QUERIES }, (_, k) => ({ x, y: l.top + k * (l.block / QUERIES) + (l.block / QUERIES - s) / 2, s }));
}

// Which inputs feed output k, with what weight.
function sources(mode: Mode, k: number) {
  if (mode === "mlp") return [[k, 1]];
  if (mode === "merge") {
    const r = Math.floor(k / 2) * 2;
    const c = (k % 2) * 2;
    return [r * GRID + c, r * GRID + c + 1, (r + 1) * GRID + c, (r + 1) * GRID + c + 1].map((i) => [i, 1]);
  }
  return Array.from({ length: N }, (_, i) => [i, hash01(k, i) ** 3]);
}

export default function ProjectorAnimation() {
  const [mode, setMode] = useState<Mode>("mlp");
  const modeRef = useRef<{ mode: Mode; since: number; time: number }>({ mode: "mlp", since: 0, time: 0 });

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const l = layout(width);
    const state = modeRef.current;
    state.time = time;
    const current = state.mode;
    const t = (time - state.since) % LOOP;
    const flow = easeInOut(phase(t, 0.3, 1.8));
    const arrive = phase(t, 1.5, 2.1);
    const small = `${l.narrow ? 10 : 11}px ${FONT_MONO}`;

    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`ViT output · N = ${N}`, l.inX, l.top - 12);
    ctx.fillText(`to the LLM · ${MODES[current].out} tokens`, l.outX, l.top - 12);

    const outs = outputs(current, l);
    outs.forEach((out, k) => {
      const feed = sources(current, k);
      const max = Math.max(...feed.map(([, w]) => w));
      feed.forEach(([i, w]) => {
        const from = inputCell(i, l);
        const fx = from.x + from.s / 2;
        const fy = from.y + from.s / 2;
        const tx = out.x + out.s / 2;
        const ty = out.y + out.s / 2;
        const strength = w / max;
        if (strength < 0.08) return;
        ctx.globalAlpha = 0.08 + 0.25 * strength;
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.bezierCurveTo((fx + tx) / 2, fy, (fx + tx) / 2, ty, tx, ty);
        ctx.stroke();
        // a packet of the input's color rides each connection
        if (flow > 0 && flow < 1) {
          const p = flow;
          const mx = (fx + tx) / 2;
          const bx = (1 - p) ** 3 * fx + 3 * (1 - p) ** 2 * p * mx + 3 * (1 - p) * p ** 2 * mx + p ** 3 * tx;
          const by = (1 - p) ** 3 * fy + 3 * (1 - p) ** 2 * p * fy + 3 * (1 - p) * p ** 2 * ty + p ** 3 * ty;
          ctx.globalAlpha = 0.35 + 0.65 * strength;
          ctx.fillStyle = visionColor(value(i) + 0.15);
          ctx.beginPath();
          ctx.arc(bx, by, 1.5 + 2 * strength, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      const pad = current === "merge" ? 3 : 2;
      ctx.fillStyle = COLORS.rule;
      ctx.fillRect(out.x + pad, out.y + pad, out.s - pad * 2, out.s - pad * 2);
      ctx.globalAlpha = 0.45 + 0.55 * arrive;
      if (current === "merge") {
        // the four neighbors survive as four channel bands
        const band = (out.s - pad * 2) / 4;
        feed.forEach(([i], b) => {
          ctx.fillStyle = textColor(value(i));
          ctx.fillRect(out.x + pad + b * band, out.y + pad, band - 1, out.s - pad * 2);
        });
      } else {
        ctx.fillStyle = textColor(current === "mlp" ? value(k) : 0.35 + 0.1 * k);
        ctx.fillRect(out.x + pad, out.y + pad, out.s - pad * 2, out.s - pad * 2);
      }
      ctx.globalAlpha = 1;
    });

    // Inputs go on top so the connections appear to leave from under them.
    for (let i = 0; i < N; i += 1) {
      const { x, y, s } = inputCell(i, l);
      ctx.fillStyle = visionColor(value(i));
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    }
    if (current === "merge") {
      const c = l.block / 2;
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k += 1) {
        ctx.strokeRect(l.inX + (k % 2) * c + 0.5, l.top + Math.floor(k / 2) * c + 0.5, c - 1, c - 1);
      }
    }

    // The cost at LLaVA scale: a 4096-token context and 576 patches.
    const by = l.top + l.block + 40;
    const bw = width - PAD * 2;
    ctx.fillStyle = COLORS.rule;
    ctx.fillRect(PAD, by, bw, 10);
    const used = MODES[current].llava / 4096;
    ctx.fillStyle = visionColor(0.65);
    ctx.fillRect(PAD, by, bw * used, 10);
    ctx.font = `500 ${l.narrow ? 12 : 14}px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(MODES[current].note, PAD, by - 12);
    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(
      `at 336 px: ${MODES[current].llava} of 4,096 context tokens go to the image`,
      PAD,
      by + 28,
    );
  };

  const { canvasRef, redraw } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: 2.4,
  });

  const select = (next: Mode) => {
    modeRef.current = { mode: next, since: modeRef.current.time, time: modeRef.current.time };
    setMode(next);
    redraw();
  };

  return (
    <Figure spaces>
      <div className="post-animation-controls" role="group" aria-label="Projector">
        {(Object.keys(MODES) as Mode[]).map((key) => (
          <button key={key} type="button" aria-pressed={mode === key} onClick={() => select(key)}>
            {MODES[key].label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Sixteen patch tokens on the left are mapped to tokens for the language model on the right: one to one for an MLP, four to one for a 2 by 2 merge, and sixteen to a fixed six for a resampler."
      />
      <figcaption>
        Blue-grey squares are encoder features, warm squares are vectors in the language
        model&apos;s space. The bar shows the share of a 4,096-token context that one 336 px image
        uses under each design.
      </figcaption>
    </Figure>
  );
}
