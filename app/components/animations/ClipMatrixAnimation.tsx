"use client";

import katex from "katex";
import { useRef, useState } from "react";
import { COLORS, FONT_MONO, FONT_SANS, clamp01, phase } from "./canvas";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";

type Mode = "softmax" | "sigmoid";

const N = 6;
const CAPTIONS = ["a dog", "a cat", "a car", "a tree", "a cup", "a bird"];
const SWATCHES = ["#f59e0b", "#f97316", "#ef4444", "#22c55e", "#a78bfa", "#38bdf8"];
// 1/τ for CLIP, t for SigLIP
const SCALE = 10;
const BIAS = -4;
const LOOP = 9;
const PAD = 16;
const CURVE_POINTS = 80;

const CAPTION = `Toy batch of ${katex.renderToString("N = 6", { throwOnError: false })} pairs, rows are images and columns are captions. Dashed cells are the correct pairs. Dog and cat stay a little similar.`;

const MODES: Record<Mode, { label: string; title: string; note: string }> = {
  softmax: {
    label: "CLIP · softmax",
    title: "CLIP: softmax over each row (and column)",
    note: "each row sums to 1 · label of row i is i",
  },
  sigmoid: {
    label: "SigLIP · sigmoid",
    title: "SigLIP: an independent sigmoid per pair",
    note: "cells are independent · z = +1 on diagonal, −1 elsewhere",
  },
};

function hashNoise(i: number, j: number) {
  const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 0.2 - 0.1;
}

const initial = Array.from({ length: N }, (_, i) =>
  Array.from({ length: N }, (_, j) => hashNoise(i, j)),
);

function targetCosine(i: number, j: number) {
  if (i === j) return 0.85;
  // dogs and cats stay somewhat alike even after training
  if (i + j === 1) return 0.35;
  return -0.05 + initial[i][j] * 0.3;
}

function cosines(progress: number) {
  const g = 1 - (1 - progress) ** 2;
  return initial.map((row, i) =>
    row.map((value, j) => value + g * (targetCosine(i, j) - value)),
  );
}

function softplus(x: number) {
  return Math.log1p(Math.exp(-Math.abs(x))) + Math.max(x, 0);
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

function probabilities(cos: number[][], mode: Mode) {
  if (mode === "sigmoid") {
    return cos.map((row) =>
      row.map((c) => 1 / (1 + Math.exp(-(SCALE * c + BIAS)))),
    );
  }
  return cos.map((row) => softmax(row.map((c) => SCALE * c)));
}

function loss(cos: number[][], mode: Mode) {
  if (mode === "sigmoid") {
    let total = 0;
    cos.forEach((row, i) =>
      row.forEach((c, j) => {
        const z = i === j ? 1 : -1;
        total += softplus(-z * (SCALE * c + BIAS));
      }),
    );
    return total / N;
  }

  const rows = cos.map((row, i) => -Math.log(softmax(row.map((c) => SCALE * c))[i]));
  const cols = cos.map((_, j) => {
    const column = cos.map((row) => SCALE * row[j]);
    return -Math.log(softmax(column)[j]);
  });
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return (mean(rows) + mean(cols)) / 2;
}

const curves: Record<Mode, number[]> = {
  softmax: [],
  sigmoid: [],
};

function curve(mode: Mode) {
  if (curves[mode].length === 0) {
    curves[mode] = Array.from({ length: CURVE_POINTS + 1 }, (_, k) =>
      loss(cosines(k / CURVE_POINTS), mode),
    );
  }
  return curves[mode];
}

function layout(width: number) {
  const wide = width >= 540;
  const labelW = 40;
  const headerH = 58;
  const top = 52;
  const matrixMax = wide ? Math.min(width * 0.5, 320) : width - PAD * 2;
  const cell = Math.min(40, (matrixMax - labelW) / N);
  const matrixX = PAD + labelW;
  const matrixY = top + headerH;
  const noteY = matrixY + cell * N + 22;

  const chartX = wide ? matrixX + cell * N + 52 : PAD + 30;
  const chartY = wide ? matrixY : noteY + 30;
  const chartW = width - chartX - PAD;
  const chartH = wide ? cell * N : 110;
  const height = wide ? noteY + 14 : chartY + chartH + 26;

  return { cell, matrixX, matrixY, noteY, chartX, chartY, chartW, chartH, height };
}

function cellColor(value: number) {
  const v = clamp01(value) ** 0.7;
  const from = [15, 23, 42];
  const to = [52, 211, 153];
  const mix = from.map((c, k) => Math.round(c + (to[k] - c) * v));
  return `rgb(${mix.join(", ")})`;
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  l: ReturnType<typeof layout>,
  points: number[],
  progress: number,
) {
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
  ctx.fillText("loss", l.chartX - 28, l.chartY + 8);
  ctx.textAlign = "right";
  ctx.fillText("step", l.chartX + l.chartW, l.chartY + l.chartH + 14);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  points.forEach((v, k) => (k === 0 ? ctx.moveTo(toX(k), toY(v)) : ctx.lineTo(toX(k), toY(v))));
  ctx.stroke();
  ctx.setLineDash([]);

  const last = progress * CURVE_POINTS;
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k <= Math.floor(last); k += 1) {
    if (k === 0) ctx.moveTo(toX(k), toY(points[k]));
    else ctx.lineTo(toX(k), toY(points[k]));
  }
  ctx.stroke();

  const k = Math.min(Math.floor(last), CURVE_POINTS);
  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.arc(toX(k), toY(points[k]), 3.5, 0, Math.PI * 2);
  ctx.fill();
}

