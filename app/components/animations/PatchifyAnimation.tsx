"use client";

import katex from "katex";
import {
  COLORS,
  FONT_MONO,
  FONT_SANS,
  clamp01,
  easeInOut,
  easeOut,
  hash01,
  lerp,
  phase,
  softmax,
  textColor,
  visionColor,
  window01,
} from "./canvas";
import { ChapterBar, ChapterNote, useChapters, type Chapter } from "./Chapters";
import { landscape } from "./landscape";
import { useCanvasLoop, type DrawFrame } from "./useCanvasLoop";
import { Figure } from "./Figure";

const GRID = 4;
const PATCHES = GRID * GRID;
const P = 8;
const SRC = GRID * P;
const PRE = ["USER", ":"];
const POST = ["Describe", "the", "image", "."];
const SLOTS = PRE.length + PATCHES + POST.length;
// The patch holding the sun, used for close-ups.
const FOCUS = 6;
const EMB_CELLS = 24;
const LLM_CELLS = 32;
const LOOP = 24;
const PAD = 16;

const T = {
  split: [0, 3],
  flat: [3, 7],
  embed: [7, 11],
  vit: [11, 15],
  proj: [15, 18],
  join: [18, LOOP],
} as const;

const tex = (source: string) =>
  katex.renderToString(source, { throwOnError: false });

const CHAPTERS: Chapter[] = [
  {
    label: "Patchify",
    start: T.split[0],
    end: T.split[1],
    note: `The image is cut into ${tex("P \\times P")} squares. A ${tex("32 \\times 32")} image with ${tex("P = 8")} gives ${tex("N = HW/P^2 = 16")} patches, numbered row by row from the top left.`,
  },
  {
    label: "Flatten",
    start: T.flat[0],
    end: T.flat[1],
    note: `Each patch is read one pixel row at a time, and the rows are laid end to end as a single vector. Eight by eight pixels with three channels gives ${tex("x_p^i \\in \\mathbb{R}^{192}")}.`,
  },
  {
    label: "Embed",
    start: T.embed[0],
    end: T.embed[1],
    note: `One matrix ${tex("E")}, shared by every patch, maps each vector to the model width ${tex("D")}, and a learned position vector ${tex("E_\\text{pos}")} is added. The shift from pixel colors to blue-grey marks the move into the encoder's space.`,
  },
  {
    label: "ViT",
    start: T.vit[0],
    end: T.vit[1],
    note: `Self-attention, ${tex("\\operatorname{softmax}(QK^\\top/\\sqrt{d_k})\\,V")}, lets every patch read from every other patch. The brighter the arc, the larger the weight. The encoder uses no causal mask.`,
  },
  {
    label: "Projector",
    start: T.proj[0],
    end: T.proj[1],
    note: `${tex("H_v = \\operatorname{GELU}(Z_v W_1)\\,W_2")} maps each token to the language model's width ${tex("D_t")}. The warm tint means the tokens now live in the same space as text embeddings. There are still 16 of them.`,
  },
  {
    label: "Join text",
    start: T.join[0],
    end: T.join[1],
    note: `The ${tex("\\texttt{<image>}")} placeholder in the prompt is replaced by the 16 visual tokens, giving ${tex("h = [H_v;\\,H_t]")}. From here on the language model runs as usual: under the causal mask, each position sees only what lies to its left.`,
  },
];

type Scene = {
  image: HTMLCanvasElement;
  pixels: string[][];
  emb: number[][];
  llm: number[][];
  words: number[][];
  attention: number[][];
};

let scene: Scene | null = null;

