"use client";

import { useRef, useState } from "react";
import {
  COLORS,
  FONT_MONO,
  FONT_SANS,
  clamp01,
  easeInOut,
  hash01,
  phase,
  textColor,
  visionColor,
  window01,
} from "./canvas";
import { Figure } from "./Figure";
import { landscape } from "./landscape";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";

type Stage = 1 | 2;
type Module = "vit" | "proj" | "llm";

const STAGES: Record<Stage, { label: string; data: string; trained: Module[] }> = {
  1: { label: "Stage 1 · alignment", data: "image–caption pairs", trained: ["proj"] },
  2: { label: "Stage 2 · instruction tuning", data: "visual QA and chat", trained: ["proj", "llm"] },
};

// The diagram is laid out on a fixed 480-unit-wide board and scaled to fit,
// like a figure in a paper.
const BOARD_W = 480;
const BOARD_H = 470;
const LOOP = 4.4;
// One step: forward pass, then backward pass, then the weight update.
const FORWARD = [0.2, 1.7] as const;
const BACKWARD = [2, 3.4] as const;
const UPDATE = [3.3, 4.1] as const;

const XL = 178;
const XR = 352;
const Y = {
  out: 30,
  llmTop: 62,
  llmBottom: 150,
  tokens: 174,
  projTop: 206,
  projBottom: 246,
  stop: 262,
  vitTop: 278,
  vitBottom: 352,
  image: 376,
  embedTop: 300,
  embedBottom: 330,
  text: 404,
};
const LOSS_X = 448;
const OUT_WORDS = ["Two", "dogs", "."];
const TEXT_WORDS = ["What", "is", "this", "?"];

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
  return { points, total, at };
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
  [XR, Y.out + 10],
  [LOSS_X, Y.out],
]);
const TEXT_PATH = polyline([
  [XR, Y.text - 10],
  [XR, Y.embedBottom],
  [XR, Y.embedTop],
  [XR, Y.tokens + 9],
  [XR, Y.llmBottom],
]);
// Gradients flow from the loss back to the projector's input and no further.
const BACKWARD_PATH = polyline([
  [LOSS_X, Y.out],
  [XR, Y.out + 10],
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

function snowflake(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = COLORS.muted;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let k = 0; k < 3; k += 1) {
    const a = (k * Math.PI) / 3;
    ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5);
    ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
  }
  ctx.stroke();
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, heat: number) {
  ctx.fillStyle = `rgba(236, 196, 140, ${0.65 + 0.35 * heat})`;
  ctx.beginPath();
  ctx.moveTo(x, y - 6 - heat * 1.5);
  ctx.quadraticCurveTo(x + 5, y - 1, x + 3.5, y + 3);
  ctx.quadraticCurveTo(x, y + 6, x - 3.5, y + 3);
  ctx.quadraticCurveTo(x - 5, y - 1, x, y - 6 - heat * 1.5);
  ctx.fill();
}

function hatchRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = COLORS.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -h; k < w; k += 6) {
    ctx.moveTo(x + k, y + h);
    ctx.lineTo(x + k + h, y);
  }
  ctx.stroke();
  ctx.restore();
}

type ModuleState = { trained: boolean; update: number };

