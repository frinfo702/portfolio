"use client";

import { useRef, useState } from "react";
import {
  COLORS,
  FONT_MONO,
  clamp01,
  easeInOut,
  phase,
  textColor,
  visionColor,
  window01,
} from "./canvas";
import { Figure } from "./Figure";
import { landscape } from "./landscape";
import { paintMaterial } from "./materials";
import { CanvasStage, texHtml, useTexLayer, type Tex } from "./TexLayer";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";

type Stage = 1 | 2;
type Module = "vit" | "proj" | "llm";

const STAGES: Record<Stage, { label: string; data: string; trained: Module[] }> = {
  1: { label: "Stage 1 · alignment", data: "image–caption pairs", trained: ["proj"] },
  2: { label: "Stage 2 · instruction tuning", data: "visual QA and chat", trained: ["proj", "llm"] },
};

// The diagram is laid out on a fixed board, centered on x = 240, and scaled
// to fit, like a figure in a paper.
const BOARD_W = 480;
const BOARD_H = 486;
const LOOP = 4.6;
// One step: forward pass, then backward pass, then the weight update.
const FORWARD = [0.2, 1.7] as const;
const BACKWARD = [2, 3.5] as const;
const UPDATE = [3.4, 4.3] as const;

const XL = 150;
const XR = 330;
const Y = {
  out: 26,
  llmTop: 70,
  llmBottom: 160,
  tokens: 184,
  projTop: 220,
  projBottom: 264,
  stop: 282,
  vitTop: 304,
  vitBottom: 378,
  embedTop: 318,
  embedBottom: 352,
  image: 400,
  text: 414,
};
const LOSS_X = 444;

const BOX = {
  llm: { x: XL - 80, y: Y.llmTop, w: XR - XL + 160, h: Y.llmBottom - Y.llmTop },
  vit: { x: XL - 64, y: Y.vitTop, w: 128, h: Y.vitBottom - Y.vitTop },
  embed: { x: XR - 46, y: Y.embedTop, w: 92, h: Y.embedBottom - Y.embedTop },
  proj: { x: XL - 66, y: Y.projTop, w: 132, h: Y.projBottom - Y.projTop },
};
type Box = (typeof BOX)[keyof typeof BOX];

const OUT_WORDS = ["Two", "dogs", "."];
const TEXT_WORDS = ["What", "is", "this", "?"];

const SNOWFLAKE = `<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5M6.3 2.6 8 4.2l1.7-1.6M6.3 13.4 8 11.8l1.7 1.6"/></svg>`;
const FLAME = `<svg class="icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8.4 1.2c.5 2.4 3.9 4.3 3.9 8.1A4.3 4.3 0 0 1 8 13.8a4.3 4.3 0 0 1-4.3-4.5c0-1.9 1-3.2 1.9-4 .1 1.3.7 2.3 1.6 2.6-.3-2.4.3-4.6 1.2-6.7Z"/></svg>`;

const LABELS = {
  llm: `<b>Language model</b><small>Vicuna-7B · causal decoder</small>`,
  vit: `<b>Vision encoder</b><small>ViT-L/14 · CLIP</small>`,
  proj: `<b>Projector</b><small>${texHtml("W_2\\,\\mathrm{GELU}(W_1 z)")}</small>`,
  image: `<b>image</b><small>336 × 336</small>`,
  text: `<b>instruction</b><small>text tokens</small>`,
  frozen: `${SNOWFLAKE}frozen`,
  trained: `${FLAME}trained`,
};

type Point = [number, number];