function getScene(): Scene {
  if (scene) return scene;

  const image = landscape(SRC);
  const data = image.getContext("2d")!.getImageData(0, 0, SRC, SRC).data;

  const rgb: number[][][] = [];
  const pixels = Array.from({ length: PATCHES }, (_, i) => {
    const px = (i % GRID) * P;
    const py = Math.floor(i / GRID) * P;
    rgb[i] = [];
    return Array.from({ length: P * P }, (_, k) => {
      const o = ((py + Math.floor(k / P)) * SRC + px + (k % P)) * 4;
      rgb[i].push([data[o], data[o + 1], data[o + 2]]);
      return `rgb(${data[o]}, ${data[o + 1]}, ${data[o + 2]})`;
    });
  });

  const mean = rgb.map((patch) =>
    [0, 1, 2].map((c) => patch.reduce((s, p) => s + p[c], 0) / patch.length),
  );
  const lum = mean.map(([r, g, b]) => (0.3 * r + 0.59 * g + 0.11 * b) / 255);

  const emb = lum.map((l, i) =>
    Array.from({ length: EMB_CELLS }, (_, k) =>
      clamp01(0.1 + 0.55 * hash01(i, k) + 0.4 * l * hash01(k, 7)),
    ),
  );
  const llm = lum.map((l, i) =>
    Array.from({ length: LLM_CELLS }, (_, k) =>
      clamp01(0.1 + 0.6 * hash01(i + 40, k) + 0.3 * l),
    ),
  );
  const words = Array.from({ length: PRE.length + POST.length }, (_, s) =>
    Array.from({ length: LLM_CELLS }, (_, k) =>
      clamp01(0.15 + 0.7 * hash01(s + 90, k)),
    ),
  );

  // Toy attention: nearby patches and patches of similar color attend more.
  const attention = mean.map((a, i) =>
    softmax(
      mean.map((b, j) => {
        const dx = (i % GRID) - (j % GRID);
        const dy = Math.floor(i / GRID) - Math.floor(j / GRID);
        const color = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 441;
        return -0.7 * Math.hypot(dx, dy) + 4 * (1 - color);
      }),
    ),
  );

  scene = { image, pixels, emb, llm, words, attention };
  return scene;
}

function layout(width: number) {
  const narrow = width < 560;
  const image = narrow ? Math.min(128, width * 0.36) : Math.min(210, width * 0.28);
  const imageX = PAD;
  const imageY = 12;
  const panelX = imageX + image + (narrow ? 18 : 40);
  const panelW = width - PAD - panelX;
  const bandY = imageY + image + (narrow ? 58 : 72);
  const avail = width - PAD * 2;
  const col = avail / (SLOTS + (SLOTS - 1) * 0.3);
  const c16 = Math.min(avail / (PATCHES * 1.3), col * 1.35);
  const left16 = (width - (PATCHES * c16 + (PATCHES - 1) * c16 * 0.3)) / 2;
  const flatH = narrow ? 84 : 112;
  const embH = narrow ? 96 : 128;
  const llmH = narrow ? 124 : 164;
  return {
    narrow,
    image,
    imageX,
    imageY,
    cell: image / GRID,
    panelX,
    panelY: imageY,
    panelW,
    panelH: image,
    bandY,
    col,
    c16,
    slotX: (s: number) => PAD + s * col * 1.3,
    x16: (i: number) => left16 + i * c16 * 1.3,
    flatH,
    embH,
    llmH,
    height: Math.round(bandY + llmH + 44),
  };
}

type Layout = ReturnType<typeof layout>;

function joinProgress(t: number) {
  return easeInOut(phase(t, 18.2, 19.2));
}

function columnRect(i: number, t: number, l: Layout) {
  const m = joinProgress(t);
  return {
    x: lerp(l.x16(i), l.slotX(PRE.length + i), m),
    w: lerp(l.c16, l.col, m),
  };
}

function drawCells(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  color: (k: number) => string,
) {
  const ch = h / count;
  const gap = ch > 3.5 ? 1 : 0;
  for (let k = 0; k < count; k += 1) {
    ctx.fillStyle = color(k);
    ctx.fillRect(x, y + k * ch, w, ch - gap);
  }
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
  ctx.textAlign = "left";
}

// Scan lines sweep left to right across the 16 columns; a column changes
// when the line passes it, so the viewer sees one operation applied to all.
function scanX(t: number, start: number, end: number, l: Layout) {
  return lerp(l.x16(0) - 12, l.x16(PATCHES - 1) + l.c16 * 2.5 + 4, phase(t, start, end));
}

function scanProgress(i: number, sx: number, l: Layout) {
  return easeInOut(clamp01((sx - l.x16(i)) / (l.c16 * 2.5)));
}

function chipLanding(i: number) {
  return 9.85 + i * 0.07;
}

