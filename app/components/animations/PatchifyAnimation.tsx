"use client";

import katex from "katex";
import { useRef, useState } from "react";
import {
  COLORS,
  FONT_MONO,
  FONT_SANS,
  clamp01,
  easeInOut,
  easeOut,
  lerp,
  phase,
} from "./canvas";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";

const GRID = 4;
const PATCHES = GRID * GRID;
const TEXT_TOKENS = 3;
const SOURCE_SIZE = 64;
const LOOP = 11;
const PAD = 16;

const tex = (source: string) =>
  katex.renderToString(source, { throwOnError: false });

const STEPS = [
  {
    title: "1 · Patchify: cut the image into patches",
    tex: String.raw`P = 16,\; N = \frac{HW}{P^2} = 16`,
  },
  {
    title: "2 · Flatten, embed, add position",
    tex: String.raw`z_0 = [\,x_p^1 E;\, \dots;\, x_p^N E\,] + E_\text{pos}`,
  },
  {
    title: "3 · Projector into the LLM's space",
    tex: String.raw`H_v = \operatorname{GELU}(Z_v W_1)\, W_2`,
  },
  {
    title: "4 · Concatenate with text tokens",
    tex: String.raw`h = [\,H_v;\; H_t\,]`,
  },
].map((step) => ({
  ...step,
  html: tex(step.tex),
}));

const CAPTION = `Toy run with ${tex("H = W = 64")} and ${tex("P = 16")}, so ${tex("N = 16")} visual tokens.`;

function stepAt(t: number) {
  return t < 2 ? 0 : t < 4.8 ? 1 : t < 6.8 ? 2 : 3;
}

const TEXT_COLORS = ["#60a5fa", "#3b82f6", "#93c5fd"];

let sourceImage: HTMLCanvasElement | null = null;

function getSourceImage() {
  if (sourceImage) return sourceImage;

  const canvas = document.createElement("canvas");
  canvas.width = SOURCE_SIZE;
  canvas.height = SOURCE_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, SOURCE_SIZE);
    sky.addColorStop(0, "#1e3a8a");
    sky.addColorStop(0.5, "#7c3aed");
    sky.addColorStop(0.8, "#f472b6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SOURCE_SIZE, SOURCE_SIZE);

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(44, 24, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f766e";
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.lineTo(17, 27);
    ctx.lineTo(32, 44);
    ctx.lineTo(47, 33);
    ctx.lineTo(64, 48);
    ctx.lineTo(64, 64);
    ctx.lineTo(0, 64);
    ctx.fill();

    ctx.fillStyle = "#064e3b";
    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.quadraticCurveTo(32, 48, 64, 56);
    ctx.lineTo(64, 64);
    ctx.lineTo(0, 64);
    ctx.fill();
  }

  sourceImage = canvas;
  return canvas;
}

function layout(width: number) {
  const avail = width - PAD * 2;
  const slots = PATCHES + TEXT_TOKENS;
  const token = Math.min(26, avail / (slots + (slots - 1) * 0.25 + 0.8));
  const image = Math.min(150, avail * 0.42);
  const imageY = 44;
  const rowY = imageY + image + 46;
  return {
    token,
    gap: token * 0.25,
    image,
    imageY,
    rowY,
    height: Math.round(rowY + token + 52),
  };
}

type Layout = ReturnType<typeof layout>;

function tokenX(index: number, l: Layout) {
  const groupGap = index >= PATCHES ? l.token * 0.8 : 0;
  return PAD + index * (l.token + l.gap) + groupGap;
}

function embeddingColor(index: number) {
  return `hsl(158 64% ${34 + ((index * 37) % 28)}%)`;
}

