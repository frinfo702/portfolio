"use client";

import katex from "katex";
import { useRef, useState } from "react";
import { COLORS, FONT_MONO, FONT_SANS, lerp, textColor, visionColor } from "./canvas";
import { landscape } from "./landscape";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";
import { Figure } from "./Figure";

const P = 14;
const RESOLUTIONS = [224, 336, 448, 672];
const CONTEXT = 4096;
const MAX_N = (672 / P) ** 2;
const CYCLE = 3.2;
const PAD = 16;

const tex = (source: string) => katex.renderToString(source, { throwOnError: false });

const CAPTION = `Patch size ${tex("P = 14")}. The side of the right-hand square is proportional to ${tex("N")}, so its area is proportional to the ${tex("N^2")} attention scores. Pick a resolution to stop the cycle.`;

const tokens = (res: number) => (res / P) ** 2;
const format = (n: number) => Math.round(n).toLocaleString("en-US");

function layout(width: number) {
  const narrow = width < 560;
  const gap = narrow ? PAD : 96;
  const side = Math.min(270, (width - PAD * 2 - gap) / 2);
  const top = 30;
  const leftX = (width - side * 2 - gap) / 2;
  const rightX = leftX + side + gap;
  const barY = top + side + (narrow ? 70 : 78);
  return { narrow, side, top, leftX, rightX, barY, barW: side * 2 + gap, height: barY + 24 };
}

export default function TokenBudgetAnimation() {
  const [choice, setChoice] = useState<number | null>(null);
  const choiceRef = useRef<number | null>(null);
  const shown = useRef({ res: 224, last: -1 });

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const l = layout(width);
    const target =
      choiceRef.current ?? RESOLUTIONS[Math.floor(time / CYCLE) % RESOLUTIONS.length];
    const state = shown.current;
    // A redraw without time passing (a click under reduced motion) snaps.
    const dt = state.last < 0 || time === state.last ? 1 : Math.max(0, time - state.last);
    state.last = time;
    state.res = lerp(state.res, target, Math.min(1, dt * 5));
    if (Math.abs(state.res - target) < 0.5) state.res = target;
    const res = state.res;
    const n = tokens(res);
    const grid = res / P;
    const small = `${l.narrow ? 10 : 11}px ${FONT_MONO}`;

    // Left: the image drawn at its pixel size relative to 672, cut into patches.
    const imageSide = l.side * (res / 672);
    const ix = l.leftX + (l.side - imageSide) / 2;
    const iy = l.top + (l.side - imageSide);
    ctx.strokeStyle = COLORS.rule;
    ctx.setLineDash([3, 4]);
    ctx.strokeRect(l.leftX + 0.5, l.top + 0.5, l.side - 1, l.side - 1);
    ctx.setLineDash([]);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(landscape(64), ix, iy, imageSide, imageSide);
    ctx.strokeStyle = "rgba(248, 250, 252, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = imageSide / grid;
    for (let k = 1; k < grid; k += 1) {
      ctx.moveTo(ix + k * step, iy);
      ctx.lineTo(ix + k * step, iy + imageSide);
      ctx.moveTo(ix, iy + k * step);
      ctx.lineTo(ix + imageSide, iy + k * step);
    }
    ctx.stroke();

    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("image", l.leftX, l.top - 12);
    ctx.fillStyle = COLORS.text;
    ctx.font = `500 ${l.narrow ? 13 : 15}px ${FONT_SANS}`;
    ctx.fillText(`${Math.round(res)} × ${Math.round(res)}`, l.leftX, l.top + l.side + 24);
    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(
      `${grid.toFixed(0)} × ${grid.toFixed(0)} patches → N = ${format(n)}`,
      l.leftX,
      l.top + l.side + 42,
    );

    // Right: the N × N attention matrix, with every option outlined so the
    // quadratic jump is visible against the others.
    const rx = l.rightX;
    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("attention N × N", rx, l.top - 12);
    RESOLUTIONS.forEach((option) => {
      const s = l.side * (tokens(option) / MAX_N);
      ctx.strokeStyle = COLORS.rule;
      ctx.strokeRect(rx + 0.5, l.top + l.side - s + 0.5, s - 1, s - 1);
    });
    const s = l.side * (n / MAX_N);
    const fill = ctx.createLinearGradient(rx, l.top + l.side - s, rx + s, l.top + l.side);
    fill.addColorStop(0, "rgba(207, 215, 222, 0.5)");
    fill.addColorStop(1, "rgba(207, 215, 222, 0.12)");
    ctx.fillStyle = fill;
    ctx.fillRect(rx, l.top + l.side - s, s, s);
    // a diagonal sheen sweeps the matrix so its area reads as work being done
    const sweep = (time % 1.6) / 1.6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, l.top + l.side - s, s, s);
    ctx.clip();
    const sx = rx + lerp(-s, s * 2, sweep);
    const sheen = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
    sheen.addColorStop(0.5, "rgba(255, 255, 255, 0.16)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(rx, l.top + l.side - s, s, s);
    ctx.restore();
    ctx.strokeStyle = COLORS.accent;
    ctx.strokeRect(rx + 0.5, l.top + l.side - s + 0.5, s - 1, s - 1);

    ctx.fillStyle = COLORS.text;
    ctx.font = `500 ${l.narrow ? 13 : 15}px ${FONT_SANS}`;
    ctx.fillText(`${format(n * n)} pairs`, rx, l.top + l.side + 24);
    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(
      `× ${(n * n / tokens(224) ** 2).toFixed(1)} the cost at 224`,
      rx,
      l.top + l.side + 42,
    );

    // Bottom: how much of a 4096-token context the image eats.
    const bw = l.barW;
    const used = Math.min(1, n / CONTEXT);
    const by = l.barY;
    ctx.fillStyle = COLORS.rule;
    ctx.fillRect(l.leftX, by, bw, 12);
    const cells = 64;
    const cw = bw / cells;
    for (let k = 0; k < cells; k += 1) {
      const inImage = (k + 0.5) / cells <= used;
      ctx.fillStyle = inImage ? visionColor(0.55 + 0.25 * Math.sin(k * 1.7)) : textColor(0.25);
      ctx.fillRect(l.leftX + k * cw, by, cw - 1, 12);
    }
    ctx.font = small;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(
      `context of ${format(CONTEXT)} tokens: ${format(n)} image · ${format(Math.max(0, CONTEXT - n))} left for text`,
      l.leftX,
      by - 10,
    );
  };

  const { canvasRef, redraw } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: CYCLE * 3 + 1,
  });

  const select = (res: number) => {
    choiceRef.current = res;
    setChoice(res);
    redraw();
  };

  return (
    <Figure spaces>
      <div className="post-animation-controls" role="group" aria-label="Resolution">
        {RESOLUTIONS.map((res) => (
          <button
            key={res}
            type="button"
            aria-pressed={choice === res}
            onClick={() => select(res)}
          >
            {res} px
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="As the image resolution grows from 224 to 672 pixels with 14 pixel patches, the number of visual tokens grows from 256 to 2304, the attention matrix grows quadratically, and the image takes up more of a 4096 token context."
      />
      <figcaption dangerouslySetInnerHTML={{ __html: CAPTION }} />
    </Figure>
  );
}