function drawImage(ctx: CanvasRenderingContext2D, t: number, l: Layout, s: Scene, fade: number) {
  ctx.globalAlpha = fade;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.image, l.imageX, l.imageY, l.image, l.image);

  for (let i = 0; i < PATCHES; i += 1) {
    const taken = phase(t, 3.5 + i * 0.12, 4.1 + i * 0.12);
    if (taken === 0) continue;
    ctx.fillStyle = `rgba(19, 22, 25, ${0.78 * taken})`;
    ctx.fillRect(
      l.imageX + (i % GRID) * l.cell,
      l.imageY + Math.floor(i / GRID) * l.cell,
      l.cell,
      l.cell,
    );
  }

  const grid = easeInOut(phase(t, 0.2, 1));
  if (grid > 0) {
    ctx.strokeStyle = "rgba(248, 250, 252, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < GRID; k += 1) {
      const o = k * l.cell;
      ctx.moveTo(l.imageX + o, l.imageY);
      ctx.lineTo(l.imageX + o, l.imageY + l.image * grid);
      ctx.moveTo(l.imageX, l.imageY + o);
      ctx.lineTo(l.imageX + l.image * grid, l.imageY + o);
    }
    ctx.stroke();
  }

  const numbers = 1 - phase(t, 3, 3.5);
  for (let i = 0; i < PATCHES; i += 1) {
    const p = easeOut(phase(t, 1 + i * 0.1, 1.25 + i * 0.1));
    if (p === 0 || numbers === 0) continue;
    const x = l.imageX + (i % GRID) * l.cell;
    const y = l.imageY + Math.floor(i / GRID) * l.cell;
    const current = t >= 1 + i * 0.1 && t < 1.1 + i * 0.1;
    if (current) {
      ctx.globalAlpha = fade;
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, l.cell - 2, l.cell - 2);
    }
    ctx.globalAlpha = fade * p * numbers;
    ctx.fillStyle = "rgba(12, 14, 16, 0.55)";
    ctx.fillRect(x + 3, y + 3, l.narrow ? 15 : 19, l.narrow ? 13 : 15);
    text(ctx, String(i + 1), x + 5, y + (l.narrow ? 13 : 14), `${l.narrow ? 9 : 11}px ${FONT_MONO}`, COLORS.text);
  }
  ctx.globalAlpha = fade;
}

function drawColumns(ctx: CanvasRenderingContext2D, t: number, l: Layout, s: Scene, fade: number) {
  if (t < 3.5) return;
  const embedScan = scanX(t, 7.3, 9.3, l);
  const projScan = scanX(t, 15.4, 17.4, l);
  const cursor = Math.floor(phase(t, 19.8, 22.8) * (SLOTS - 1));

  for (let i = 0; i < PATCHES; i += 1) {
    const { x, w } = columnRect(i, t, l);
    const q = t < 7 ? 0 : scanProgress(i, embedScan, l);
    const r = t < 15 ? 0 : scanProgress(i, projScan, l);

    if (q === 0) {
      // Flatten: every pixel travels from its (row, col) in the patch to its
      // index row * P + col in the column.
      const sx = l.imageX + (i % GRID) * l.cell;
      const sy = l.imageY + Math.floor(i / GRID) * l.cell;
      const ps = l.cell / P;
      const ch = l.flatH / (P * P);
      const start = 3.5 + i * 0.12;
      for (let k = 0; k < P * P; k += 1) {
        const p = easeInOut(phase(t, start + (k / (P * P)) * 0.4, start + 0.7 + (k / (P * P)) * 0.4));
        if (p === 0) continue;
        ctx.globalAlpha = fade * clamp01(p * 4);
        ctx.fillStyle = s.pixels[i][k];
        ctx.fillRect(
          lerp(sx + (k % P) * ps, x, p),
          lerp(sy + Math.floor(k / P) * ps, l.bandY + k * ch, p),
          lerp(ps, w, p),
          lerp(ps, ch, p) + 0.4,
        );
      }
      ctx.globalAlpha = fade;
      continue;
    }

    const h = lerp(lerp(l.flatH, l.embH, q), l.llmH, r);
    if (q < 1) {
      ctx.globalAlpha = fade * (1 - q);
      drawCells(ctx, x, l.bandY, w, h, P * P, (k) => s.pixels[i][k]);
    }
    if (r < 1) {
      ctx.globalAlpha = fade * q * (1 - r);
      drawCells(ctx, x, l.bandY, w, h, EMB_CELLS, (k) => visionColor(s.emb[i][k]));
    }
    if (r > 0) {
      ctx.globalAlpha = fade * r;
      drawCells(ctx, x, l.bandY, w, h, LLM_CELLS, (k) => textColor(s.llm[i][k]));
    }

    const flash = window01(t, chipLanding(i), chipLanding(i) + 0.5, 0.15);
    if (flash > 0) {
      ctx.globalAlpha = fade * flash;
      ctx.fillStyle = "rgba(236, 232, 223, 0.35)";
      ctx.fillRect(x, l.bandY, w, h);
    }

    if (PRE.length + i > cursor && t > 19.8) {
      ctx.globalAlpha = fade * 0.72 * window01(t, 19.8, LOOP, 0.3);
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(x - 1, l.bandY - 1, w + 2, h + 2);
    }
    ctx.globalAlpha = fade;
  }

  for (const sx of [embedScan, projScan]) {
    const active = sx === embedScan ? window01(t, 7.2, 9.5, 0.2) : window01(t, 15.3, 17.6, 0.2);
    if (active === 0) continue;
    const top = l.bandY - 10;
    const bottom = l.bandY + (sx === embedScan ? l.embH : l.llmH) + 10;
    const glow = ctx.createLinearGradient(sx - 24, 0, sx, 0);
    glow.addColorStop(0, "rgba(207, 215, 222, 0)");
    glow.addColorStop(1, "rgba(207, 215, 222, 0.28)");
    ctx.globalAlpha = fade * active;
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 24, top, 24, bottom - top);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(sx, top, 2, bottom - top);
    text(ctx, sx === embedScan ? "× E" : "MLP", sx + 6, top + 2, `11px ${FONT_MONO}`, COLORS.accent);
    ctx.globalAlpha = fade;
  }
}

