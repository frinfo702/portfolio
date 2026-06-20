"use client";

import { useEffect, useRef } from "react";

const LAYERS = [4, 6, 6, 4];
const W = 180;
const H = 180;
const TAU = Math.PI * 2;

const COL = {
  nodeFill: "hsla(205, 55%, 72%, 72%)",
  nodeStroke: "hsla(205, 45%, 82%, 45%)",
  edge: "hsla(210, 40%, 62%, 25%)",
  edgeActive: "hsla(195, 60%, 68%, 50%)",
  nodeGlow: "hsla(200, 60%, 68%, 20%)",
};

export default function NeuralNetworkMini() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const padY = 24;
    const availH = H - padY * 2;

    // --- build node data ---
    const nodes: {
      x: number; y: number; baseR: number; layer: number; phase: number;
    }[] = [];
    for (let l = 0; l < LAYERS.length; l++) {
      const count = LAYERS[l];
      const lx = 20 + ((W - 40) * l) / (LAYERS.length - 1);
      const spacing = availH / (count + 1);
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: lx,
          y: padY + spacing * (i + 1),
          baseR: 3.0 + Math.random() * 0.8,
          layer: l,
          phase: Math.random() * TAU,
        });
      }
    }

    // --- build edge data ---
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

    // --- defs: glow gradient ---
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
    grad.setAttribute("id", "ng");
    const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s1.setAttribute("offset", "15%");
    s1.setAttribute("stop-color", COL.nodeGlow);
    const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s2.setAttribute("offset", "100%");
    s2.setAttribute("stop-color", "transparent");
    grad.append(s1, s2);
    defs.append(grad);
    svg.append(defs);

    // --- edges layer ---
    const eg = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.append(eg);
    const edgeEls: SVGPathElement[] = [];
    for (const e of edges) {
      const from = nodes[e.from];
      const to = nodes[e.to];
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const dy = to.y - from.y;
      const bow = Math.min(16, Math.abs(dy) * 0.2 + 4) * (dy > 0 ? 1 : -1);
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", `M${from.x},${from.y} Q${mx},${my + bow} ${to.x},${to.y}`);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-width", "1");
      eg.append(p);
      edgeEls.push(p);
    }

    // --- nodes layer ---
    const ng = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.append(ng);
    const glowEls: SVGCircleElement[] = [];
    const bodyEls: SVGCircleElement[] = [];
    for (const n of nodes) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", String(n.x));
      g.setAttribute("cy", String(n.y));
      g.setAttribute("fill", "url(#ng)");
      ng.append(g);
      glowEls.push(g);

      const b = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      b.setAttribute("cx", String(n.x));
      b.setAttribute("cy", String(n.y));
      b.setAttribute("fill", COL.nodeFill);
      b.setAttribute("stroke", COL.nodeStroke);
      b.setAttribute("stroke-width", "0.7");
      ng.append(b);
      bodyEls.push(b);
    }

    // --- animation ---
    let animId = 0;
    const draw = (ts: number) => {
      const t = ts * 0.001;
      const maxLayer = LAYERS.length - 1;
      const tri = 1 - Math.abs(((t * 0.12) % 2) - 1);
      const wavePos = tri * maxLayer;

      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const from = nodes[e.from];
        const to = nodes[e.to];
        const ec = (from.layer + to.layer) / 2;
        const d = Math.abs(ec - wavePos);
        const a = Math.exp(-(d * d) / 3);
        const alpha = 0.12 + a * 0.35;
        const p = edgeEls[i];
        p.setAttribute("stroke", a > 0.3 ? COL.edgeActive : COL.edge);
        p.setAttribute("opacity", String(alpha));
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const d = Math.abs(n.layer - wavePos);
        const a = Math.exp(-(d * d) / 3);
        const vis = 0.12 + a * 0.85;
        const r = n.baseR + Math.sin(t * 1.3 + n.phase) * 0.16;

        glowEls[i].setAttribute("r", String(r * 2.5));
        glowEls[i].setAttribute("opacity", String(vis * 0.30));

        bodyEls[i].setAttribute("r", String(r));
        bodyEls[i].setAttribute("opacity", String(Math.min(0.85, 0.05 + vis * 0.75)));
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      svg.textContent = "";
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none shrink-0"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
    />
  );
}