function drawBracket(
  ctx: CanvasRenderingContext2D,
  from: number,
  to: number,
  y: number,
  label: string,
) {
  ctx.strokeStyle = COLORS.dim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(from, y - 4);
  ctx.lineTo(from, y);
  ctx.lineTo(to, y);
  ctx.lineTo(to, y - 4);
  ctx.stroke();
  ctx.fillStyle = COLORS.muted;
  ctx.font = `11px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.fillText(label, (from + to) / 2, y + 15);
  ctx.textAlign = "left";
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  time: number,
) {
  const t = time % LOOP;
  const l = layout(width);
  const image = getSourceImage();
  const cell = l.image / GRID;
  const sourceCell = SOURCE_SIZE / GRID;
  const fade = (1 - phase(t, 10.2, 11)) * phase(t, 0, 0.4);
  const step = stepAt(t);
  const narrow = width < 440;
  ctx.imageSmoothingEnabled = false;

  ctx.globalAlpha = fade;
  ctx.fillStyle = COLORS.text;
  ctx.font = `600 ${narrow ? 12 : 13}px ${FONT_SANS}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(STEPS[step].title, PAD, PAD + 8);

  ctx.drawImage(image, PAD, l.imageY, l.image, l.image);

  const gridProgress = phase(t, 0.8, 1.6);
  if (gridProgress > 0) {
    ctx.strokeStyle = "rgba(248, 250, 252, 0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < GRID; k += 1) {
      const offset = k * cell;
      ctx.moveTo(PAD + offset, l.imageY);
      ctx.lineTo(PAD + offset, l.imageY + l.image * gridProgress);
      ctx.moveTo(PAD, l.imageY + offset);
      ctx.lineTo(PAD + l.image * gridProgress, l.imageY + offset);
    }
    ctx.stroke();
  }

  const flights = Array.from({ length: PATCHES }, (_, i) =>
    easeInOut(phase(t, 2 + i * 0.12, 2.7 + i * 0.12)),
  );

  flights.forEach((p, i) => {
    if (p === 0) return;
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * clamp01(p * 3)})`;
    ctx.fillRect(PAD + col * cell, l.imageY + row * cell, cell, cell);
  });

  const sweep = phase(t, 5, 6.6);
  const sweepX = lerp(
    PAD - l.token,
    tokenX(PATCHES - 1, l) + l.token * 2,
    sweep,
  );

  flights.forEach((p, i) => {
    if (p === 0) return;
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    const x = lerp(PAD + col * cell, tokenX(i, l), p);
    const y = lerp(l.imageY + row * cell, l.rowY, p);
    const size = lerp(cell, l.token, p);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 3 * p);
    ctx.clip();
    ctx.drawImage(
      image,
      col * sourceCell,
      row * sourceCell,
      sourceCell,
      sourceCell,
      x,
      y,
      size,
      size,
    );
    const tint = clamp01((sweepX - tokenX(i, l)) / (l.token * 1.5));
    if (tint > 0) {
      ctx.globalAlpha = fade * tint;
      ctx.fillStyle = embeddingColor(i);
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
    ctx.globalAlpha = fade;

    const indexAlpha = phase(t, 2.7 + i * 0.12, 3 + i * 0.12);
    if (indexAlpha > 0 && l.token >= 15) {
      ctx.globalAlpha = fade * indexAlpha;
      ctx.fillStyle = COLORS.dim;
      ctx.font = `9px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), tokenX(i, l) + l.token / 2, l.rowY - 5);
      ctx.textAlign = "left";
      ctx.globalAlpha = fade;
    }
  });

  if (sweep > 0 && sweep < 1) {
    const glow = ctx.createLinearGradient(sweepX - 10, 0, sweepX + 2, 0);
    glow.addColorStop(0, "rgba(52, 211, 153, 0)");
    glow.addColorStop(1, "rgba(52, 211, 153, 0.55)");
    ctx.fillStyle = glow;
    ctx.fillRect(sweepX - 10, l.rowY - 10, 12, l.token + 20);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(sweepX, l.rowY - 10, 2, l.token + 20);
    ctx.font = `11px ${FONT_MONO}`;
    ctx.fillText("projector", Math.min(sweepX - 30, width - PAD - 64), l.rowY - 16);
  }

  for (let j = 0; j < TEXT_TOKENS; j += 1) {
    const p = easeOut(phase(t, 7 + j * 0.15, 7.7 + j * 0.15));
    if (p === 0) continue;
    ctx.globalAlpha = fade * p;
    ctx.fillStyle = TEXT_COLORS[j];
    ctx.beginPath();
    ctx.roundRect(tokenX(PATCHES + j, l) + (1 - p) * 40, l.rowY, l.token, l.token, 3);
    ctx.fill();
  }

  const bracketY = l.rowY + l.token + 12;
  const visionBracket = phase(t, 4.5, 5);
  if (visionBracket > 0) {
    ctx.globalAlpha = fade * visionBracket;
    const projected = t >= 6.6;
    const label = projected ? "16 visual tokens" : "16 patch features";
    drawBracket(ctx, tokenX(0, l), tokenX(PATCHES - 1, l) + l.token, bracketY, label);
  }

  const textBracket = phase(t, 7.8, 8.3);
  if (textBracket > 0) {
    ctx.globalAlpha = fade * textBracket;
    drawBracket(
      ctx,
      tokenX(PATCHES, l),
      tokenX(PATCHES + TEXT_TOKENS - 1, l) + l.token,
      bracketY,
      "text",
    );
  }
}

export default function PatchifyAnimation() {
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  const draw: DrawFrame = (ctx, width, _height, time) => {
    drawFrame(ctx, width, time);
    const next = stepAt(time % LOOP);
    if (next !== stepRef.current) {
      stepRef.current = next;
      setStep(next);
    }
  };

  const { canvasRef } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: 9,
  });

  return (
    <figure className="post-animation patchify-animation">
      <ol className="patchify-steps">
        {STEPS.map((item, index) => (
          <li
            key={item.tex}
            aria-current={index === step ? "step" : undefined}
            dangerouslySetInnerHTML={{ __html: item.html }}
          />
        ))}
      </ol>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A 64 by 64 image is split into a 4 by 4 grid of patches. Each patch becomes a token, a projector recolors the tokens into the language model's space, and three text tokens are appended."
      />
      <figcaption dangerouslySetInnerHTML={{ __html: CAPTION }} />
    </figure>
  );
}