// A stack of identical blocks, drawn as offset cards the way papers draw "× L".
// Its bands are layers: they light bottom-up going forward, top-down going back.
function blockStack(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  layers: number,
  bands: number,
  tint: (v: number) => string,
  state: ModuleState,
  forwardDepth: number,
  backwardDepth: number,
) {
  const { x, y, w, h } = box;
  for (let k = 2; k >= 1; k -= 1) {
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(x + k * 5, y - k * 5, w, h);
    ctx.strokeStyle = COLORS.rule;
    ctx.strokeRect(x + k * 5 + 0.5, y - k * 5 + 0.5, w - 1, h - 1);
  }
  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(x, y, w, h);
  if (!state.trained) hatchRect(ctx, x, y, w, h);

  const bh = h / bands;
  for (let b = 0; b < bands; b += 1) {
    const level = 1 - (b + 0.5) / bands;
    const fwd = clamp01(1 - Math.abs(forwardDepth - level) * 4);
    const back = clamp01(1 - Math.abs(backwardDepth - level) * 4);
    const base = state.trained ? 0.18 + 0.5 * state.update : 0;
    const a = Math.max(base, fwd * 0.55, back * (state.trained ? 0.8 : 0.3));
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = back > fwd && state.trained ? textColor(0.85) : tint(0.6 + 0.3 * hash01(b, layers));
    ctx.fillRect(x + 4, y + b * bh + 2, w - 8, bh - 4);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = state.trained ? COLORS.text : COLORS.dim;
  ctx.lineWidth = 1 + state.update * 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.lineWidth = 1;
  ctx.font = `10px ${FONT_MONO}`;
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = "right";
  ctx.fillText(`× ${layers}`, x + w + 10, y + h + 12);
  ctx.textAlign = "left";
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
}

function badge(ctx: CanvasRenderingContext2D, x: number, y: number, trained: boolean, heat: number) {
  if (trained) flame(ctx, x, y, heat);
  else snowflake(ctx, x, y);
  ctx.font = `10px ${FONT_MONO}`;
  ctx.fillStyle = trained ? COLORS.text : COLORS.muted;
  ctx.fillText(trained ? "trained" : "frozen", x + 9, y + 3.5);
}

function title(ctx: CanvasRenderingContext2D, label: string, sub: string, x: number, y: number, align: CanvasTextAlign) {
  ctx.textAlign = align;
  ctx.font = `500 12px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(label, x, y);
  ctx.font = `10px ${FONT_MONO}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(sub, x, y + 14);
  ctx.textAlign = "left";
}

export default function TwoStageAnimation() {
  const [stage, setStage] = useState<Stage>(1);
  const stageRef = useRef<Stage>(1);

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const scale = width / BOARD_W;
    ctx.save();
    ctx.scale(scale, scale);

    const current = STAGES[stageRef.current];
    const t = time % LOOP;
    const fwd = easeInOut(phase(t, ...FORWARD));
    const back = easeInOut(phase(t, ...BACKWARD));
    const update = window01(t, ...UPDATE, 0.25);
    const forwardOn = window01(t, FORWARD[0], BACKWARD[0] + 0.2, 0.2);
    const backwardOn = window01(t, BACKWARD[0], UPDATE[1], 0.2);
    const state = (m: Module): ModuleState => {
      const trained = current.trained.includes(m);
      return { trained, update: trained ? update : 0 };
    };

    const fwdHead = fwd * FORWARD_PATH.total;
    const backHead = back * BACKWARD_PATH.total;
    const fy = FORWARD_PATH.at(fwdHead)[1];
    const by = BACKWARD_PATH.at(backHead)[1];
    // How far a pass has climbed through a module, 0 at its bottom and 1 at its top.
    const depth = (y: number, top: number, bottom: number, on: number) =>
      on > 0 ? 1 - (y - top) / (bottom - top) : -9;

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
    title(ctx, "image", "336 × 336", XL - 40, Y.image + 22, "right");
    chips(ctx, XR, Y.text - 10, TEXT_WORDS.length, () => COLORS.accent, 1, TEXT_WORDS);
    title(ctx, "instruction", "text tokens", XR, Y.text + 26, "center");

    // vision encoder
    blockStack(ctx, { x: XL - 62, y: Y.vitTop, w: 124, h: Y.vitBottom - Y.vitTop }, 24, 6, visionColor,
      state("vit"), depth(fy, Y.vitTop, Y.vitBottom, forwardOn), -9);
    title(ctx, "Vision encoder", "ViT-L/14 · CLIP", XL - 76, Y.vitTop + 26, "right");
    badge(ctx, XL - 140, Y.vitTop + 54, false, 0);

    // projector: a trapezoid, narrow at 1024 and wide at 4096
    const proj = state("proj");
    const trap = () => {
      ctx.beginPath();
      ctx.moveTo(XL - 34, Y.projBottom);
      ctx.lineTo(XL + 34, Y.projBottom);
      ctx.lineTo(XL + 64, Y.projTop);
      ctx.lineTo(XL - 64, Y.projTop);
      ctx.closePath();
    };
    trap();
    ctx.fillStyle = COLORS.surface;
    ctx.fill();
    const projMid = (Y.projTop + Y.projBottom) / 2;
    const projHit = clamp01(1 - Math.abs(by - projMid) / 30) * backwardOn;
    const projFwd = clamp01(1 - Math.abs(fy - projMid) / 30) * forwardOn;
    ctx.globalAlpha = Math.max(0.2 + 0.6 * proj.update, projHit * 0.9, projFwd * 0.6);
    const grad = ctx.createLinearGradient(0, Y.projBottom, 0, Y.projTop);
    grad.addColorStop(0, visionColor(0.55));
    grad.addColorStop(1, textColor(0.6));
    ctx.fillStyle = grad;
    trap();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1 + proj.update * 1.5;
    trap();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "center";
    ctx.fillText("W₁ · GELU · W₂", XL, Y.projTop + 24);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("4096", XL + 68, Y.projTop + 9);
    ctx.fillText("1024", XL + 40, Y.projBottom + 10);
    title(ctx, "Projector", "2-layer MLP", XL - 76, Y.projTop + 14, "right");
    badge(ctx, XL - 140, Y.projTop + 40, true, proj.update);

    // token rows: visual tokens on the left, text embeddings on the right
    const tokLit = clamp01(1 - Math.abs(fy - Y.tokens) / 30) * forwardOn;
    chips(ctx, XL, Y.tokens, 6, (k) => textColor(0.45 + 0.4 * hash01(k, 5)), 0.5 + 0.5 * tokLit);
    chips(ctx, XR, Y.tokens, 4, (k) => textColor(0.3 + 0.5 * hash01(k, 9)), 0.5 + 0.5 * tokLit);
    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("H_v", XL + 66, Y.tokens + 13);
    ctx.fillText("H_t", XR + 46, Y.tokens + 13);

    // embedding table, part of the language model
    const llm = state("llm");
    const embed = { x: XR - 40, y: Y.embedTop, w: 80, h: Y.embedBottom - Y.embedTop };
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(embed.x, embed.y, embed.w, embed.h);
    if (llm.trained) {
      ctx.globalAlpha = 0.18 + 0.5 * llm.update;
      ctx.fillStyle = textColor(0.6);
      ctx.fillRect(embed.x, embed.y, embed.w, embed.h);
      ctx.globalAlpha = 1;
    } else {
      hatchRect(ctx, embed.x, embed.y, embed.w, embed.h);
    }
    ctx.strokeStyle = llm.trained ? COLORS.text : COLORS.dim;
    ctx.strokeRect(embed.x + 0.5, embed.y + 0.5, embed.w - 1, embed.h - 1);
    ctx.fillStyle = COLORS.body;
    ctx.textAlign = "center";
    ctx.fillText("Embed", XR, Y.embedTop + 19);
    ctx.textAlign = "left";

    // language model
    blockStack(ctx, { x: XL - 76, y: Y.llmTop, w: XR - XL + 152, h: Y.llmBottom - Y.llmTop }, 32, 7, textColor,
      llm, depth(fy, Y.llmTop, Y.llmBottom, forwardOn), depth(by, Y.llmTop, Y.llmBottom, backwardOn));
    ctx.font = `500 12px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "center";
    ctx.fillText("Language model", (XL + XR) / 2, (Y.llmTop + Y.llmBottom) / 2 - 2);
    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("Vicuna-7B · causal decoder", (XL + XR) / 2, (Y.llmTop + Y.llmBottom) / 2 + 13);
    ctx.textAlign = "left";
    badge(ctx, XL - 64, Y.llmTop + 14, llm.trained, llm.update);

    // outputs and loss
    const outLit = clamp01(1 - Math.abs(fwd - 0.9) * 6) * forwardOn;
    chips(ctx, XR, Y.out, OUT_WORDS.length, () => textColor(0.85), 0.4 + 0.6 * outLit, OUT_WORDS);
    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "right";
    ctx.fillText("answer", XR - 70, Y.out + 13);
    ctx.textAlign = "left";
    const lossGlow = Math.max(fwd > 0.97 ? forwardOn : 0, backwardOn * (1 - back));
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1 + lossGlow;
    ctx.beginPath();
    ctx.arc(LOSS_X, Y.out + 9, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = COLORS.text;
    ctx.font = `italic 13px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.fillText("ℒ", LOSS_X, Y.out + 14);
    ctx.textAlign = "left";

    // where the gradient stops
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(XL - 5, Y.stop - 5);
    ctx.lineTo(XL + 5, Y.stop + 5);
    ctx.moveTo(XL + 5, Y.stop - 5);
    ctx.lineTo(XL - 5, Y.stop + 5);
    ctx.stroke();
    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("no gradient", XL + 10, Y.stop + 4);

    // the passes themselves
    if (forwardOn > 0) {
      ctx.globalAlpha = forwardOn;
      comet(ctx, FORWARD_PATH, fwdHead, visionColor(0.8), 1.8);
      comet(ctx, TEXT_PATH, Math.min(1, fwd * 1.4) * TEXT_PATH.total, textColor(0.8), 1.8);
    }
    if (backwardOn > 0) {
      ctx.globalAlpha = backwardOn;
      const inFrozenLlm = !llm.trained && by > Y.llmTop - 10 && by < Y.llmBottom + 4;
      comet(ctx, BACKWARD_PATH, backHead, inFrozenLlm ? "rgba(236, 232, 223, 0.55)" : COLORS.text, 2);
      if (llm.trained && by > Y.llmBottom) {
        const embedHead = clamp01((by - Y.llmBottom) / (Y.embedTop - Y.llmBottom)) * EMBED_BACK_PATH.total;
        comet(ctx, EMBED_BACK_PATH, embedHead, COLORS.text, 2);
      }
    }
    ctx.globalAlpha = 1;

    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`data: ${current.data}`, 12, BOARD_H - 10);
    const step = t < BACKWARD[0] ? "forward" : t < UPDATE[0] ? "backward" : "update";
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.text;
    ctx.fillText(step, BOARD_W - 12, BOARD_H - 10);
    ctx.textAlign = "left";
    ctx.restore();
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
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Architecture diagram of LLaVA, read bottom to top: the image enters a frozen ViT, a projector maps its features to visual tokens, and the visual and text tokens enter the language model, which predicts the answer and the loss. A forward pass rises through the diagram, then the gradient descends from the loss and stops at the projector's input. In stage 1 only the projector is updated, although the gradient passes through the frozen language model. In stage 2 the language model and its embedding table are updated too."
      />
      <figcaption>
        Read bottom to top, as in the LLaVA paper. Each step plays a forward pass, the
        backward pass, and the update. In stage 1 the gradient still travels through the
        frozen language model to reach the projector: frozen means its weights are not
        updated, not that it is skipped. The ViT never receives a gradient.
      </figcaption>
    </Figure>
  );
}
