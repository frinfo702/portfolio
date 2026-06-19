"use client";

import { useEffect, useRef } from "react";

const LAYERS = [4, 6, 6, 4];
const W = 128;
const H = 104;
const TAU = Math.PI * 2;

const COL = {
  nodeFill: "hsla(205, 55%, 72%, 0.72)",
  nodeStroke: "hsla(205, 45%, 82%, 0.45)",
  edge: "hsla(210, 40%, 62%, 0.25)",
  edgeActive: "hsla(195, 60%, 68%, 0.50)",
  nodeGlow: "hsla(200, 60%, 68%, 0.20)",
};

export default function NeuralNetworkMini() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padY = 12;
    const availH = H - padY * 2;
    const maxNodes = Math.max(...LAYERS);

    const nodes: { x: number; y: number; baseR: number; layer: number; phase: number }[] = [];
    for (let l = 0; l < LAYERS.length; l++) {
      const count = LAYERS[l];
      const lx = 20 + ((W - 40) * l) / (LAYERS.length - 1);
      const spacing = availH / (count + 1);
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: lx,
          y: padY + spacing * (i + 1),
          baseR: 2.2 + Math.random() * 0.5,
          layer: l,
          phase: Math.random() * TAU,
        });
      }
    }

    // Build edges between adjacent layers
    const edges: { from: number; to: number }[] = [];
    const nodesByLayer = (l: number) => nodes.filter((n) => n.layer === l);
    for (let l = 0; l < LAYERS.length - 1; l++) {
      const fromNodes = nodesByLayer(l);
      const toNodes = nodesByLayer(l + 1);
      for (const from of fromNodes) {
        for (const to of toNodes) {
          edges.push({ from: nodes.indexOf(from), to: nodes.indexOf(to) });
        }
      }
    }

    let animId = 0;
    const draw = (timestamp: number) => {
      const t = timestamp * 0.001;
      ctx.clearRect(0, 0, W, H);

      // Wave position: 0 → maxLayer → 0 (forward + backward = learning cycle)
      const maxLayer = LAYERS.length - 1;
      const tri = 1 - Math.abs(((t * 0.12) % 2) - 1);
      const wavePos = tri * maxLayer;

      // Edges
      for (const edge of edges) {
        const from = nodes[edge.from];
        const to = nodes[edge.to];
        const edgeCenter = (from.layer + to.layer) / 2;
        const dist = Math.abs(edgeCenter - wavePos);
        const active = Math.exp(-(dist * dist) / 3.0);

        ctx.globalAlpha = 0.12 + active * 0.35;
        ctx.strokeStyle = active > 0.3 ? COL.edgeActive : COL.edge;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dy = to.y - from.y;
        const bow = Math.min(10, Math.abs(dy) * 0.18 + 3) * (dy > 0 ? 1 : -1);
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY + bow, to.x, to.y);
        ctx.stroke();
      }

      // Nodes
      for (const node of nodes) {
        const dist = Math.abs(node.layer - wavePos);
        const active = Math.exp(-(dist * dist) / 3.0);
        const visibility = 0.12 + active * 0.85;
        const r = node.baseR + Math.sin(t * 1.3 + node.phase) * 0.16;

        // Glow
        const glowR = r * 2.5;
        ctx.globalAlpha = visibility * 0.30;
        const grad = ctx.createRadialGradient(node.x, node.y, r * 0.3, node.x, node.y, glowR);
        grad.addColorStop(0, COL.nodeGlow);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, TAU);
        ctx.fill();

        // Body
        ctx.globalAlpha = Math.min(0.85, 0.05 + visibility * 0.75);
        ctx.fillStyle = COL.nodeFill;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, TAU);
        ctx.fill();

        // Stroke
        ctx.globalAlpha = 0.05 + visibility * 0.35;
        ctx.strokeStyle = COL.nodeStroke;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, TAU);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none shrink-0"
      width={W}
      height={H}
    />
  );
}
