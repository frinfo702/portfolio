"use client";

import { useEffect, useRef, useCallback } from "react";

interface Node {
  layer: number;
  index: number;
  x: number;
  y: number;
  baseRadius: number;
  phase: number;
  pulse: number;
  cascadeGlow: number;
}

interface Edge {
  from: Node;
  to: Node;
  cpx: number;
  cpy: number;
  isSkip: boolean;
}

const TAU = Math.PI * 2;
const LAYERS = [5, 7, 9, 7, 5];

// Fixed network dimensions — independent of viewport size
const BASE_W = 1400;
const BASE_H = 900;

const COL = {
  nodeFill: "hsla(205, 55%, 72%, 0.72)",
  nodeStroke: "hsla(205, 45%, 82%, 0.45)",
  nodeGlow: "hsla(200, 60%, 68%, 0.20)",
  nodeCascade: "hsla(195, 70%, 68%, 0.80)",
  nodeCascadeGlow: "hsla(195, 70%, 65%, 0.25)",
  edge: "hsla(210, 40%, 62%, 0.30)",
  edgeSkip: "hsla(210, 35%, 55%, 0.18)",
  edgeCascade: "hsla(195, 50%, 65%, 0.40)",
};

const WAVE_SPEED = 0.08; // layers per second

export default function NeuralNetworkField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    nodes: Node[];
    edges: Edge[];
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const initState = useCallback(
    (viewportW: number, viewportH: number) => {
      const padX = 140;
      const padY = 100;
      const availW = BASE_W - padX * 2;
      const availH = BASE_H - padY * 2;
      const maxNodes = Math.max(...LAYERS);
      const nodeSpacingY = availH / (maxNodes + 1);

      const nodes: Node[] = [];
      for (let l = 0; l < LAYERS.length; l++) {
        const count = LAYERS[l];
        const layerX = padX + (availW * l) / (LAYERS.length - 1);
        const startY = padY + (availH - (count - 1) * nodeSpacingY) / 2;
        for (let i = 0; i < count; i++) {
          nodes.push({
            layer: l,
            index: i,
            x: layerX,
            y: startY + i * nodeSpacingY,
            baseRadius: 2.0 + Math.random() * 0.5,
            phase: Math.random() * TAU,
            pulse: 0,
            cascadeGlow: 0,
          });
        }
      }

      const edges: Edge[] = [];
      const nodeByLayer = (l: number) =>
        nodes.filter((n) => n.layer === l);

      for (let l = 0; l < LAYERS.length - 1; l++) {
        const fromNodes = nodeByLayer(l);
        const toNodes = nodeByLayer(l + 1);
        for (const from of fromNodes) {
          for (const to of toNodes) {
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const dy = to.y - from.y;
            const bow =
              Math.min(60, Math.abs(dy) * 0.3 + 15) * (dy > 0 ? 1 : -1);
            edges.push({
              from,
              to,
              cpx: midX,
              cpy: midY + bow * (0.6 + Math.random() * 0.5),
              isSkip: false,
            });
          }
        }
      }

      const skipPairs: [number, number][] = [
        [0, 2],
        [1, 3],
        [2, 4],
      ];
      for (const [la, lb] of skipPairs) {
        const fromNodes = nodeByLayer(la);
        const toNodes = nodeByLayer(lb);
        for (let i = 0; i < Math.min(fromNodes.length, toNodes.length); i++) {
          const from = fromNodes[i];
          const to = toNodes[i];
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          edges.push({
            from,
            to,
            cpx: midX,
            cpy: midY + (Math.random() - 0.5) * 40,
            isSkip: true,
          });
        }
      }

      // Center the fixed-size network in the viewport
      const offsetX = (viewportW - BASE_W) / 2;
      const offsetY = (viewportH - BASE_H) / 2;

      return { nodes, edges, offsetX, offsetY };
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId = 0;
    let dpr = 1;
    let width = 0;
    let height = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current = initState(width, height);
    };

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    };

    const draw = (timestamp: number) => {
      const s = stateRef.current;
      if (!s) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const now = timestamp * 0.001;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(s.offsetX, s.offsetY);

      // ── Triangle wave: smooth 0 ↔ maxLayer back-and-forth ────────────
      // No hard jump → no flicker. Full round-trip ≈ 50 s (very gradual)
      const maxLayer = LAYERS.length - 1;
      const tri = 1 - Math.abs(((now * WAVE_SPEED) % 2) - 1); // 0→1→0→1…
      const wavePos = tri * maxLayer;

      // ── Update nodes ─────────────────────────────────────────────────
      for (const node of s.nodes) {
        node.pulse = Math.sin(now * 1.3 + node.phase) * 0.18;

        const distFromWave = Math.abs(node.layer - wavePos);
        // Wide Gaussian — creates a broad gradient across all layers
        const gauss = Math.exp(-(distFromWave * distFromWave) / 8.0);
        // Baseline 0.15 so nodes never go fully dark
        node.cascadeGlow = 0.15 + gauss * 0.85;
      }

      // ── Draw edges ───────────────────────────────────────────────────
      const sortedEdges = [...s.edges].sort(
        (a, b) => a.from.layer - b.from.layer,
      );

      for (const edge of sortedEdges) {
        const { from, to } = edge;

        const edgeCenter = (from.layer + to.layer) / 2;
        const edgeDist = Math.abs(edgeCenter - wavePos);
        const edgeGauss = Math.exp(-(edgeDist * edgeDist) / 8.0);

        const baseAlpha = edge.isSkip ? 0.10 : 0.16;
        const edgeAlpha = baseAlpha + edgeGauss * 0.30;

        ctx.globalAlpha = Math.min(0.50, edgeAlpha);
        ctx.strokeStyle = edge.isSkip
          ? COL.edgeSkip
          : edgeGauss > 0.25
            ? COL.edgeCascade
            : COL.edge;
        ctx.lineWidth = edge.isSkip ? 0.5 : 0.7;
        ctx.setLineDash(edge.isSkip ? [3, 5] : []);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(edge.cpx, edge.cpy, to.x, to.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // ── Draw nodes (original rendering style) ────────────────────────
      const sortedNodes = [...s.nodes].sort((a, b) => a.layer - b.layer);

      for (const node of sortedNodes) {
        const breath = 1 + node.pulse;
        const r = node.baseRadius * breath;
        const visibility = node.cascadeGlow;

        // Glow halo
        const glowR = r * 3.0;
        ctx.globalAlpha = visibility * 0.35;
        const glowGrad = ctx.createRadialGradient(
          node.x,
          node.y,
          r * 0.5,
          node.x,
          node.y,
          glowR,
        );
        glowGrad.addColorStop(0, COL.nodeGlow);
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, TAU);
        ctx.fill();

        // Outer halo
        ctx.globalAlpha = visibility * 0.20;
        ctx.fillStyle = COL.nodeGlow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 4.5, 0, TAU);
        ctx.fill();

        // Node body
        const fillAlpha = 0.06 + visibility * 0.72;
        const fillColor =
          visibility > 0.15 ? COL.nodeCascade : COL.nodeFill;
        ctx.globalAlpha = Math.min(0.9, fillAlpha);
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, TAU);
        ctx.fill();

        // Node stroke
        ctx.globalAlpha = 0.06 + visibility * 0.38;
        ctx.strokeStyle = COL.nodeStroke;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, TAU);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", debouncedResize);
    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      cancelAnimationFrame(animationId);
    };
  }, [initState]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