function drawTextColumns(ctx: CanvasRenderingContext2D, t: number, l: Layout, s: Scene, fade: number) {
  const words = [...PRE, ...POST];
  const cursor = Math.floor(phase(t, 19.8, 22.8) * (SLOTS - 1));
  words.forEach((word, n) => {
    const p = easeOut(phase(t, 18.3 + n * 0.07, 18.9 + n * 0.07));
    if (p === 0) return;
    const slot = n < PRE.length ? n : PATCHES + n;
    const x = l.slotX(slot);
    ctx.globalAlpha = fade * p;
    drawCells(ctx, x, l.bandY + (1 - p) * 18, l.col, l.llmH, LLM_CELLS, (k) => textColor(s.words[n][k]));
    if (slot > cursor && t > 19.8) {
      ctx.globalAlpha = fade * 0.72 * window01(t, 19.8, LOOP, 0.3);
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(x - 1, l.bandY - 1, l.col + 2, l.llmH + 2);
    }
    ctx.globalAlpha = fade * p;
    ctx.save();
    ctx.translate(x + l.col / 2, l.bandY - 7);
    ctx.rotate(-Math.PI / 4);
    text(ctx, word, 0, 0, `${l.narrow ? 9 : 11}px ${FONT_SANS}`, COLORS.text);
    ctx.restore();
  });
  ctx.globalAlpha = fade;
}

function drawIndexChips(ctx: CanvasRenderingContext2D, t: number, l: Layout, fade: number) {
  if (t < 9.4) return;
  const join = joinProgress(t);
  for (let i = 0; i < PATCHES; i += 1) {
    const land = chipLanding(i);
    const p = easeOut(phase(t, land - 0.45, land));
    if (p === 0) continue;
    const { x, w } = columnRect(i, t, l);
    const y = lerp(l.bandY - 54, l.bandY - 15, p);
    const dropping = p < 1;
    ctx.globalAlpha = fade * clamp01(p * 3) * (1 - join * 0.5);
    if (dropping) {
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(x, y, w, 11);
    }
    text(
      ctx,
      String(i + 1),
      x + w / 2,
      y + 9,
      `${l.narrow || join > 0.5 ? 8 : 10}px ${FONT_MONO}`,
      dropping ? COLORS.background : COLORS.muted,
      "center",
    );
  }
  ctx.globalAlpha = fade;
}

