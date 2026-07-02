"use client";

import { useEffect, useRef } from "react";

// Machine-learning signature rendered as a classic-Mac bitmap idiom:
// beveled pixel-square neurons, dithered halos, orthogonal "circuit"
// staircase edges. Cyan activation glow on a near-black CRT surface —
// the small ML signature that fuses with the System-7 aesthetic.

const LAYERS = [4, 6, 6, 4];
const W = 220;
const H = 168;
const TAU = Math.PI * 2;

// Sizes in px, kept on the integer grid for crisp bitmap rendering.
const BEVEL = 6; // node square incl. 1px black border (inner 4x4)
const HALO = 12; // dithered glow square
const BEVEL_HALF = BEVEL / 2;
const HALO_HALF = HALO / 2;

const COL = {
  bg: "#0c0c0c",
  bodyIdle: "#153033",
  bodyFire: "#4cc9d4",
  edgeIdle: "#1b3437",
  edgeFire: "#5ff0f7",
  dither: "#4cc9d4",
  highlight: "#8eecf2",
  border: "#000000",
};

export default function NeuralNetworkMini() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const SVGNS = "http://www.w3.org/2000/svg";
    const padY = 22;
    const availH = H - padY * 2;

    // --- node data (snapped to the pixel grid) ---
    const nodes: { x: number; y: number; layer: number; phase: number }[] = [];
    for (let l = 0; l < LAYERS.length; l++) {
      const count = LAYERS[l];
      const lx = Math.round(26 + ((W - 52) * l) / (LAYERS.length - 1));
      const spacing = availH / (count + 1);
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: lx,
          y: Math.round(padY + spacing * (i + 1)),
          layer: l,
          phase: Math.random() * TAU,
        });
      }
    }

    // --- edge data with a per-edge bend column (orthogonal Manhattan route) ---
    const edges: { from: number; to: number; bendX: number }[] = [];
    const nodesByLayer = (l: number) => nodes.filter((n) => n.layer === l);
    for (let l = 0; l < LAYERS.length - 1; l++) {
      const fromNodes = nodesByLayer(l);
      const toNodes = nodesByLayer(l + 1);
      for (const from of fromNodes) {
        for (const to of toNodes) {
          const gap = to.x - from.x;
          const bendX = Math.round(from.x + gap * (0.28 + Math.random() * 0.44));
          edges.push({ from: nodes.indexOf(from), to: nodes.indexOf(to), bendX });
        }
      }
    }

    // --- defs: 50% cyan dither (halo) + faint desktop dither (background) ---
    const defs = document.createElementNS(SVGNS, "defs");

    const halo = document.createElementNS(SVGNS, "pattern");
    halo.setAttribute("id", "halodither");
    halo.setAttribute("width", "2");
    halo.setAttribute("height", "2");
    halo.setAttribute("patternUnits", "userSpaceOnUse");
    const h0 = document.createElementNS(SVGNS, "rect");
    h0.setAttribute("width", "2");
    h0.setAttribute("height", "2");
    h0.setAttribute("fill", COL.bg);
    const h1 = document.createElementNS(SVGNS, "rect");
    h1.setAttribute("width", "1");
    h1.setAttribute("height", "1");
    h1.setAttribute("fill", COL.dither);
    const h2 = document.createElementNS(SVGNS, "rect");
    h2.setAttribute("x", "1");
    h2.setAttribute("y", "1");
    h2.setAttribute("width", "1");
    h2.setAttribute("height", "1");
    h2.setAttribute("fill", COL.dither);
    halo.append(h0, h1, h2);

    const bgp = document.createElementNS(SVGNS, "pattern");
    bgp.setAttribute("id", "bgdither");
    bgp.setAttribute("width", "2");
    bgp.setAttribute("height", "2");
    bgp.setAttribute("patternUnits", "userSpaceOnUse");
    const b0 = document.createElementNS(SVGNS, "rect");
    b0.setAttribute("width", "2");
    b0.setAttribute("height", "2");
    b0.setAttribute("fill", "#000000");
    const b1 = document.createElementNS(SVGNS, "rect");
    b1.setAttribute("width", "1");
    b1.setAttribute("height", "1");
    b1.setAttribute("fill", "#132224");
    const b2 = document.createElementNS(SVGNS, "rect");
    b2.setAttribute("x", "1");
    b2.setAttribute("y", "1");
    b2.setAttribute("width", "1");
    b2.setAttribute("height", "1");
    b2.setAttribute("fill", "#132224");
    bgp.append(b0, b1, b2);

    defs.append(halo, bgp);
    svg.append(defs);

    // faint desktop-style dither behind everything
    const bgRect = document.createElementNS(SVGNS, "rect");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", String(W));
    bgRect.setAttribute("height", String(H));
    bgRect.setAttribute("fill", "url(#bgdither)");
    svg.append(bgRect);

    // --- edges layer: orthogonal staircase, crisp pixels ---
    const eg = document.createElementNS(SVGNS, "g");
    svg.append(eg);
    const edgeEls: SVGPathElement[] = [];
    for (const e of edges) {
      const from = nodes[e.from];
      const to = nodes[e.to];
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", `M${from.x} ${from.y} H${e.bendX} V${to.y} H${to.x}`);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", COL.edgeIdle);
      p.setAttribute("stroke-width", "1");
      p.setAttribute("shape-rendering", "crispEdges");
      eg.append(p);
      edgeEls.push(p);
    }

    // --- halo layer: dithered squares behind each node ---
    const hg = document.createElementNS(SVGNS, "g");
    svg.append(hg);
    const haloEls: SVGRectElement[] = [];
    for (const n of nodes) {
      const r = document.createElementNS(SVGNS, "rect");
      r.setAttribute("x", String(n.x - HALO_HALF));
      r.setAttribute("y", String(n.y - HALO_HALF));
      r.setAttribute("width", String(HALO));
      r.setAttribute("height", String(HALO));
      r.setAttribute("fill", "url(#halodither)");
      r.setAttribute("opacity", "0");
      hg.append(r);
      haloEls.push(r);
    }

    // --- nodes layer: beveled pixel squares (Mac 3D-button look) ---
    const ng = document.createElementNS(SVGNS, "g");
    svg.append(ng);
    const bodyEls: SVGRectElement[] = [];
    const hlEls: SVGRectElement[] = []; // pairs: [top, left] per node
    for (const n of nodes) {
      const x0 = n.x - BEVEL_HALF;
      const y0 = n.y - BEVEL_HALF;

      const body = document.createElementNS(SVGNS, "rect");
      body.setAttribute("x", String(x0));
      body.setAttribute("y", String(y0));
      body.setAttribute("width", String(BEVEL));
      body.setAttribute("height", String(BEVEL));
      body.setAttribute("fill", COL.bodyIdle);
      body.setAttribute("stroke", COL.border);
      body.setAttribute("stroke-width", "1");
      body.setAttribute("shape-rendering", "crispEdges");
      ng.append(body);
      bodyEls.push(body);

      // top + left 1px highlight — the "raised" bevel, visible when firing
      const top = document.createElementNS(SVGNS, "rect");
      top.setAttribute("x", String(x0 + 1));
      top.setAttribute("y", String(y0 + 1));
      top.setAttribute("width", String(BEVEL - 2));
      top.setAttribute("height", "1");
      top.setAttribute("fill", COL.highlight);
      top.setAttribute("opacity", "0");
      ng.append(top);

      const left = document.createElementNS(SVGNS, "rect");
      left.setAttribute("x", String(x0 + 1));
      left.setAttribute("y", String(y0 + 1));
      left.setAttribute("width", "1");
      left.setAttribute("height", String(BEVEL - 2));
      left.setAttribute("fill", COL.highlight);
      left.setAttribute("opacity", "0");
      ng.append(left);

      hlEls.push(top, left);
    }

    // --- animation: a forward-pass wave sweeping across layers ---
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
        const p = edgeEls[i];
        p.setAttribute("stroke", a > 0.28 ? COL.edgeFire : COL.edgeIdle);
        p.setAttribute("opacity", String(0.08 + a * 0.5));
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const d = Math.abs(n.layer - wavePos);
        const a = Math.exp(-(d * d) / 3);
        const fire = a > 0.28;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + n.phase);

        bodyEls[i].setAttribute("fill", fire ? COL.bodyFire : COL.bodyIdle);

        const ho = fire ? 0.25 + a * 0.6 : 0;
        hlEls[i * 2].setAttribute("opacity", String(ho));
        hlEls[i * 2 + 1].setAttribute("opacity", String(ho));

        haloEls[i].setAttribute(
          "opacity",
          String(fire ? 0.1 + a * 0.55 * (0.6 + 0.4 * pulse) : 0.03),
        );
      }

      animId = requestAnimationFrame(draw);
    };

    // Respect prefers-reduced-motion: draw one static frame, no loop.
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      draw(0);
      cancelAnimationFrame(animId);
      animId = 0;
    } else {
      animId = requestAnimationFrame(draw);
    }

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
      shapeRendering="crispEdges"
    />
  );
}
