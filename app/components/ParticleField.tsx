"use client";

import { useEffect, useRef } from "react";

interface NetNode {
  stage: number;
  idx: number;
  x: number;
  y: number;
  z: number;
  act: number;
  twinkle: number;
}

interface NetEdge {
  a: NetNode;
  b: NetNode;
  w: number;
  tw: number;
  kind: "attn" | "ffn" | "skip";
  ctrlX: number;
  ctrlY: number;
  ctrlZ: number;
}

// Transformer-style block — nodes laid out as 3D rings within each stage.
//   stage 0: token embeddings         (6)  -- ring, radius R0
//   stage 1: attention output         (6)  -- ring, radius R0
//   stage 2: FFN hidden               (12) -- two stacked rings of 6, radius R1
//   stage 3: block output             (6)  -- ring, radius R0
// Stages advance along the X axis. The whole network rotates slowly about
// the vertical (world Y) axis.
const STAGE_SIZES = [6, 6, 12, 6];
const NUM_STAGES = STAGE_SIZES.length;
const N_TOK = STAGE_SIZES[0];

// Attention pattern templates applied to the stage0->stage1 edges.
const PATTERNS: Array<(i: number, j: number) => number> = [
  (i, j) => Math.exp(-Math.abs(i - j) / 1.6), // local window
  (i, j) => (i === j ? 0.95 : 0.28 + 0.12 * ((i + j) % 3)), // mixed diagonal
  (i, j) => (j >= i ? Math.exp(-(j - i) / 2.2) : 0.14), // causal-forward
  (i, j) => (j <= i ? Math.exp(-(i - j) / 2.2) : 0.14), // causal-backward
  (i, j) => Math.exp(-((i - j - 2) ** 2) / 2.4), // shifted peak
  (i, j) => 0.4 + 0.5 * Math.abs(Math.sin((i + 1) * (j + 1) * 0.7)), // global
];

// Single muted slate-blue family. Variation is by alpha only.
const C = {
  edge: "hsl(205, 22%, 52%)",
  skip: "hsl(205, 16%, 44%)",
  pulse: "hsl(200, 30%, 64%)",
  node: "hsl(205, 24%, 58%)",
  pos: "hsl(205, 20%, 50%)",
};
const DASH = [3, 4];
const TAU = Math.PI * 2;