export default function ClipMatrixAnimation() {
  const [mode, setMode] = useState<Mode>("softmax");
  const modeRef = useRef<Mode>("softmax");

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const current = modeRef.current;
    const t = time % LOOP;
    const l = layout(width);
    const progress = phase(t, 0.6, 6.6);
    const cos = cosines(progress);
    const probs = probabilities(cos, current);
    const value = loss(cos, current);
    ctx.globalAlpha = phase(t, 0, 0.3) * (1 - phase(t, 8.6, 9));

    ctx.fillStyle = COLORS.text;
    ctx.font = `600 ${width < 400 ? 12 : 13}px ${FONT_SANS}`;
    ctx.fillText(MODES[current].title, PAD, PAD + 8);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.fillText(
      `step ${String(Math.round(progress * 1000)).padStart(4, " ")} · loss ${value.toFixed(3)}`,
      PAD,
      PAD + 28,
    );

    ctx.font = `11px ${FONT_SANS}`;
    CAPTIONS.forEach((caption, j) => {
      ctx.save();
      ctx.translate(l.matrixX + l.cell * (j + 0.5), l.matrixY - 8);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = COLORS.body;
      ctx.fillText(caption, 0, 0);
      ctx.restore();
    });

    SWATCHES.forEach((color, i) => {
      const y = l.matrixY + l.cell * i + l.cell / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(PAD, y - 7, 14, 14, 3);
      ctx.fill();
      ctx.fillStyle = COLORS.dim;
      ctx.font = `10px ${FONT_MONO}`;
      ctx.fillText(`I${i + 1}`, PAD + 19, y + 3.5);
    });

    probs.forEach((row, i) =>
      row.forEach((p, j) => {
        const x = l.matrixX + j * l.cell;
        const y = l.matrixY + i * l.cell;
        ctx.fillStyle = cellColor(p);
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, l.cell - 3, l.cell - 3, 3);
        ctx.fill();

        if (l.cell >= 30) {
          ctx.fillStyle =
            p > 0.55 ? "#022c22" : p > 0.2 ? COLORS.text : COLORS.dim;
          ctx.font = `10px ${FONT_MONO}`;
          ctx.textAlign = "center";
          ctx.fillText(p.toFixed(2), x + l.cell / 2, y + l.cell / 2 + 3.5);
          ctx.textAlign = "left";
        }
      }),
    );

    ctx.strokeStyle = "rgba(248, 250, 252, 0.7)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i < N; i += 1) {
      const x = l.matrixX + i * l.cell;
      const y = l.matrixY + i * l.cell;
      ctx.strokeRect(x + 0.5, y + 0.5, l.cell - 1, l.cell - 1);
    }
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.muted;
    ctx.font = `11px ${FONT_SANS}`;
    ctx.fillText(MODES[current].note, PAD, l.noteY);

    drawChart(ctx, l, curve(current), progress);
  };

  const { canvasRef, restart } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: 7,
  });

  const select = (next: Mode) => {
    modeRef.current = next;
    setMode(next);
    restart();
  };

  return (
    <figure className="post-animation">
      <div className="post-animation-controls" role="group" aria-label="Loss">
        {(Object.keys(MODES) as Mode[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            onClick={() => select(key)}
          >
            {MODES[key].label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A 6 by 6 image-text similarity matrix. As training proceeds the diagonal cells brighten while the loss curve falls."
      />
      <figcaption dangerouslySetInnerHTML={{ __html: CAPTION }} />
    </figure>
  );
}
