"use client";

import katex from "katex";
import {
  COLORS,
  FONT_MONO,
  clamp01,
  easeInOut,
  easeOut,
  lerp,
  phase,
  textColor,
  window01,
} from "./canvas";
import { ChapterBar, ChapterNote, useChapters, type Chapter } from "./Chapters";
import { CanvasStage, texAt, useTexLayer } from "./TexLayer";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";
import { Figure } from "./Figure";

type Kind = "image" | "prompt" | "answer";

const TOKENS: { text: string; kind: Kind }[] = [
  ...Array.from({ length: 4 }, () => ({ text: "img", kind: "image" as const })),
  ...["USER", ":", "What", "is", "this", "?", "ASST", ":"].map((text) => ({ text, kind: "prompt" as const })),
  ...["Two", "dogs", ".", "</s>"].map((text) => ({ text, kind: "answer" as const })),
];
const S = TOKENS.length;
// Position t is scored on token t + 1, so it counts only if that token is part of the answer.
const KEPT = TOKENS.map((_, t) => t + 1 < S && TOKENS[t + 1].kind === "answer");
const NLL = [1.2, 0.7, 0.25, 0.1];
const MEAN = NLL.reduce((a, b) => a + b, 0) / NLL.length;
const LOOP = 13;
const PAD = 16;

const tex = (source: string) => katex.renderToString(source, { throwOnError: false });

const CHAPTERS: Chapter[] = [
  {
    label: "Sequence",
    start: 0,
    end: 2.5,
    note: `The model sees visual tokens, the instruction, and the answer as one sequence. The image positions come from the projector and have no token id.`,
  },
  {
    label: "Shift by one",
    start: 2.5,
    end: 5.5,
    note: `Position ${tex("t")} is trained to predict token ${tex("t+1")}, so the targets are the inputs moved one place to the left. The last position has nothing to predict.`,
  },
  {
    label: "Mask with −100",
    start: 5.5,
    end: 8.5,
    note: `Every target outside the answer is replaced by ${tex("-100")}, the value that ${tex("\\texttt{cross\\_entropy}")} skips. Only the four positions that predict an answer token remain.`,
  },
  {
    label: "Average the loss",
    start: 8.5,
    end: LOOP,
    note: `Each remaining position contributes ${tex("-\\log p_\\theta(y_t \\mid \\cdot)")}, and the loss is their mean. The image and the question shape these probabilities as context but are never predicted themselves.`,
  },
];

function layout(width: number) {
  const narrow = width < 560;
  const labelW = narrow ? 0 : 56;
  const left = PAD + labelW;
  const slot = (width - left - PAD) / S;
  const chipW = slot - (narrow ? 2 : 4);
  // Labels turn sideways only when the chips get too thin to hold them.
  const vertical = chipW < 24;
  const chipH = vertical ? 44 : 28;
  const top = narrow ? 18 : 22;
  const targetY = top + chipH + (narrow ? 44 : 52);
  const lossY = targetY + chipH + 12;
  return {
    narrow,
    vertical,
    left,
    slot,
    chipW,
    chipH,
    top,
    targetY,
    lossY,
    barMax: narrow ? 50 : 64,
    height: lossY + (narrow ? 50 : 64) + 50,
  };
}

type Layout = ReturnType<typeof layout>;