// Camera parameters (world units are roughly screen pixels at depth 0).
const CAM_TILT = -0.42; // X-axis tilt (radians) — look down slightly
const FOCAL = 950;
const CAM_Z = 820;

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    let nodes: NetNode[][] = [];
    let edges: NetEdge[] = [];
    let posPoints: Array<{ x: number; y: number; z: number }> = [];
    let runStart = performance.now();
    let nextReset = 30 + Math.random() * 14;
    let cycle = 0;
    let patIdx = Math.floor(Math.random() * PATTERNS.length);

    const ATTN_DUR = 2.8;
    const FFN_DUR = 2.8;
    const SETTLE_DUR = 1.3;
    const CYCLE_DUR = ATTN_DUR + FFN_DUR + SETTLE_DUR;

    const randn = () =>
      (Math.random() + Math.random() + Math.random() - 1.5) * 0.5;

    // Layout parameters (set in buildNetwork).
    let stageSpacingX = 130;
    let ringRadius = 80;
    let ffnRingRadius = 110;
    let ffnRingOffsetY = 22;
    let layoutCy = 0;

    // 3D point → screen. Rotation about world Y, then fixed X-axis tilt.
    const project = (wx: number, wy: number, wz: number, rotY: number) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const rx = wx * cosY - wz * sinY;
      const rz = wx * sinY + wz * cosY;
      const cosT = Math.cos(CAM_TILT);
      const sinT = Math.sin(CAM_TILT);
      const ty = wy * cosT - rz * sinT;
      const tz = wy * sinT + rz * cosT;
      const denom = CAM_Z + tz;
      const safeDenom = denom > 1 ? denom : 1;
      const scale = FOCAL / safeDenom;
      return {
        sx: width / 2 + rx * scale,
        sy: layoutCy + ty * scale,
        depth: tz,
        scale,
      };
    };

    const buildNetwork = () => {
      nodes = [];
      edges = [];
      posPoints = [];

      const availW = width - 300;
      stageSpacingX = Math.max(110, Math.min(150, availW / (NUM_STAGES - 1)));
      // Ring radii scaled to canvas height.
      const h = height;
      ringRadius = Math.min(75, h * 0.16);
      ffnRingRadius = Math.min(105, h * 0.22);
      ffnRingOffsetY = ringRadius * 0.55;
      layoutCy = height * 0.5;

      // Place nodes: each stage is a ring in the Y-Z plane.
      // 6-token stages: single ring. 12-node FFN stage: two stacked rings of 6.
      for (let s = 0; s < NUM_STAGES; s++) {
        const n = STAGE_SIZES[s];
        const stageNodes: NetNode[] = [];
        const wx = (s - (NUM_STAGES - 1) / 2) * stageSpacingX;

        if (s === 2) {
          // FFN hidden: two stacked rings of 6
          for (let ring = 0; ring < 2; ring++) {
            const yOff = ring === 0 ? -ffnRingOffsetY : ffnRingOffsetY;
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * TAU;
              stageNodes.push({
                stage: s,
                idx: ring * 6 + i,
                x: wx,
                y: yOff + Math.cos(ang) * ffnRingRadius,
                z: Math.sin(ang) * ffnRingRadius,
                act: 0,
                twinkle: Math.random() * TAU,
              });
            }
          }
        } else {
          // single ring of n nodes
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * TAU;
            stageNodes.push({
              stage: s,
              idx: i,
              x: wx,
              y: Math.cos(ang) * ringRadius,
              z: Math.sin(ang) * ringRadius,
              act: 0,
              twinkle: Math.random() * TAU,
            });
          }
        }
        nodes.push(stageNodes);
      }

      const pat = PATTERNS[patIdx];
      const addEdge = (a: NetNode, b: NetNode, w: number, kind: NetEdge["kind"]) => {
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        let cz = (a.z + b.z) / 2;
        if (kind === "skip") {
          // bulge outward (radially from stage axis) in the Y-Z plane
          const r = Math.sqrt(cy * cy + cz * cz);
          const k = r > 1 ? 1.35 : 1;
          cz *= k;
          if (r > 1) {
            // also push the control point a bit along X for arc visibility
          }
        } else {
          // slight bow toward viewer for volume
          const dx = b.x - a.x;
          cz += dx * 0.04;
        }
        edges.push({ a, b, w, tw: w, kind, ctrlX: cx, ctrlY: cy, ctrlZ: cz });
      };

      for (const a of nodes[0]) for (const b of nodes[1]) addEdge(a, b, pat(a.idx, b.idx), "attn");
      for (const a of nodes[1]) for (const b of nodes[2]) addEdge(a, b, randn() * 0.4, "ffn");
      for (const a of nodes[2]) for (const b of nodes[3]) addEdge(a, b, randn() * 0.4, "ffn");
      for (let i = 0; i < N_TOK; i++) {
        addEdge(nodes[0][i], nodes[2][i], randn() * 0.28, "skip");
        addEdge(nodes[1][i], nodes[3][i], randn() * 0.28, "skip");
      }

      // positional encoding: helix encircling the token ring (stage 0)
      const tokX = nodes[0][0].x;
      const helixR = ringRadius * 1.45;
      for (let i = 0; i < N_TOK * 2; i++) {
        const t = i / (N_TOK * 2 - 1);
        const ang = t * TAU * 1.2;
        posPoints.push({
          x: tokX - 8 + Math.sin(t * Math.PI) * 4,
          y: Math.cos(ang) * helixR,
          z: Math.sin(ang) * helixR,
        });
      }
    };

    const resetRun = () => {
      patIdx = (patIdx + 1 + Math.floor(Math.random() * (PATTERNS.length - 1))) % PATTERNS.length;
      const pat = PATTERNS[patIdx];
      for (const e of edges) {
        if (e.kind === "attn") e.tw = pat(e.a.idx, e.b.idx);
        else e.tw += (Math.random() - 0.5) * (e.kind === "skip" ? 0.04 : 0.05);
      }
      runStart = performance.now();
      nextReset = 30 + Math.random() * 14;
      cycle = 0;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = Math.min(380, Math.max(260, Math.floor(window.innerHeight * 0.38)));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      buildNetwork();
    };

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    };

    const fillCircle = (sx: number, sy: number, r: number, color: string, alpha: number) => {
      if (r < 0.2) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
    };

    const draw = (now: number) => {
      const rt = (now - runStart) * 0.001;
      if (rt > nextReset) resetRun();

      const cycleTime = rt % CYCLE_DUR;
      let phase: "attn" | "ffn" | "settle" = "attn";
      let phaseT = 0;
      if (cycleTime < ATTN_DUR) {
        phase = "attn";
        phaseT = cycleTime / ATTN_DUR;
      } else if (cycleTime < ATTN_DUR + FFN_DUR) {
        phase = "ffn";
        phaseT = (cycleTime - ATTN_DUR) / FFN_DUR;
      } else {
        phase = "settle";
        phaseT = (cycleTime - ATTN_DUR - FFN_DUR) / SETTLE_DUR;
      }

      const curCycle = Math.floor(rt / CYCLE_DUR);
      if (curCycle !== cycle) {
        cycle = curCycle;
        for (const e of edges) {
          if (e.kind !== "attn") e.tw += (Math.random() - 0.5) * 0.03;
        }
        for (const n of nodes[0]) n.twinkle = Math.random() * TAU;
      }

      const updateRate = phase === "settle" ? 0.06 : 0.012;
      for (const e of edges) e.w += (e.tw - e.w) * updateRate;

      let sweepPos = 0;
      if (phase === "attn") sweepPos = phaseT;
      else if (phase === "ffn") sweepPos = 1 + phaseT * 2;
      else sweepPos = 3;

      const queryF = phase === "attn" ? phaseT * N_TOK : -1;

      for (let s = 0; s < NUM_STAGES; s++) {
        const dist = Math.abs(sweepPos - s);
        const bump = Math.exp(-(dist * dist) / 0.5);
        for (const n of nodes[s]) {
          if (phase === "settle") n.act *= 0.8;
          else n.act = Math.max(n.act * 0.84, bump);
        }
      }

      // fade previous frame
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.fillRect(0, 0, width, height);

      const rotY = rt * 0.16;
      const isSweeping = phase === "attn" || phase === "ffn";

      // Project all nodes.
      const projNodes: Array<{ n: NetNode; sx: number; sy: number; depth: number; scale: number }> =
        [];
      for (let s = 0; s < NUM_STAGES; s++) {
        for (const n of nodes[s]) {
          const p = project(n.x, n.y, n.z, rotY);
          projNodes.push({ n, sx: p.sx, sy: p.sy, depth: p.depth, scale: p.scale });
        }
      }

      // positional encoding helix
      if (posPoints.length > 0) {
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = C.pos;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let i = 0; i < posPoints.length; i++) {
          const p = project(posPoints[i].x, posPoints[i].y, posPoints[i].z, rotY);
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
        for (const pp of posPoints) {
          const p = project(pp.x, pp.y, pp.z, rotY);
          fillCircle(p.sx, p.sy, 1.0 * p.scale, C.pos, 0.14);
        }
      }

      type DrawItem = { depth: number; fn: () => void };
      const drawItems: DrawItem[] = [];

      // attention + FFN edges
      for (const e of edges) {
        if (e.kind === "skip") continue;
        const a = e.a;
        const b = e.b;
        const lo = a.stage;
        const hi = b.stage;
        const mag = Math.abs(e.w);
        const sweeping = isSweeping && sweepPos >= lo - 0.1 && sweepPos <= hi + 0.1;

        let alpha = 0.02 + mag * 0.07;
        if (sweeping) {
          const span = hi - lo;
          const edgeProgress = Math.max(0, Math.min(1, (sweepPos - lo) / span));
          const prox = Math.sin(
            Math.min(1, Math.max(0, 1 - Math.abs(edgeProgress - 0.5) * 2)) * Math.PI * 0.5,
          );
          alpha += prox * 0.12;
        }
        if (e.kind === "attn" && queryF >= 0) {
          const qprox = Math.exp(-((queryF - b.idx - 0.5) ** 2) / 0.7);
          alpha += qprox * 0.1;
        }

        const pa = project(a.x, a.y, a.z, rotY);
        const pb = project(b.x, b.y, b.z, rotY);
        const avgDepth = (pa.depth + pb.depth) * 0.5;
        const depthFactor = 1 - Math.min(1, Math.max(0, avgDepth / 700)) * 0.55;
        const finalAlpha = Math.min(1, alpha * depthFactor);
        const avgScale = (pa.scale + pb.scale) * 0.5;
        const lw = (0.35 + mag * 0.7) * Math.min(1.3, Math.max(0.5, avgScale));

        drawItems.push({
          depth: avgDepth,
          fn: () => {
            ctx.setLineDash([]);
            ctx.globalAlpha = finalAlpha;
            ctx.strokeStyle = C.edge;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(pa.sx, pa.sy);
            ctx.lineTo(pb.sx, pb.sy);
            ctx.stroke();

            if (sweeping && mag > 0.25) {
              const span = hi - lo;
              const edgeProgress = Math.max(0, Math.min(1, (sweepPos - lo) / span));
              const p = edgeProgress;
              const px = pa.sx + (pb.sx - pa.sx) * p;
              const py = pa.sy + (pb.sy - pa.sy) * p;
              fillCircle(px, py, 1.1 * avgScale, C.pulse, 0.35);
            }
          },
        });
      }

      // residual edges (dashed bezier with 3D control point)
      for (const e of edges) {
        if (e.kind !== "skip") continue;
        const a = e.a;
        const b = e.b;
        const lo = a.stage;
        const hi = b.stage;
        const mag = Math.abs(e.w);
        const sweeping = isSweeping && sweepPos >= lo - 0.1 && sweepPos <= hi + 0.1;

        let alpha = 0.03 + mag * 0.06;
        if (sweeping) alpha += 0.07;

        const pa = project(a.x, a.y, a.z, rotY);
        const pb = project(b.x, b.y, b.z, rotY);
        const pc = project(e.ctrlX, e.ctrlY, e.ctrlZ, rotY);
        const avgDepth = (pa.depth + pb.depth) * 0.5;
        const depthFactor = 1 - Math.min(1, Math.max(0, avgDepth / 700)) * 0.55;
        const finalAlpha = Math.min(1, alpha * depthFactor);
        const avgScale = (pa.scale + pb.scale) * 0.5;
        const lw = (0.35 + mag * 0.5) * Math.min(1.3, Math.max(0.5, avgScale));

        drawItems.push({
          depth: avgDepth,
          fn: () => {
            ctx.setLineDash(DASH);
            ctx.globalAlpha = finalAlpha;
            ctx.strokeStyle = C.skip;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(pa.sx, pa.sy);
            ctx.quadraticCurveTo(pc.sx, pc.sy, pb.sx, pb.sy);
            ctx.stroke();
          },
        });
      }

      drawItems.sort((x, y) => y.depth - x.depth);
      for (const it of drawItems) it.fn();
      ctx.setLineDash([]);

      // nodes — back-to-front
      projNodes.sort((x, y) => y.depth - x.depth);
      for (const { n, sx, sy, scale } of projNodes) {
        const isEdge = n.stage === 0 || n.stage === NUM_STAGES - 1;
        const baseR = (isEdge ? 2.8 : 2.2) * Math.min(1.3, Math.max(0.5, scale));
        const inputBoost = n.stage === 0 ? 0.18 + 0.12 * Math.sin(rt * 0.8 + n.twinkle) : 0;
        const glow = Math.max(n.act, Math.max(0, inputBoost));
        const r = baseR + glow * 1.2;
        const depthFactor = 1 - Math.min(1, Math.max(0, (1 - scale) * 0.8)) * 0.4;

        if (glow > 0.05) {
          fillCircle(sx, sy, r * 2.4, C.node, glow * 0.07 * depthFactor);
        }
        fillCircle(sx, sy, r, C.node, (0.32 + glow * 0.2) * depthFactor);
      }

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    resize();
    resetRun();
    window.addEventListener("resize", debouncedResize);
    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-0 block"
    />
  );
}
