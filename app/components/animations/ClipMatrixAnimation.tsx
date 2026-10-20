"use client";

import katex from "katex";
import { useRef, useState } from "react";
import {
  COLORS,
  FONT_MONO,
  FONT_SANS,
  PAIR_COLORS,
  clamp01,
  easeInOut,
  hash01,
  lerp,
  phase,
  softmax,
} from "./canvas";
import { CanvasStage, texAt, useTexLayer, type Tex } from "./TexLayer";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";
import { Figure } from "./Figure";

type Mode = "softmax" | "sigmoid";

const N = 6;
const CAPTIONS = ["dog", "cat", "car", "tree", "cup", "bird"];
// 1/τ for CLIP, t for SigLIP
const SCALE = 10;
const BIAS = -7;
const LOOP = 10;
const TRAIN = [0.6, 6.6] as const;
const PAD = 16;
const CURVE_POINTS = 80;
const ROW_STEP = 1.4;

const MODES: Record<Mode, { label: string; note: string }> = {
  softmax: {
    label: "CLIP · softmax",
    note: "softmax over each row: the row competes, so it sums to 1",
  },
  sigmoid: {
    label: "SigLIP · sigmoid",
    note: "an independent sigmoid per cell: rows need not sum to 1",
  },
};

const tex = (source: string) => katex.renderToString(source, { throwOnError: false });

const CAPTION = `A toy batch of six pairs, drawn in two dimensions. Squares are image embeddings ${tex("u_i")}, dots are caption embeddings ${tex("v_j")}, and each matrix cell is computed from the angle between them, since ${tex("u_i^\\top v_j = \\cos\\theta_{ij}")}. Dashed cells are the correct pairs. Hover a cell to see its angle. Dog and cat end up close, so their off-diagonal cells stay lit.`;

const TAU = Math.PI * 2;
// Where each pair ends up on the circle. Dog and cat land close together.
const TARGET = [0.15, 0.75, 2.2, 3.25, 4.3, 5.35];
const IMAGE_START = TARGET.map((_, i) => hash01(i, 1) * TAU);
const TEXT_START = TARGET.map((_, i) => hash01(i, 2) * TAU);

function turn(from: number, to: number, p: number) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return from + d * p;
}

function angles(progress: number) {
  const g = easeInOut(progress);
  return {
    image: IMAGE_START.map((a, i) => turn(a, TARGET[i] - 0.05, g)),
    text: TEXT_START.map((a, i) => turn(a, TARGET[i] + 0.05, g)),
  };
}

// u_i · v_j for unit vectors is the cosine of the angle between them.
function cosines(progress: number) {
  const { image, text } = angles(progress);
  return image.map((a) => text.map((b) => Math.cos(a - b)));
}

function probabilities(cos: number[][], mode: Mode) {
  if (mode === "sigmoid") {
    return cos.map((row) => row.map((c) => 1 / (1 + Math.exp(-(SCALE * c + BIAS)))));
  }
  return cos.map((row) => softmax(row.map((c) => SCALE * c)));
}

function softplus(x: number) {
  return Math.log1p(Math.exp(-Math.abs(x))) + Math.max(x, 0);
}