function chip(
  ctx: CanvasRenderingContext2D,
  l: Layout,
  x: number,
  y: number,
  label: string,
  kind: Kind | "masked",
  squash = 1,
) {
  const h = l.chipH * squash;
  const cy = y + (l.chipH - h) / 2;
  if (kind === "image") {
    ctx.fillStyle = textColor(0.35);
    ctx.fillRect(x, cy, l.chipW, h);
  } else if (kind === "answer") {
    ctx.fillStyle = textColor(0.85);
    ctx.fillRect(x, cy, l.chipW, h);
  } else if (kind === "masked") {
    ctx.fillStyle = COLORS.rule;
    ctx.fillRect(x, cy, l.chipW, h);
  } else {
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, cy + 0.5, l.chipW - 1, h - 1);
  }
  if (squash < 0.2) return;
  ctx.fillStyle = kind === "answer" ? COLORS.background : kind === "masked" ? COLORS.dim : COLORS.text;
  ctx.font = `${l.narrow ? 9 : 10}px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(x + l.chipW / 2, y + l.chipH / 2);
  if (l.vertical) ctx.rotate(-Math.PI / 2);
  ctx.scale(1, squash);
  ctx.fillText(label, 0, 3.5);
  ctx.restore();
  ctx.textAlign = "left";
}

export default function LossMaskAnimation() {
  const chapters = useChapters(CHAPTERS);

  const { layerRef, tex, flush } = useTexLayer();

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const t = time % LOOP;
    const l = layout(width);
    const fade = phase(t, 0, 0.3) * (1 - phase(t, LOOP - 0.4, LOOP));
    const x = (slot: number) => l.left + slot * l.slot;
    const small = `${l.narrow ? 9 : 10}px ${FONT_MONO}`;
    ctx.globalAlpha = fade;

    if (!l.narrow) {
      ctx.font = small;
      ctx.fillStyle = COLORS.muted;
      ctx.fillText("input", PAD, l.top + l.chipH / 2 + 3);
      ctx.globalAlpha = fade * phase(t, 2.5, 3);
      ctx.fillText("target", PAD, l.targetY + l.chipH / 2 + 3);
      ctx.globalAlpha = fade * phase(t, 8.5, 9);
      texAt(tex, ctx, "nll", "-\\log p", PAD, l.lossY + 14, { size: 11, color: COLORS.muted });
      ctx.globalAlpha = fade;
    }

    TOKENS.forEach((token, s) => {
      const p = easeOut(phase(t, 0.2 + s * 0.08, 0.6 + s * 0.08));
      if (p === 0) return;
      ctx.globalAlpha = fade * p;
      chip(ctx, l, x(s), l.top + (1 - p) * -10, token.text, token.kind);
    });
    ctx.globalAlpha = fade;

    // Targets: token t + 1 drops from the input row into slot t.
    for (let s = 0; s < S; s += 1) {
      const start = 2.7 + s * 0.1;
      const p = easeInOut(phase(t, start, start + 0.8));
      if (p === 0) continue;
      if (s === S - 1) {
        ctx.globalAlpha = fade * p;
        ctx.font = small;
        ctx.fillStyle = COLORS.dim;
        ctx.textAlign = "center";
        ctx.fillText("—", x(s) + l.chipW / 2, l.targetY + l.chipH / 2 + 4);
        ctx.textAlign = "left";
        continue;
      }
      const next = TOKENS[s + 1];
      const flip = KEPT[s] ? 0 : phase(t, 5.7 + s * 0.12, 6.1 + s * 0.12);
      const masked = flip >= 0.5;
      const squash = Math.abs(1 - flip * 2);
      ctx.globalAlpha = fade;
      // arrow: position s predicts what sits below it
      const arrow = window01(t, start + 0.6, LOOP, 0.4) * (KEPT[s] || !masked ? 1 : 0.3);
      if (arrow > 0) {
        ctx.globalAlpha = fade * arrow * 0.6;
        ctx.strokeStyle = KEPT[s] ? COLORS.text : COLORS.dim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x(s) + l.chipW / 2, l.top + l.chipH + 4);
        ctx.lineTo(x(s) + l.chipW / 2, l.targetY - 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x(s) + l.chipW / 2 - 3, l.targetY - 10);
        ctx.lineTo(x(s) + l.chipW / 2, l.targetY - 6);
        ctx.lineTo(x(s) + l.chipW / 2 + 3, l.targetY - 10);
        ctx.stroke();
      }
      ctx.globalAlpha = fade;
      chip(
        ctx,
        l,
        lerp(x(s + 1), x(s), p),
        lerp(l.top, l.targetY, p),
        masked ? "−100" : next.text,
        masked ? "masked" : next.kind,
        squash,
      );
    }

    // Losses on the kept positions, then their mean.
    let k = 0;
    const gather = easeInOut(phase(t, 10.6, 11.6));
    const sumX = width - PAD - (l.narrow ? 120 : 190);
    const sumY = l.lossY + l.barMax + 26;
    for (let s = 0; s < S; s += 1) {
      if (!KEPT[s]) continue;
      const value = NLL[k];
      const grow = easeOut(phase(t, 8.7 + k * 0.25, 9.4 + k * 0.25));
      const h = (value / NLL[0]) * l.barMax * grow;
      ctx.globalAlpha = fade * (1 - gather * 0.6);
      ctx.fillStyle = textColor(0.7);
      ctx.fillRect(x(s) + l.chipW * 0.2, l.lossY, l.chipW * 0.6, h);
      if (grow > 0.5) {
        ctx.globalAlpha = fade * clamp01((grow - 0.5) * 2);
        ctx.font = small;
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = "center";
        const lx = lerp(x(s) + l.chipW / 2, sumX + k * (l.narrow ? 22 : 38), gather);
        const ly = lerp(l.lossY + h + 14, sumY - 18, gather);
        ctx.fillText(value.toFixed(2), lx, ly);
        ctx.textAlign = "left";
      }
      k += 1;
    }
    const total = phase(t, 11.4, 11.9);
    if (total > 0) {
      ctx.globalAlpha = fade * total;
      ctx.font = `500 ${l.narrow ? 12 : 14}px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.text;
      texAt(tex, ctx, "mean", `\\mathcal{L}_\\text{LM} = ${MEAN.toFixed(2)}`, sumX - (l.narrow ? 12 : 16), sumY + 4, {
        size: l.narrow ? 13 : 15,
        color: COLORS.text,
      });
    }
    ctx.globalAlpha = fade;
    const masked = phase(t, 6, 6.6) * (1 - phase(t, 12.2, 12.6));
    if (masked > 0) {
      ctx.globalAlpha = fade * masked;
      ctx.font = small;
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`${S - 1 - NLL.length} of ${S - 1} targets ignored`, PAD, sumY + 4);
    }
    ctx.globalAlpha = 1;
    chapters.update(t);
    flush();
  };

  const { canvasRef, ...loop } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: 12,
  });

  return (
    <Figure>
      <ChapterBar
        chapters={CHAPTERS}
        active={chapters.active}
        fills={chapters.fills}
        loop={loop}
      />
      <CanvasStage
        canvasRef={canvasRef}
        layerRef={layerRef}
        role="img"
        aria-label="A training sequence of four image tokens, a question, and the answer 'Two dogs.'. The targets are the inputs shifted left by one; every target outside the answer becomes -100; the four remaining positions each get a loss bar, and the loss is their mean."
      />
      <ChapterNote chapter={CHAPTERS[chapters.active]} />
    </Figure>
  );
}
