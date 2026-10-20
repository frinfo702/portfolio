"use client";

import { useRef, useState } from "react";
import { COLORS, FONT_MONO, FONT_SANS, lerp, softmax } from "./canvas";
import { landscape, patchMeans } from "./landscape";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";
import { Figure } from "./Figure";

type Mode = "encoder" | "causal";

const GRID = 6;
const N = GRID * GRID;
const PAD = 16;
const STEP = 0.9;

const MODES: Record<Mode, string> = {
  encoder: "ViT encoder · no mask",
  causal: "LLM · causal mask",
};

// Visit order for the automatic query: a slow walk around the image.
const TOUR = [0, 7, 14, 9, 4, 11, 17, 22, 27, 26, 31, 30, 24, 19, 13, 20];

let logits: number[][] | null = null;

// Toy attention logits: nearby patches and similarly colored patches score higher.
function getLogits() {
  if (logits) return logits;
  const means = patchMeans(GRID);
  logits = means.map((a, i) =>
    means.map((b, j) => {
      const dx = (i % GRID) - (j % GRID);
      const dy = Math.floor(i / GRID) - Math.floor(j / GRID);
      const color = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 441;
      return -0.55 * Math.hypot(dx, dy) + 5 * (1 - color);
    }),
  );
  return logits;
}

function weights(query: number, mode: Mode) {
  const row = getLogits()[query];
  if (mode === "encoder") return softmax(row);
  const allowed = softmax(row.slice(0, query + 1));
  return row.map((_, j) => (j <= query ? allowed[j] : 0));
}

function layout(width: number) {
  const narrow = width < 560;
  const gap = narrow ? PAD : 96;
  const image = Math.min(300, (width - PAD * 2 - gap) / 2);
  const top = 26;
  const imageX = (width - image * 2 - gap) / 2;
  return { narrow, image, top, imageX, matrixX: imageX + image + gap, height: top + image + 54 };
}

export default function AttentionAnimation() {
  const [mode, setMode] = useState<Mode>("encoder");
  const modeRef = useRef<Mode>("encoder");
  const hover = useRef<number | null>(null);
  const shown = useRef<{ w: number[]; last: number }>({ w: Array(N).fill(0), last: -1 });

  const queryAt = (time: number) =>
    hover.current ?? TOUR[Math.floor(time / STEP) % TOUR.length];

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const l = layout(width);
    const current = modeRef.current;
    const q = queryAt(time);
    const target = weights(q, current);
    const state = shown.current;
    const dt = state.last < 0 || time === state.last ? 1 : Math.max(0, time - state.last);
    state.last = time;
    state.w = state.w.map((w, j) => lerp(w, target[j], Math.min(1, dt * 9)));
    const w = state.w;
    const max = Math.max(...w);
    const cell = l.image / GRID;
    const small = `${l.narrow ? 10 : 11}px ${FONT_MONO}`;

    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(l.narrow ? "hover a patch" : "image · hover a patch to make it the query", l.imageX, l.top - 10);
    ctx.fillText("attention weights softmax(QKᵀ/√d)", l.matrixX, l.top - 10);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(landscape(GRID * 8), l.imageX, l.top, l.image, l.image);

    for (let j = 0; j < N; j += 1) {
      const x = l.imageX + (j % GRID) * cell;
      const y = l.top + Math.floor(j / GRID) * cell;
      const masked = current === "causal" && j > q;
      if (masked) {
        ctx.fillStyle = "rgba(12, 14, 16, 0.92)";
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = COLORS.rule;
        ctx.beginPath();
        for (let k = -cell; k < cell; k += 6) {
          ctx.moveTo(x + Math.max(0, k), y + Math.max(0, -k));
          ctx.lineTo(x + Math.min(cell, k + cell), y + Math.min(cell, cell - k));
        }
        ctx.stroke();
        continue;
      }
      const strength = (w[j] / max) ** 0.6;
      ctx.fillStyle = `rgba(12, 14, 16, ${0.88 * (1 - strength)})`;
      ctx.fillRect(x, y, cell, cell);
    }

    // Lines from the query to the patches it weighs most.
    const qx = l.imageX + ((q % GRID) + 0.5) * cell;
    const qy = l.top + (Math.floor(q / GRID) + 0.5) * cell;
    for (let j = 0; j < N; j += 1) {
      if (j === q || w[j] / max < 0.12) continue;
      ctx.globalAlpha = (w[j] / max) * 0.9;
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 0.5 + 2 * (w[j] / max);
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.lineTo(l.imageX + ((j % GRID) + 0.5) * cell, l.top + (Math.floor(j / GRID) + 0.5) * cell);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 2;
    ctx.strokeRect(qx - cell / 2 + 1, qy - cell / 2 + 1, cell - 2, cell - 2);
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(qx, qy, 3, 0, Math.PI * 2);
    ctx.fill();

    // The full N × N matrix; the query's row is the one drawn on the image.
    const m = l.image / N;
    for (let i = 0; i < N; i += 1) {
      const row = i === q ? w : weights(i, current);
      const rowMax = Math.max(...row);
      for (let j = 0; j < N; j += 1) {
        const masked = current === "causal" && j > i;
        ctx.fillStyle = masked
          ? "rgba(12, 14, 16, 0.95)"
          : `rgba(207, 215, 222, ${0.05 + (i === q ? 0.95 : 0.55) * (row[j] / rowMax) ** 0.7})`;
        ctx.fillRect(l.matrixX + j * m, l.top + i * m, m - 0.4, m - 0.4);
      }
    }
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(l.matrixX - 1, l.top + q * m - 1, l.image + 2, m + 2);

    const visible = current === "causal" ? q + 1 : N;
    ctx.fillStyle = COLORS.text;
    ctx.font = `500 ${l.narrow ? 12 : 14}px ${FONT_SANS}`;
    ctx.fillText(`query = patch ${q + 1}`, l.imageX, l.top + l.image + 24);
    ctx.fillText(`row ${q + 1} of ${N}`, l.matrixX, l.top + l.image + 24);
    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`sees ${visible} of ${N} patches`, l.imageX, l.top + l.image + 42);
    ctx.fillText(current === "causal" ? "upper triangle masked to −∞" : "every entry is filled", l.matrixX, l.top + l.image + 42);
  };

  const { canvasRef, redraw } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: STEP * 6 + 0.5,
  });

  const pick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const l = layout(rect.width);
    const x = event.clientX - rect.left - l.imageX;
    const y = event.clientY - rect.top - l.top;
    const inside = x >= 0 && y >= 0 && x < l.image && y < l.image;
    hover.current = inside
      ? Math.floor(y / (l.image / GRID)) * GRID + Math.floor(x / (l.image / GRID))
      : null;
    redraw();
  };

  const select = (next: Mode) => {
    modeRef.current = next;
    setMode(next);
    redraw();
  };

  return (
    <Figure>
      <div className="post-animation-controls" role="group" aria-label="Mask">
        {(Object.keys(MODES) as Mode[]).map((key) => (
          <button key={key} type="button" aria-pressed={mode === key} onClick={() => select(key)}>
            {MODES[key]}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A 6 by 6 patch image with one query patch highlighted. Patches it attends to stay bright and the rest darken. With the causal mask, patches after the query in reading order are blacked out, and the attention matrix becomes lower triangular."
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => {
          hover.current = null;
        }}
      />
      <figcaption>
        Toy weights from patch color and distance. The highlighted row of the matrix is the
        attention map drawn on the image. Switch to the causal mask to see what the language
        model would be allowed to look at.
      </figcaption>
    </Figure>
  );
}