function drawArcs(ctx: CanvasRenderingContext2D, t: number, l: Layout, s: Scene, fade: number) {
  const vit = window01(t, 11.1, 15, 0.3);
  if (vit > 0) {
    const q = Math.floor(Math.max(0, t - 11.2) / 0.22) % PATCHES;
    const row = s.attention[q];
    const max = Math.max(...row);
    const from = l.x16(q) + l.c16 / 2;
    for (let j = 0; j < PATCHES; j += 1) {
      if (j === q) continue;
      const to = l.x16(j) + l.c16 / 2;
      const w = row[j] / max;
      ctx.globalAlpha = fade * vit * (0.06 + 0.9 * w);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 0.6 + 2.2 * w;
      ctx.beginPath();
      ctx.moveTo(from, l.bandY - 18);
      ctx.quadraticCurveTo((from + to) / 2, l.bandY - 18 - Math.min(52, Math.abs(to - from) * 0.4), to, l.bandY - 18);
      ctx.stroke();
    }
    ctx.globalAlpha = fade * vit;
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(l.x16(q) - 2, l.bandY - 2, l.c16 + 4, l.embH + 4);
  }

  const causal = window01(t, 19.8, LOOP, 0.3);
  if (causal > 0) {
    const c = Math.floor(phase(t, 19.8, 22.8) * (SLOTS - 1));
    const x = (slot: number) => (slot >= PRE.length && slot < PRE.length + PATCHES ? columnRect(slot - PRE.length, t, l).x : l.slotX(slot)) + l.col / 2;
    for (let j = 0; j < c; j += 1) {
      ctx.globalAlpha = fade * causal * 0.3;
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x(c), l.bandY - 24);
      ctx.quadraticCurveTo((x(c) + x(j)) / 2, l.bandY - 24 - Math.min(48, (x(c) - x(j)) * 0.3), x(j), l.bandY - 24);
      ctx.stroke();
    }
    ctx.globalAlpha = fade * causal;
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x(c) - l.col / 2 - 2, l.bandY - 2, l.col + 4, l.llmH + 4);
  }
  ctx.globalAlpha = fade;
}

function drawBandLabels(ctx: CanvasRenderingContext2D, t: number, l: Layout, fade: number) {
  const mid = (l.x16(0) + l.x16(PATCHES - 1) + l.c16) / 2;
  const font = `${l.narrow ? 10 : 11}px ${FONT_MONO}`;
  const labels: [number, number, number, string][] = [
    [5.2, 7.2, l.flatH, "16 vectors · 192 dims each"],
    [9.3, 11, l.embH, "z₀ : 16 × 1024"],
    [11, 15, l.embH, "after 24 layers, still 16 × 1024"],
    [17.2, 18.2, l.llmH, "H_v : 16 × 4096"],
  ];
  for (const [start, end, h, label] of labels) {
    const a = window01(t, start, end, 0.3);
    if (a === 0) continue;
    ctx.globalAlpha = fade * a;
    text(ctx, label, mid, l.bandY + h + 22, font, COLORS.muted, "center");
  }

  const join = phase(t, 19, 19.5);
  if (join > 0) {
    ctx.globalAlpha = fade * join;
    const y = l.bandY + l.llmH + 10;
    const bracket = (from: number, to: number, label: string) => {
      ctx.strokeStyle = COLORS.dim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(from, y - 4);
      ctx.lineTo(from, y);
      ctx.lineTo(to, y);
      ctx.lineTo(to, y - 4);
      ctx.stroke();
      text(ctx, label, (from + to) / 2, y + 15, font, COLORS.muted, "center");
    };
    bracket(l.slotX(0), l.slotX(PRE.length - 1) + l.col, "H_t");
    bracket(l.slotX(PRE.length), l.slotX(PRE.length + PATCHES - 1) + l.col, "H_v : 16 tokens where <image> was");
    bracket(l.slotX(PRE.length + PATCHES), l.slotX(SLOTS - 1) + l.col, "H_t");
  }
  ctx.globalAlpha = fade;
}