function polyline(points: Point[]) {
  const lengths = points.slice(1).map((p, k) => Math.hypot(p[0] - points[k][0], p[1] - points[k][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  const at = (d: number): Point => {
    let left = Math.max(0, Math.min(total, d));
    for (let k = 0; k < lengths.length; k += 1) {
      if (left <= lengths[k]) {
        const f = lengths[k] === 0 ? 0 : left / lengths[k];
        return [
          points[k][0] + (points[k + 1][0] - points[k][0]) * f,
          points[k][1] + (points[k + 1][1] - points[k][1]) * f,
        ];
      }
      left -= lengths[k];
    }
    return points[points.length - 1];
  };
  return { total, at };
}

type Path = ReturnType<typeof polyline>;

const FORWARD_PATH = polyline([
  [XL, Y.image],
  [XL, Y.vitBottom],
  [XL, Y.vitTop],
  [XL, Y.projBottom],
  [XL, Y.projTop],
  [XL, Y.tokens + 9],
  [XL, Y.llmBottom],
  [XL, Y.llmTop],
  [XR, Y.out + 9],
  [LOSS_X - 16, Y.out + 9],
]);
const TEXT_PATH = polyline([
  [XR, Y.text],
  [XR, Y.embedBottom],
  [XR, Y.embedTop],
  [XR, Y.tokens + 9],
  [XR, Y.llmBottom],
]);
// Gradients flow from the loss back to the projector's input and no further.
const BACKWARD_PATH = polyline([
  [LOSS_X - 16, Y.out + 9],
  [XR, Y.out + 9],
  [XL, Y.llmTop],
  [XL, Y.llmBottom],
  [XL, Y.tokens + 9],
  [XL, Y.projTop],
  [XL, Y.projBottom],
  [XL, Y.stop],
]);
const EMBED_BACK_PATH = polyline([
  [XR, Y.llmBottom],
  [XR, Y.tokens + 9],
  [XR, Y.embedTop],
]);

function strokePath(ctx: CanvasRenderingContext2D, path: Path, from: number, to: number) {
  const steps = 40;
  ctx.beginPath();
  for (let k = 0; k <= steps; k += 1) {
    const [x, y] = path.at(from + ((to - from) * k) / steps);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// A bright head with a fading tail, moving along a path.
function comet(ctx: CanvasRenderingContext2D, path: Path, head: number, color: string, width: number) {
  const tail = 70;
  const alpha = ctx.globalAlpha;
  for (let k = 0; k < 6; k += 1) {
    ctx.globalAlpha = alpha * (1 - k / 6) * 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    strokePath(ctx, path, Math.max(0, head - (tail * (k + 1)) / 6), head - (tail * k) / 6);
  }
  ctx.globalAlpha = alpha;
  const [x, y] = path.at(head);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, width + 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function hatch(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.strokeStyle = COLORS.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -box.h; k < box.w; k += 6) {
    ctx.moveTo(box.x + k, box.y + box.h);
    ctx.lineTo(box.x + k + box.h, box.y);
  }
  ctx.stroke();
}

// freeze: 1 is solid ice (frozen weights), 0 is magma (trained weights);
// in between, frost is spreading over the magma or melting off it.
type Fill = { freeze: number; time: number; heat: number; seed: number; pixel: number };

// Seconds for a module to freeze over or thaw when the stage changes.
const FREEZE_SECONDS = 1.8;

function material(ctx: CanvasRenderingContext2D, box: Box, shape: () => void, fill: Fill) {
  ctx.save();
  shape();
  ctx.clip();
  const common = { time: fill.time, seed: fill.seed, scale: fill.pixel };
  let painted = true;
  if (fill.freeze < 1) painted = paintMaterial(ctx, "heat", box, { ...common, intensity: fill.heat });
  if (fill.freeze > 0) painted = paintMaterial(ctx, "ice", box, { ...common, cover: fill.freeze }) && painted;
  if (!painted) {
    if (fill.freeze < 0.5) {
      ctx.globalAlpha = 0.3 + 0.5 * fill.heat;
      ctx.fillStyle = textColor(0.55);
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.globalAlpha = 1;
    } else {
      hatch(ctx, box);
    }
  }
  ctx.restore();
}

// Layer bands light bottom-up on the forward pass and top-down on the
// backward pass, over the material.
function bands(ctx: CanvasRenderingContext2D, box: Box, count: number, forward: number, backward: number, trained: boolean) {
  const bh = box.h / count;
  for (let b = 0; b < count; b += 1) {
    const level = 1 - (b + 0.5) / count;
    const fwd = clamp01(1 - Math.abs(forward - level) * 4);
    const back = clamp01(1 - Math.abs(backward - level) * 4);
    const a = Math.max(fwd * 0.28, back * (trained ? 0.4 : 0.16));
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = back > fwd ? "#fff4e0" : "#e6eef6";
    ctx.fillRect(box.x + 3, box.y + b * bh + 2, box.w - 6, bh - 4);
  }
  ctx.globalAlpha = 1;
}

// The cards behind a stack get the same material, a little dimmer.
function stackCards(ctx: CanvasRenderingContext2D, box: Box, fill: Fill) {
  for (let k = 2; k >= 1; k -= 1) {
    const card = { ...box, x: box.x + k * 5, y: box.y - k * 5 };
    const rect = () => {
      ctx.beginPath();
      ctx.rect(card.x, card.y, card.w, card.h);
    };
    material(ctx, card, rect, { ...fill, seed: fill.seed + k * 10, heat: fill.heat * 0.6 });
    if (fill.freeze < 1) {
      ctx.fillStyle = `rgba(19, 22, 25, ${0.35 * (1 - fill.freeze)})`;
      ctx.fillRect(card.x, card.y, card.w, card.h);
    }
    ctx.strokeStyle = fill.freeze < 0.5 ? COLORS.dim : "rgba(200, 225, 245, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(card.x + 0.5, card.y + 0.5, card.w - 1, card.h - 1);
  }
}

function outline(ctx: CanvasRenderingContext2D, shape: () => void, trained: boolean, update: number) {
  shape();
  ctx.strokeStyle = trained ? COLORS.text : COLORS.dim;
  ctx.lineWidth = trained ? 1 + update * 1.5 : 1;
  ctx.stroke();
  ctx.lineWidth = 1;
}

function chips(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  count: number,
  color: (k: number) => string,
  lit: number,
  labels?: string[],
) {
  const w = labels ? 34 : 16;
  const gap = 4;
  const total = count * w + (count - 1) * gap;
  for (let k = 0; k < count; k += 1) {
    const x = cx - total / 2 + k * (w + gap);
    ctx.globalAlpha = 0.45 + 0.55 * lit;
    ctx.fillStyle = color(k);
    ctx.fillRect(x, y, w, 18);
    if (labels) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS.background;
      ctx.font = `10px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.fillText(labels[k], x + w / 2, y + 12.5);
      ctx.textAlign = "left";
    }
  }
  ctx.globalAlpha = 1;
  return total;
}

export default function TwoStageAnimation() {
  const [stage, setStage] = useState<Stage>(1);
  const stageRef = useRef<Stage>(1);
  // The language model starts frozen (stage 1) and eases toward its stage.
  const freezeRef = useRef({ llm: 1, last: -1 });
  const { layerRef, tex, flush } = useTexLayer();

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const scale = width / BOARD_W;
    const pixel = scale * Math.min(window.devicePixelRatio || 1, 2);
    // Labels live in CSS pixels; their type scales gently with the figure.
    const font = (size: number) => size * Math.min(1.15, Math.max(0.78, scale));
    const label: Tex = (key, source, x, y, options = {}) =>
      tex(key, source, x * scale, y * scale, { ...options, size: font(options.size ?? 11) });
    ctx.save();
    ctx.scale(scale, scale);

    const current = STAGES[stageRef.current];
    const t = time % LOOP;
    const fwd = easeInOut(phase(t, ...FORWARD));
    const back = easeInOut(phase(t, ...BACKWARD));
    const update = window01(t, ...UPDATE, 0.25);
    const forwardOn = window01(t, FORWARD[0], BACKWARD[0] + 0.2, 0.2);
    const backwardOn = window01(t, BACKWARD[0], UPDATE[1], 0.2);
    const trained = (m: Module) => current.trained.includes(m);

    const fwdHead = fwd * FORWARD_PATH.total;
    const backHead = back * BACKWARD_PATH.total;
    const fy = FORWARD_PATH.at(fwdHead)[1];
    const by = BACKWARD_PATH.at(backHead)[1];
    // How far a pass has climbed through a box, 0 at its bottom and 1 at its top.
    const depth = (y: number, box: Box, on: number) => (on > 0 ? 1 - (y - box.y) / box.h : -9);
    const near = (y: number, box: Box, on: number) => clamp01(1 - Math.abs(y - (box.y + box.h / 2)) / box.h) * on;
    const heat = (m: Module, box: Box, y = by) => (trained(m) ? 0.3 + 0.7 * Math.max(update, near(y, box, backwardOn)) : 0);
    // The embedding branch splits off at the LLM's base and reaches the table
    // just as the main gradient reaches the projector's input.
    const fz = freezeRef.current;
    // a redraw without time passing (paused, reduced motion) jumps to the end
    const dt = fz.last < 0 || time === fz.last ? FREEZE_SECONDS : Math.max(0, time - fz.last);
    fz.last = time;
    const toward = trained("llm") ? 0 : 1;
    const stepBy = dt / FREEZE_SECONDS;
    fz.llm = toward > fz.llm ? Math.min(toward, fz.llm + stepBy) : Math.max(toward, fz.llm - stepBy);
    const llmFreeze = easeInOut(fz.llm);
    const llmHot = llmFreeze < 0.5;

    const embedBack = trained("llm") ? clamp01((by - Y.llmBottom) / (Y.stop - Y.llmBottom)) : 0;
    const embedHead = embedBack * EMBED_BACK_PATH.total;
    const embedY = embedBack > 0 ? EMBED_BACK_PATH.at(embedHead)[1] : -999;

    // faint wiring underneath everything
    ctx.strokeStyle = COLORS.rule;
    ctx.lineWidth = 1.5;
    strokePath(ctx, FORWARD_PATH, 0, FORWARD_PATH.total);
    strokePath(ctx, TEXT_PATH, 0, TEXT_PATH.total);

    // inputs
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(landscape(16), XL - 26, Y.image, 52, 52);
    ctx.strokeStyle = "rgba(248, 250, 252, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < 4; k += 1) {
      ctx.moveTo(XL - 26 + k * 13, Y.image);
      ctx.lineTo(XL - 26 + k * 13, Y.image + 52);
      ctx.moveTo(XL - 26, Y.image + k * 13);
      ctx.lineTo(XL + 26, Y.image + k * 13);
    }
    ctx.stroke();
    label("image", LABELS.image, XL - 38, Y.image + 26, { html: true, align: "right" });
    chips(ctx, XR, Y.text, TEXT_WORDS.length, () => COLORS.accent, 1, TEXT_WORDS);
    label("text", LABELS.text, XR, Y.text + 44, { html: true, align: "center" });

    // vision encoder: always frozen
    const vitRect = () => {
      ctx.beginPath();
      ctx.rect(BOX.vit.x, BOX.vit.y, BOX.vit.w, BOX.vit.h);
    };
    stackCards(ctx, BOX.vit, { freeze: 1, time, heat: 0, seed: 1, pixel });
    material(ctx, BOX.vit, vitRect, { freeze: 1, time, heat: 0, seed: 1, pixel });
    bands(ctx, BOX.vit, 6, depth(fy, BOX.vit, forwardOn), -9, false);
    outline(ctx, vitRect, false, 0);
    label("vit", LABELS.vit, XL, Y.vitTop + BOX.vit.h / 2, { html: true, align: "center", plate: true });
    label("vit-badge", LABELS.frozen, BOX.vit.x - 8, Y.vitTop + 12, { html: true, align: "right", plate: true, size: 10 });
    label("vit-layers", "\\times 24", BOX.vit.x + BOX.vit.w + 14, Y.vitBottom + 8, { color: COLORS.muted, size: 10 });

    // projector: a trapezoid, narrow at D_v and wide at D_t
    const trap = () => {
      ctx.beginPath();
      ctx.moveTo(XL - 36, Y.projBottom);
      ctx.lineTo(XL + 36, Y.projBottom);
      ctx.lineTo(XL + 66, Y.projTop);
      ctx.lineTo(XL - 66, Y.projTop);
      ctx.closePath();
    };
    const projHeat = heat("proj", BOX.proj);
    material(ctx, BOX.proj, trap, { freeze: 0, time, heat: projHeat, seed: 2, pixel });
    outline(ctx, trap, true, update);
    label("proj", LABELS.proj, XL, (Y.projTop + Y.projBottom) / 2, { html: true, align: "center", plate: true, size: 10.5 });
    label("proj-badge", LABELS.trained, BOX.proj.x - 8, Y.projTop + 10, { html: true, align: "right", plate: true, size: 10 });
    label("proj-dt", "D_t = 4096", XL + 72, Y.projTop + 4, { color: COLORS.muted, size: 10 });
    label("proj-dv", "D_v = 1024", XL + 46, Y.projBottom + 4, { color: COLORS.muted, size: 10 });

    // token rows
    const tokLit = clamp01(1 - Math.abs(fy - Y.tokens) / 30) * forwardOn;
    const vw = chips(ctx, XL, Y.tokens, 6, (k) => textColor(0.5 + 0.06 * k), 0.5 + 0.5 * tokLit);
    const tw = chips(ctx, XR, Y.tokens, 4, (k) => textColor(0.35 + 0.1 * k), 0.5 + 0.5 * tokLit);
    label("hv", "H_v", XL + vw / 2 + 8, Y.tokens + 9, { color: COLORS.muted });
    label("ht", "H_t", XR + tw / 2 + 8, Y.tokens + 9, { color: COLORS.muted });

    // embedding table, part of the language model
    const embedRect = () => {
      ctx.beginPath();
      ctx.rect(BOX.embed.x, BOX.embed.y, BOX.embed.w, BOX.embed.h);
    };
    material(ctx, BOX.embed, embedRect, { freeze: llmFreeze, time, heat: heat("llm", BOX.embed, embedY), seed: 3, pixel });
    outline(ctx, embedRect, llmHot, update);
    label("embed", "<b>Embed</b>", XR, Y.embedTop + BOX.embed.h / 2, { html: true, align: "center", plate: true, size: 10.5 });

    // language model
    const llmRect = () => {
      ctx.beginPath();
      ctx.rect(BOX.llm.x, BOX.llm.y, BOX.llm.w, BOX.llm.h);
    };
    stackCards(ctx, BOX.llm, { freeze: llmFreeze, time, heat: heat("llm", BOX.llm), seed: 4, pixel });
    material(ctx, BOX.llm, llmRect, { freeze: llmFreeze, time, heat: heat("llm", BOX.llm), seed: 4, pixel });
    bands(ctx, BOX.llm, 7, depth(fy, BOX.llm, forwardOn), depth(by, BOX.llm, backwardOn), trained("llm"));
    outline(ctx, llmRect, llmHot, update);
    label("llm", LABELS.llm, (XL + XR) / 2, Y.llmTop + BOX.llm.h / 2, { html: true, align: "center", plate: true });
    label("llm-badge", llmHot ? LABELS.trained : LABELS.frozen, BOX.llm.x - 8, Y.llmTop + 12, {
      html: true,
      align: "right",
      plate: true,
      size: 10,
    });
    label("llm-layers", "\\times 32", BOX.llm.x + BOX.llm.w + 14, Y.llmBottom + 8, { color: COLORS.muted, size: 10 });

    // outputs and loss
    const outLit = clamp01(1 - Math.abs(fwd - 0.9) * 6) * forwardOn;
    const ow = chips(ctx, XR, Y.out, OUT_WORDS.length, () => textColor(0.85), 0.4 + 0.6 * outLit, OUT_WORDS);
    label("answer", "answer", XR - ow / 2 - 8, Y.out + 9, { text: true, align: "right", color: COLORS.muted, size: 10 });
    const lossGlow = Math.max(fwd > 0.97 ? forwardOn : 0, backwardOn * (1 - back));
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1 + lossGlow;
    ctx.beginPath();
    ctx.arc(LOSS_X, Y.out + 9, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    label("loss", "\\mathcal{L}", LOSS_X, Y.out + 9, { align: "center", size: 13 });

    // where the gradient stops
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(XL - 5, Y.stop - 5);
    ctx.lineTo(XL + 5, Y.stop + 5);
    ctx.moveTo(XL + 5, Y.stop - 5);
    ctx.lineTo(XL - 5, Y.stop + 5);
    ctx.stroke();
    label("stop", "no gradient", XL + 12, Y.stop, { text: true, color: COLORS.muted, size: 10 });

    // the passes themselves
    if (forwardOn > 0) {
      ctx.globalAlpha = forwardOn;
      comet(ctx, FORWARD_PATH, fwdHead, visionColor(0.85), 1.8);
      comet(ctx, TEXT_PATH, Math.min(1, fwd * 1.4) * TEXT_PATH.total, textColor(0.85), 1.8);
    }
    if (backwardOn > 0) {
      ctx.globalAlpha = backwardOn;
      const inFrozenLlm = !trained("llm") && by > Y.llmTop - 10 && by < Y.llmBottom + 4;
      comet(ctx, BACKWARD_PATH, backHead, inFrozenLlm ? "rgba(236, 232, 223, 0.5)" : COLORS.text, 2);
      if (embedBack > 0) comet(ctx, EMBED_BACK_PATH, embedHead, COLORS.text, 2);
    }
    ctx.globalAlpha = 1;

    const step = t < BACKWARD[0] ? "forward" : t < UPDATE[0] ? "backward" : "update";
    label("data", `data: ${current.data}`, 12, BOARD_H - 12, { text: true, color: COLORS.muted, size: 10 });
    label("step", step, BOARD_W - 12, BOARD_H - 12, { text: true, align: "right", color: COLORS.text, size: 10 });
    ctx.restore();
    flush();
  };

  const { canvasRef, redraw } = useCanvasLoop({
    draw,
    height: (width) => Math.round((BOARD_H * width) / BOARD_W),
    stillTime: 2.9,
  });

  const select = (next: Stage) => {
    stageRef.current = next;
    setStage(next);
    redraw();
  };

  return (
    <Figure spaces>
      <div className="post-animation-controls" role="group" aria-label="Training stage">
        {([1, 2] as Stage[]).map((key) => (
          <button key={key} type="button" aria-pressed={stage === key} onClick={() => select(key)}>
            {STAGES[key].label}
          </button>
        ))}
      </div>
      <CanvasStage
        canvasRef={canvasRef}
        layerRef={layerRef}
        role="img"
        aria-label="Architecture diagram of LLaVA, read bottom to top: the image enters a frozen ViT, a projector maps its features to visual tokens, and the visual and text tokens enter the language model, which predicts the answer and the loss. Frozen modules are drawn as ice and trained ones as magma. A forward pass rises through the diagram, then the gradient descends from the loss and stops at the projector's input. In stage 1 only the projector is updated, although the gradient passes through the frozen language model. In stage 2 the language model and its embedding table are updated too."
      />
      <figcaption>
        Read bottom to top, as in the LLaVA paper. Ice marks frozen weights and magma marks weights
        being trained. Each step plays a forward pass, the backward pass, and the update. In stage 1
        the gradient still travels through the frozen language model to reach the projector: frozen
        means its weights are not updated, not that it is skipped. The ViT never receives a gradient.
      </figcaption>
    </Figure>
  );
}