function loss(cos: number[][], mode: Mode) {
  if (mode === "sigmoid") {
    let total = 0;
    cos.forEach((row, i) =>
      row.forEach((c, j) => {
        total += softplus(-(i === j ? 1 : -1) * (SCALE * c + BIAS));
      }),
    );
    return total / N;
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const rows = cos.map((row, i) => -Math.log(softmax(row.map((c) => SCALE * c))[i]));
  const cols = cos.map((_, j) => -Math.log(softmax(cos.map((row) => SCALE * row[j]))[j]));
  return (mean(rows) + mean(cols)) / 2;
}

const curves: Record<Mode, number[]> = { softmax: [], sigmoid: [] };

function curve(mode: Mode) {
  if (curves[mode].length === 0) {
    curves[mode] = Array.from({ length: CURVE_POINTS + 1 }, (_, k) =>
      loss(cosines(k / CURVE_POINTS), mode),
    );
  }
  return curves[mode];
}

// wide: circle, matrix, and curve in a row. medium (the article column):
// circle and matrix side by side, curve underneath. narrow: all stacked.
function layout(width: number) {
  const mode = width >= 760 ? "wide" : width >= 500 ? "medium" : "narrow";
  const narrow = mode !== "wide";
  const top = 34;
  const radius =
    mode === "wide" ? 108 : mode === "medium" ? Math.min(76, width * 0.15) : Math.min(92, (width - PAD * 2) / 2 - 40);
  const circleX = PAD + radius + 34;
  const circleY = top + radius + 26;
  const matrixX = mode === "wide" ? circleX + radius + 92 : mode === "medium" ? circleX + radius + 70 : PAD + 40;
  const cell =
    mode === "wide" ? 36 : Math.min(32, (mode === "medium" ? width - matrixX - 56 - PAD : width - PAD * 2 - 80) / N);
  const matrixY = mode === "narrow" ? circleY + radius + 76 : top + 44;
  const below = Math.max(circleY + radius + 44, matrixY + cell * N + 30);
  const chartX = mode === "wide" ? matrixX + cell * N + 80 : PAD + 30;
  const chartY = mode === "wide" ? matrixY : mode === "medium" ? below + 26 : matrixY + cell * N + 54;
  const chartW = width - chartX - PAD;
  const chartH = mode === "wide" ? cell * N : 90;
  const height = mode === "wide" ? Math.max(circleY + radius + 40, matrixY + cell * N + 44) : chartY + chartH + 30;
  return { narrow, radius, circleX, circleY, cell, matrixX, matrixY, chartX, chartY, chartW, chartH, height };
}

type Layout = ReturnType<typeof layout>;

function cellColor(value: number) {
  const v = clamp01(value) ** 0.7;
  const from = [22, 25, 28];
  const to = [214, 219, 224];
  return `rgb(${from.map((c, k) => Math.round(c + (to[k] - c) * v)).join(", ")})`;
}

function drawCircle(
  tex: Tex,
  ctx: CanvasRenderingContext2D,
  l: Layout,
  progress: number,
  probs: number[][],
  focus: { row: number; col: number | null },
) {
  const { image, text } = angles(progress);
  const { circleX: cx, circleY: cy, radius: r } = l;
  const small = `${l.narrow ? 10 : 11}px ${FONT_MONO}`;

  ctx.strokeStyle = COLORS.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.font = small;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText("unit sphere (2-D sketch)", l.circleX - r - 30, l.circleY - r - 22);

  const at = (a: number, scale = 1) => [cx + Math.cos(a) * r * scale, cy - Math.sin(a) * r * scale];

  // lines from the focused image to each caption, as thick as its probability
  const row = focus.row;
  text.forEach((b, j) => {
    if (focus.col !== null && focus.col !== j) return;
    const [ix, iy] = at(image[row]);
    const [tx, ty] = at(b);
    ctx.globalAlpha = focus.col !== null ? 0.9 : 0.15 + 0.85 * probs[row][j];
    ctx.strokeStyle = PAIR_COLORS[j];
    ctx.lineWidth = focus.col !== null ? 1.5 : 0.5 + 3 * probs[row][j];
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  if (focus.col !== null) {
    // the angle between u_i and v_j, whose cosine is the matrix entry
    const a = image[row];
    const b = text[focus.col];
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, -a, -(a + d), d > 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(...(at(a) as [number, number]));
    ctx.moveTo(cx, cy);
    ctx.lineTo(...(at(b) as [number, number]));
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = small;
    texAt(tex, ctx, "cos", `\\cos\\theta = ${Math.cos(d).toFixed(2)}`, cx, cy + 4, { size: 12, color: COLORS.text, align: "center", plate: true });
  }

  text.forEach((b, j) => {
    const [x, y] = at(b);
    ctx.fillStyle = PAIR_COLORS[j];
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, TAU);
    ctx.fill();
    const [lx, ly] = at(b, 1.22);
    ctx.font = `${l.narrow ? 10 : 11}px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.body;
    ctx.fillText(`“${CAPTIONS[j]}”`, lx, ly + 4);
    ctx.textAlign = "left";
  });
  image.forEach((a, i) => {
    const [x, y] = at(a);
    ctx.fillStyle = PAIR_COLORS[i];
    ctx.fillRect(x - 5, y - 5, 10, 10);
    if (i === row) {
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 7.5, y - 7.5, 15, 15);
    }
  });
}

function drawMatrix(
  tex: Tex,
  ctx: CanvasRenderingContext2D,
  l: Layout,
  probs: number[][],
  mode: Mode,
  focus: { row: number; col: number | null },
) {
  const { cell, matrixX: mx, matrixY: my } = l;
  const small = `${l.narrow ? 9 : 10}px ${FONT_MONO}`;

  CAPTIONS.forEach((caption, j) => {
    ctx.fillStyle = PAIR_COLORS[j];
    ctx.beginPath();
    ctx.arc(mx + cell * (j + 0.5), my - 22, 4, 0, TAU);
    ctx.fill();
    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "center";
    ctx.fillText(caption, mx + cell * (j + 0.5), my - 6);
    ctx.textAlign = "left";
  });

  probs.forEach((row, i) => {
    const y = my + i * cell;
    ctx.fillStyle = PAIR_COLORS[i];
    ctx.fillRect(mx - 30, y + cell / 2 - 5, 10, 10);
    ctx.font = small;
    ctx.fillStyle = COLORS.dim;
    texAt(tex, ctx, `row-${i}`, `I_${i + 1}`, mx - 18, y + cell / 2 + 3.5, { size: 11, color: COLORS.muted });

    row.forEach((p, j) => {
      const x = mx + j * cell;
      ctx.fillStyle = cellColor(p);
      ctx.fillRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      if (cell >= 28) {
        ctx.fillStyle = p > 0.55 ? "#101214" : p > 0.08 ? COLORS.text : COLORS.dim;
        ctx.textAlign = "center";
        ctx.fillText(p.toFixed(2), x + cell / 2, y + cell / 2 + 3.5);
        ctx.textAlign = "left";
      }
    });

    // Row sums make the softmax/sigmoid difference concrete.
    const sum = row.reduce((a, b) => a + b, 0);
    ctx.fillStyle = mode === "softmax" ? COLORS.muted : COLORS.text;
    texAt(tex, ctx, `sum-${i}`, `\\Sigma = ${sum.toFixed(2)}`, mx + cell * N + 8, y + cell / 2 + 3.5, {
      size: 11,
      color: mode === "softmax" ? COLORS.muted : COLORS.text,
    });
  });

  ctx.strokeStyle = "rgba(232, 234, 236, 0.55)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i < N; i += 1) {
    ctx.strokeRect(mx + i * cell + 0.5, my + i * cell + 0.5, cell - 1, cell - 1);
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = 1.5;
  if (focus.col === null) {
    ctx.strokeRect(mx - 1, my + focus.row * cell - 1, cell * N + 2, cell + 2);
  } else {
    ctx.strokeRect(mx + focus.col * cell - 1, my + focus.row * cell - 1, cell + 2, cell + 2);
  }
}

function drawChart(tex: Tex, ctx: CanvasRenderingContext2D, l: Layout, points: number[], progress: number, value: number) {
  const max = points[0] * 1.05;
  const toX = (k: number) => l.chartX + (k / CURVE_POINTS) * l.chartW;
  const toY = (v: number) => l.chartY + l.chartH - (v / max) * l.chartH;

  ctx.strokeStyle = COLORS.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(l.chartX, l.chartY);
  ctx.lineTo(l.chartX, l.chartY + l.chartH);
  ctx.lineTo(l.chartX + l.chartW, l.chartY + l.chartH);
  ctx.stroke();

  ctx.fillStyle = COLORS.dim;
  ctx.font = `10px ${FONT_MONO}`;
  texAt(tex, ctx, "loss", `$\\mathcal{L} = ${value.toFixed(3)}$ · step ${Math.round(progress * 1000)}`, l.chartX, l.chartY - 10, {
    size: 11,
    color: COLORS.muted,
    inline: true,
    mono: true,
  });
  ctx.textAlign = "right";
  ctx.fillText("step", l.chartX + l.chartW, l.chartY + l.chartH + 14);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  points.forEach((v, k) => (k === 0 ? ctx.moveTo(toX(k), toY(v)) : ctx.lineTo(toX(k), toY(v))));
  ctx.stroke();
  ctx.setLineDash([]);

  const last = Math.floor(progress * CURVE_POINTS);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k <= last; k += 1) {
    if (k === 0) ctx.moveTo(toX(k), toY(points[k]));
    else ctx.lineTo(toX(k), toY(points[k]));
  }
  ctx.stroke();
  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.arc(toX(last), toY(points[last]), 3.5, 0, TAU);
  ctx.fill();
}

export default function ClipMatrixAnimation() {
  const [mode, setMode] = useState<Mode>("softmax");
  const modeRef = useRef<Mode>("softmax");
  const hover = useRef<{ row: number; col: number } | null>(null);

  const { layerRef, tex, flush } = useTexLayer();

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const current = modeRef.current;
    const t = time % LOOP;
    const l = layout(width);
    const progress = phase(t, ...TRAIN);
    const cos = cosines(progress);
    const probs = probabilities(cos, current);
    const focus = hover.current ?? { row: Math.floor(time / ROW_STEP) % N, col: null };
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.text;
    ctx.font = `500 ${l.narrow ? 12 : 14}px ${FONT_SANS}`;
    ctx.fillText(MODES[current].note, PAD, 18);

    const fadeIn = lerp(0.2, 1, phase(t, 0, 0.4)) * (1 - 0.8 * phase(t, LOOP - 0.4, LOOP));
    ctx.globalAlpha = fadeIn;
    drawCircle(tex, ctx, l, progress, probs, focus);
    drawMatrix(tex, ctx, l, probs, current, focus);
    drawChart(tex, ctx, l, curve(current), progress, loss(cos, current));
    ctx.globalAlpha = 1;
    flush();
  };

  const { canvasRef, seek, redraw } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: 8,
  });

  const select = (next: Mode) => {
    modeRef.current = next;
    setMode(next);
    seek(0);
  };

  const pick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const l = layout(rect.width);
    const col = Math.floor((event.clientX - rect.left - l.matrixX) / l.cell);
    const row = Math.floor((event.clientY - rect.top - l.matrixY) / l.cell);
    hover.current = row >= 0 && row < N && col >= 0 && col < N ? { row, col } : null;
    redraw();
  };

  return (
    <Figure>
      <div className="post-animation-controls" role="group" aria-label="Loss">
        {(Object.keys(MODES) as Mode[]).map((key) => (
          <button key={key} type="button" aria-pressed={mode === key} onClick={() => select(key)}>
            {MODES[key].label}
          </button>
        ))}
      </div>
      <CanvasStage
        canvasRef={canvasRef}
        layerRef={layerRef}
        role="img"
        aria-label="Six images (squares) and six captions (dots) on a unit circle. As training proceeds each image moves next to its caption, the diagonal of the 6 by 6 probability matrix brightens, and the loss curve falls."
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => {
          hover.current = null;
        }}
      />
      <figcaption dangerouslySetInnerHTML={{ __html: CAPTION }} />
    </Figure>
  );
}