function drawPanel(ctx: CanvasRenderingContext2D, t: number, l: Layout, s: Scene, fade: number) {
  const { panelX: px, panelY: py, panelW: pw, panelH: ph, narrow } = l;
  const small = `${narrow ? 9 : 11}px ${FONT_MONO}`;
  const label = `${narrow ? 10 : 12}px ${FONT_SANS}`;

  const a0 = window01(t, 0.3, 3, 0.3);
  if (a0 > 0) {
    ctx.globalAlpha = fade * a0;
    const count = t < 1 ? 0 : Math.min(PATCHES, Math.floor((t - 1) / 0.1) + 1);
    text(ctx, "H = W = 32,  P = 8", px, py + 14, small, COLORS.muted);
    text(ctx, `N = ${count}`, px, py + ph * 0.62, `300 ${narrow ? 30 : 46}px ${FONT_SANS}`, COLORS.text);
    text(ctx, "(32 / 8)² = 4 × 4", px, py + ph * 0.62 + (narrow ? 20 : 28), small, COLORS.muted);
  }

  const a1 = window01(t, 3, 7, 0.3);
  if (a1 > 0) {
    ctx.globalAlpha = fade * a1;
    const size = Math.min(ph * 0.58, pw * 0.42);
    const lift = easeInOut(phase(t, 3, 3.6));
    const bx = lerp(l.imageX + (FOCUS % GRID) * l.cell, px, lift);
    const by = lerp(l.imageY + Math.floor(FOCUS / GRID) * l.cell, py, lift);
    const bs = lerp(l.cell, size, lift) / P;
    const lc = pw / (P * P);
    const lineY = py + size + (narrow ? 20 : 30);
    const lh = Math.max(8, lc * 3);
    ctx.strokeStyle = COLORS.rule;
    ctx.strokeRect(bx - 0.5, by - 0.5, bs * P + 1, bs * P + 1);
    for (let k = 0; k < P * P; k += 1) {
      const r = Math.floor(k / P);
      const p = easeInOut(phase(t, 3.9 + r * 0.16, 4.6 + r * 0.16));
      ctx.fillStyle = s.pixels[FOCUS][k];
      ctx.fillRect(
        lerp(bx + (k % P) * bs, px + k * lc, p),
        lerp(by + r * bs, lineY, p),
        lerp(bs, lc, p) - (p === 0 && bs > 6 ? 1 : 0),
        lerp(bs, lh, p),
      );
    }
    const info = phase(t, 3.5, 3.9);
    ctx.globalAlpha = fade * a1 * info;
    text(ctx, "patch 7, zoomed", px + size + 14, py + 14, label, COLORS.text);
    text(ctx, "8 × 8 pixels", px + size + 14, py + (narrow ? 30 : 34), small, COLORS.muted);
    const rowNow = Math.min(P, Math.max(0, Math.floor((t - 3.9) / 0.16) + 1));
    if (t > 3.9) {
      text(ctx, `row ${rowNow} / 8 → appended`, px + size + 14, py + (narrow ? 46 : 54), small, COLORS.muted);
    }
    const done = phase(t, 5.4, 5.8);
    ctx.globalAlpha = fade * a1 * done;
    text(ctx, "64 pixels × 3 channels = x_p ∈ ℝ¹⁹²", px, lineY + lh + 16, small, COLORS.text);
  }

  const a2 = window01(t, 7, 9.6, 0.3);
  if (a2 > 0) {
    ctx.globalAlpha = fade * a2;
    const mid = py + ph * 0.42;
    const iw = pw * 0.3;
    const lc = iw / (P * P);
    for (let k = 0; k < P * P; k += 1) {
      ctx.fillStyle = s.pixels[FOCUS][k];
      ctx.fillRect(px + k * lc, mid - 5, lc + 0.3, 10);
    }
    text(ctx, "x_p (192)", px, mid + 24, small, COLORS.muted);
    const bx = px + iw + 12;
    const bw = pw * 0.22;
    const bh = ph * 0.5;
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(bx, mid - bh / 2, bw, bh);
    ctx.strokeStyle = COLORS.rule;
    ctx.beginPath();
    for (let x = bx + 6; x < bx + bw; x += 6) {
      ctx.moveTo(x, mid - bh / 2);
      ctx.lineTo(x, mid + bh / 2);
    }
    for (let y = mid - bh / 2 + 6; y < mid + bh / 2; y += 6) {
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + bw, y);
    }
    ctx.stroke();
    ctx.strokeStyle = COLORS.accent;
    ctx.strokeRect(bx, mid - bh / 2, bw, bh);
    text(ctx, "E", bx + bw / 2, mid + 7, `500 ${narrow ? 18 : 22}px ${FONT_SANS}`, COLORS.text, "center");
    text(ctx, "192 × 1024", bx + bw / 2, mid + bh / 2 + 16, small, COLORS.muted, "center");
    const pulse = (t * 1.4) % 1;
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(lerp(px + iw, bx + bw + 12, pulse), mid, 2.5, 0, Math.PI * 2);
    ctx.fill();
    const ox = bx + bw + 12;
    const ow = px + pw - ox;
    const reveal = phase(t, 7.4, 9.2) * EMB_CELLS;
    const cw = ow / EMB_CELLS;
    for (let k = 0; k < reveal; k += 1) {
      ctx.fillStyle = visionColor(s.emb[FOCUS][k]);
      ctx.fillRect(ox + k * cw, mid - 7, cw - 1, 14);
    }
    text(ctx, "z (1024)", ox, mid + 24, small, COLORS.muted);
  }

  const a2b = window01(t, 9.4, 11, 0.3);
  if (a2b > 0) {
    ctx.globalAlpha = fade * a2b;
    const chip = Math.min((ph - 8) / GRID, narrow ? 24 : 32);
    for (let i = 0; i < PATCHES; i += 1) {
      const lit = phase(t, chipLanding(i) - 0.45, chipLanding(i));
      const x = px + (i % GRID) * chip;
      const y = py + Math.floor(i / GRID) * chip;
      ctx.fillStyle = lit > 0 ? `rgba(207, 215, 222, ${0.15 + 0.75 * lit})` : COLORS.rule;
      ctx.fillRect(x + 1, y + 1, chip - 2, chip - 2);
      text(ctx, String(i + 1), x + chip / 2, y + chip / 2 + 4, `${narrow ? 9 : 11}px ${FONT_MONO}`, lit > 0.5 ? COLORS.background : COLORS.muted, "center");
    }
    const tx = px + chip * GRID + 14;
    text(ctx, "+ E_pos", tx, py + 18, `500 ${narrow ? 14 : 18}px ${FONT_SANS}`, COLORS.text);
    text(ctx, "one learned vector per position", tx, py + (narrow ? 36 : 42), small, COLORS.muted);
    text(ctx, "attention alone ignores order,", tx, py + (narrow ? 52 : 62), small, COLORS.muted);
    text(ctx, "so this is where position lives", tx, py + (narrow ? 66 : 80), small, COLORS.muted);
  }

  const a3 = window01(t, 11, 15, 0.3);
  if (a3 > 0) {
    ctx.globalAlpha = fade * a3;
    const m = Math.min(ph, pw * 0.58);
    const c = m / PATCHES;
    const visits = Math.max(0, Math.floor((t - 11.2) / 0.22) + 1);
    const q = (visits - 1) % PATCHES;
    for (let i = 0; i < PATCHES; i += 1) {
      const row = s.attention[i];
      const max = Math.max(...row);
      for (let j = 0; j < PATCHES; j += 1) {
        const seen = visits > PATCHES || i < visits;
        ctx.fillStyle = seen ? `rgba(207, 215, 222, ${0.06 + 0.9 * (row[j] / max)})` : COLORS.rule;
        ctx.fillRect(px + j * c, py + i * c, c - 0.6, c - 0.6);
      }
    }
    if (visits > 0) {
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px - 1, py + q * c - 1, m + 1, c + 1);
    }
    const tx = px + m + 14;
    const layer = Math.min(24, 1 + Math.floor(phase(t, 11.2, 14.6) * 23));
    text(ctx, `layer ${layer} / 24`, tx, py + 14, small, COLORS.text);
    text(ctx, "16 × 16", tx, py + (narrow ? 30 : 34), small, COLORS.muted);
    text(ctx, "row = query", tx, py + (narrow ? 46 : 54), small, COLORS.muted);
    text(ctx, "no mask", tx, py + (narrow ? 62 : 74), small, COLORS.muted);
  }

  const a4 = window01(t, 15, 18, 0.3);
  if (a4 > 0) {
    ctx.globalAlpha = fade * a4;
    const mid = py + ph * 0.45;
    const names = ["Linear", "GELU", "Linear"];
    const bw = pw * 0.17;
    const gap = (pw - bw * 3) / 4;
    names.forEach((name, k) => {
      const x = px + gap * (k + 1) + bw * k;
      ctx.strokeStyle = COLORS.dim;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, mid - ph * 0.2, bw, ph * 0.4);
      text(ctx, name, x + bw / 2, mid + 4, `${narrow ? 9 : 11}px ${FONT_MONO}`, COLORS.body, "center");
    });
    const g = easeInOut(phase(t, 15.4, 17.4));
    const vx = lerp(px, px + pw - 8, g);
    const vh = lerp(ph * 0.36, ph * 0.8, g);
    const n = Math.round(lerp(EMB_CELLS, LLM_CELLS, g));
    drawCells(ctx, vx, mid - vh / 2, 8, vh, n, (k) =>
      g < 0.5 ? visionColor(s.emb[FOCUS][k % EMB_CELLS]) : textColor(s.llm[FOCUS][k]),
    );
    text(ctx, "D_v = 1024", px, py + ph - 2, small, COLORS.muted);
    text(ctx, "D_t = 4096", px + pw, py + ph - 2, small, COLORS.text, "right");
  }

  const a5 = window01(t, 18, LOOP, 0.3);
  if (a5 > 0) {
    ctx.globalAlpha = fade * a5;
    const tokens = ["USER", ":", "<image>", "Describe", "the", "image", "."];
    const open = easeInOut(phase(t, 18.4, 19.2));
    ctx.font = small;
    let x = px;
    const chipH = narrow ? 16 : 20;
    const widths = tokens.map((token) => {
      const base = ctx.measureText(token).width + 10;
      return token === "<image>" ? lerp(base, Math.max(base, pw * 0.32), open) : base;
    });
    // On narrow canvases the prompt is squeezed to fit the panel.
    const fit = Math.min(1, (pw - 4 * (tokens.length - 1)) / widths.reduce((a, b) => a + b, 0));
    tokens.forEach((token, n) => {
      const isImage = token === "<image>";
      const w = widths[n] * fit;
      ctx.strokeStyle = COLORS.dim;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, py, w, chipH);
      if (isImage && open > 0) {
        const cw = (w - 4) / PATCHES;
        for (let i = 0; i < PATCHES; i += 1) {
          ctx.globalAlpha = fade * a5 * open;
          ctx.fillStyle = textColor(s.llm[i][3]);
          ctx.fillRect(x + 2 + i * cw, py + 3, cw - 1, chipH - 6);
        }
        ctx.globalAlpha = fade * a5;
      }
      if (!isImage || open < 1) {
        ctx.globalAlpha = fade * a5 * (isImage ? 1 - open : 1);
        text(ctx, token, x + w / 2, py + chipH - (narrow ? 4 : 6), small, COLORS.text, "center");
        ctx.globalAlpha = fade * a5;
      }
      x += w + 4;
    });

    const top = py + chipH + 12;
    const m = Math.min(ph - chipH - 12, pw * 0.5);
    const c = m / SLOTS;
    const cursor = Math.floor(phase(t, 19.8, 22.8) * (SLOTS - 1));
    const sweeping = t > 19.8;
    for (let i = 0; i < SLOTS; i += 1) {
      for (let j = 0; j < SLOTS; j += 1) {
        const allowed = j <= i;
        const lit = sweeping && i <= cursor && allowed;
        const vision = j >= PRE.length && j < PRE.length + PATCHES;
        ctx.fillStyle = !allowed
          ? "rgba(12, 14, 16, 0.9)"
          : lit
            ? vision
              ? "rgba(214, 196, 160, 0.85)"
              : "rgba(236, 232, 223, 0.85)"
            : COLORS.rule;
        ctx.fillRect(px + j * c, top + i * c, c - 0.5, c - 0.5);
      }
    }
    if (sweeping) {
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 0.5, top + cursor * c - 0.5, m + 1, c + 1);
    }
    const tx = px + m + 14;
    text(ctx, "causal mask", tx, top + 12, label, COLORS.text);
    text(ctx, "position t sees 1 … t", tx, top + (narrow ? 28 : 32), small, COLORS.muted);
    text(ctx, "image tokens included", tx, top + (narrow ? 42 : 50), small, COLORS.muted);
  }
  ctx.globalAlpha = fade;
}

