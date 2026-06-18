"use client";

import { useEffect, useRef } from "react";

interface NetNode {
  layer: number;
  idx: number;
  x: number;
  y: number;
  act: number; // forward activation 0..1
  grad: number; // backward gradient 0..1
  pat: number; // input data pattern brightness 0..1
}

interface NetEdge {
  a: NetNode;
  b: NetNode;
  w: number; // current weight -1..1
  tw: number; // target weight
  skip: boolean;
}

// ResMLP: two residual blocks. Slightly more complex than a plain MLP,
// with skip connections drawn as arced dashed links.
const LAYER_SIZES = [5, 7, 7, 7, 5, 3];
const NUM_LAYERS = LAYER_SIZES.length;
const SKIPS: Array<[number, number]> = [
  [0, 2],
  [2, 4],
];

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
    let skipEdges: NetEdge[] = [];

    // Training state
    let epoch = 0;
    let loss = 2.4;
    let lossHistory: number[] = [];
    let runStart = performance.now();

    const FORWARD_DUR = 0.95;
    const BACKWARD_DUR = 0.95;
    const UPDATE_DUR = 0.38;
    const CYCLE_DUR = FORWARD_DUR + BACKWARD_DUR + UPDATE_DUR;
    const TAU = Math.PI * 2;

    const randn = () =>
      (Math.random() + Math.random() + Math.random() - 1.5) * 0.5;

    const buildNetwork = () => {
      nodes = [];
      edges = [];
      skipEdges = [];

      const marginX = Math.max(140, Math.min(220, width * 0.08));
      const availW = width - marginX * 2;
      const spacingX = availW / (NUM_LAYERS - 1);

      const cy = height * 0.47;
      const availH = height * 0.8;
      const maxNodes = Math.max(...LAYER_SIZES);
      const spacingY = Math.min(26, availH / (maxNodes - 1));

      for (let l = 0; l < NUM_LAYERS; l++) {
        const n = LAYER_SIZES[l];
        const layerNodes: NetNode[] = [];
        const x = marginX + l * spacingX;
        for (let i = 0; i < n; i++) {
          const y = cy - ((n - 1) / 2) * spacingY + i * spacingY;
          layerNodes.push({ layer: l, idx: i, x, y, act: 0, grad: 0, pat: 0 });
        }
        nodes.push(layerNodes);
      }

      for (let l = 0; l < NUM_LAYERS - 1; l++) {
        for (const a of nodes[l]) {
          for (const b of nodes[l + 1]) {
            const w = randn() * 0.5;
            edges.push({ a, b, w, tw: w, skip: false });
          }
        }
      }

      for (const [from, to] of SKIPS) {
        for (const a of nodes[from]) {
          for (const b of nodes[to]) {
            const w = randn() * 0.35;
            skipEdges.push({ a, b, w, tw: w, skip: true });
          }
        }
      }
    };

    const resetRun = () => {
      for (const e of edges) e.tw = randn() * 0.5;
      for (const e of skipEdges) e.tw = randn() * 0.35;
      epoch = 0;
      loss = 2.3 + Math.random() * 0.3;
      lossHistory = [];
      runStart = performance.now();
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = Math.min(300, Math.max(200, Math.floor(window.innerHeight * 0.32)));
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

    const draw = (now: number) => {
      const rt = (now - runStart) * 0.001;

      const cycleTime = rt % CYCLE_DUR;
      let phase: "fwd" | "bwd" | "upd" = "fwd";
      let phaseT = 0;
      if (cycleTime < FORWARD_DUR) {
        phase = "fwd";
        phaseT = cycleTime / FORWARD_DUR;
      } else if (cycleTime < FORWARD_DUR + BACKWARD_DUR) {
        phase = "bwd";
        phaseT = (cycleTime - FORWARD_DUR) / BACKWARD_DUR;
      } else {
        phase = "upd";
        phaseT = (cycleTime - FORWARD_DUR - BACKWARD_DUR) / UPDATE_DUR;
      }

      const curEpoch = Math.floor(rt / CYCLE_DUR);
      if (curEpoch !== epoch) {
        epoch = curEpoch;
        loss = Math.max(0.05, loss * 0.84 + (Math.random() - 0.45) * 0.07);
        lossHistory.push(loss);
        if (lossHistory.length > 140) lossHistory.shift();
        for (const e of edges) e.tw += (Math.random() - 0.5) * 0.04;
        for (const e of skipEdges) e.tw += (Math.random() - 0.5) * 0.03;
        // new input sample pattern
        for (const n of nodes[0]) n.pat = Math.random() < 0.55 ? 1 : 0.25;
        if (loss < 0.12 && epoch > 14) resetRun();
      }

      // weights drift toward target; faster during the update phase
      const updateRate = phase === "upd" ? 0.09 : 0.012;
      for (const e of edges) e.w += (e.tw - e.w) * updateRate;
      for (const e of skipEdges) e.w += (e.tw - e.w) * updateRate;

      // sweep position across layers
      let sweepPos = 0;
      if (phase === "fwd") sweepPos = phaseT * (NUM_LAYERS - 1);
      else if (phase === "bwd") sweepPos = (1 - phaseT) * (NUM_LAYERS - 1);

      const updateGlow =
        phase === "upd" ? Math.sin(phaseT * Math.PI) : 0;

      // animate node activations / gradients
      for (let l = 0; l < NUM_LAYERS; l++) {
        const dist = Math.abs(sweepPos - l);
        const bump = Math.exp(-(dist * dist) / 0.42);
        for (const n of nodes[l]) {
          if (phase === "fwd") {
            n.act = Math.max(n.act * 0.9, bump);
            n.grad *= 0.9;
          } else if (phase === "bwd") {
            n.grad = Math.max(n.grad * 0.9, bump);
            n.act *= 0.9;
          } else {
            n.act *= 0.85;
            n.grad *= 0.85;
          }
        }
      }

      // fade previous frame (short trails)
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fillRect(0, 0, width, height);

      const drawPulse = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        p: number,
        hue: number,
      ) => {
        const px = ax + (bx - ax) * p;
        const py = ay + (by - ay) * p;
        ctx.fillStyle = `hsla(${hue}, 85%, 78%, 0.95)`;
        ctx.beginPath();
        ctx.arc(px, py, 1.7, 0, TAU);
        ctx.fill();
        // trailing halo
        ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.35)`;
        ctx.beginPath();
        ctx.arc(px, py, 3.4, 0, TAU);
        ctx.fill();
      };

      // sequential edges
      for (const e of edges) {
        const a = e.a;
        const b = e.b;
        const mag = Math.abs(e.w);
        const lo = a.layer;
        const hi = b.layer;
        const sweeping =
          (phase === "fwd" || phase === "bwd") &&
          sweepPos >= lo - 0.1 &&
          sweepPos <= hi + 0.1;

        let alpha = 0.045 + mag * 0.2 + updateGlow * 0.22;
        if (sweeping) {
          const edgeProgress = Math.max(0, Math.min(1, sweepPos - lo));
          const prox = Math.sin(
            Math.min(1, Math.max(0, 1 - Math.abs(edgeProgress - 0.5) * 2)) *
              Math.PI *
              0.5,
          );
          alpha += prox * 0.5 * (phase === "fwd" ? 1 : 0.8);
        }

        const sign = e.w >= 0 ? 1 : -1;
        const hue =
          phase === "bwd" && sweeping ? 322 : sign > 0 ? 198 : 16;
        const sat = phase === "bwd" && sweeping ? 60 : 28;
        ctx.strokeStyle = `hsla(${hue}, ${sat}%, 62%, ${alpha})`;
        ctx.lineWidth = 0.45 + mag * 1.15;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        if (sweeping) {
          const edgeProgress = Math.max(0, Math.min(1, sweepPos - lo));
          const pdir = phase === "fwd" ? edgeProgress : 1 - edgeProgress;
          drawPulse(a.x, a.y, b.x, b.y, pdir, phase === "fwd" ? 188 : 322);
        }
      }

      // skip (residual) edges as arced dashed links
      for (const e of skipEdges) {
        const a = e.a;
        const b = e.b;
        const mag = Math.abs(e.w);
        const midX = (a.x + b.x) / 2;
        const arcH = 30 + Math.abs(a.idx - b.idx) * 2.5;
        const ctrlX = midX;
        const ctrlY = Math.min(a.y, b.y) - arcH;

        const sweeping =
          (phase === "fwd" || phase === "bwd") &&
          sweepPos >= a.layer - 0.1 &&
          sweepPos <= b.layer + 0.1;

        let alpha = 0.06 + mag * 0.18 + updateGlow * 0.18;
        if (sweeping) alpha += 0.28 * (phase === "fwd" ? 1 : 0.7);

        ctx.strokeStyle = `hsla(168, 42%, 60%, ${alpha})`;
        ctx.lineWidth = 0.45 + mag * 0.9;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (sweeping) {
          const span = b.layer - a.layer;
          const edgeProgress = Math.max(
            0,
            Math.min(1, (sweepPos - a.layer) / span),
          );
          const pdir = phase === "fwd" ? edgeProgress : 1 - edgeProgress;
          const px =
            (1 - pdir) * (1 - pdir) * a.x +
            2 * (1 - pdir) * pdir * ctrlX +
            pdir * pdir * b.x;
          const py =
            (1 - pdir) * (1 - pdir) * a.y +
            2 * (1 - pdir) * pdir * ctrlY +
            pdir * pdir * b.y;
          ctx.fillStyle = `hsla(168, 85%, 74%, 0.9)`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, TAU);
          ctx.fill();
        }
      }

      // nodes
      for (let l = 0; l < NUM_LAYERS; l++) {
        for (const n of nodes[l]) {
          const isEdge = l === 0 || l === NUM_LAYERS - 1;
          const baseR = isEdge ? 3.1 : 2.5;
          const inputBoost = l === 0 ? n.pat * 0.5 : 0;
          const glow = Math.max(n.act, n.grad, inputBoost);
          const r = baseR + glow * 2.3;

          if (glow > 0.05) {
            const hue = n.grad > n.act ? 322 : 190;
            ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${glow * 0.22})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 3.6, 0, TAU);
            ctx.fill();
          }

          const coreHue = n.grad > n.act ? 322 : 196;
          const coreLum = 58 + glow * 32 + updateGlow * 12;
          ctx.fillStyle = `hsla(${coreHue}, 55%, ${Math.min(92, coreLum)}%, 0.88)`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, TAU);
          ctx.fill();

          if (glow > 0.18) {
            ctx.fillStyle = `hsla(${coreHue + 8}, 30%, 96%, ${glow * 0.7})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 0.45, 0, TAU);
            ctx.fill();
          }
        }
      }

      // loss curve (bottom-left)
      const gx = 14;
      const gh = 38;
      const gy = height - 12;
      const gw = 118;
      ctx.strokeStyle = "rgba(120, 160, 200, 0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(gx, gy - gh, gw, gh);

      if (lossHistory.length > 1) {
        ctx.strokeStyle = "hsla(190, 70%, 66%, 0.9)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < lossHistory.length; i++) {
          const px = gx + (i / Math.max(1, lossHistory.length - 1)) * gw;
          const py = gy - Math.min(1, lossHistory[i] / 2.6) * gh;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(150, 180, 210, 0.5)";
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText(`loss ${loss.toFixed(3)}`, gx + 3, gy - gh - 4);
      ctx.fillText(`epoch ${epoch}`, gx + gw - 50, gy - gh - 4);

      // phase label (top-right)
      const phaseLabel =
        phase === "fwd" ? "forward" : phase === "bwd" ? "backward" : "update";
      const phaseHue = phase === "fwd" ? 190 : phase === "bwd" ? 322 : 168;
      ctx.fillStyle = `hsla(${phaseHue}, 60%, 72%, 0.55)`;
      ctx.fillText(phaseLabel, width - 78, 16);

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
      className="pointer-events-none fixed inset-x-0 top-0 z-0"
      style={{ display: "block" }}
    />
  );
}