export default function PatchifyAnimation() {
  const chapters = useChapters(CHAPTERS);

  const draw: DrawFrame = (ctx, width, _height, time) => {
    const t = time % LOOP;
    const l = layout(width);
    const s = getScene();
    const fade = phase(t, 0, 0.35) * (1 - phase(t, LOOP - 0.4, LOOP));
    drawImage(ctx, t, l, s, fade);
    drawPanel(ctx, t, l, s, fade);
    drawArcs(ctx, t, l, s, fade);
    drawColumns(ctx, t, l, s, fade);
    drawTextColumns(ctx, t, l, s, fade);
    drawIndexChips(ctx, t, l, fade);
    drawBandLabels(ctx, t, l, fade);
    chapters.update(t);
  };

  const { canvasRef, ...loop } = useCanvasLoop({
    draw,
    height: (width) => layout(width).height,
    stillTime: 21.5,
  });

  return (
    <Figure spaces>
      <ChapterBar
        chapters={CHAPTERS}
        active={chapters.active}
        fills={chapters.fills}
        loop={loop}
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A 32 by 32 image is cut into a 4 by 4 grid of patches. Each patch's pixels are laid out as one column vector, mapped by a matrix E and a position embedding into the encoder's space, passed through ViT self-attention, recolored by the projector into the language model's space, and spliced into a row of text tokens read under a causal mask."
      />
      <ChapterNote chapter={CHAPTERS[chapters.active]} />
    </Figure>
  );
}
