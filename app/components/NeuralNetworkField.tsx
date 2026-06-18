"use client";

import { useEffect, useRef, useCallback } from "react";

interface Node {
  layer: number;
  index: number;
  x: number;
  y: number;
  baseRadius: number;
  phase: number;
  // runtime state
  pulse: number;
  cascadeGlow: number;
}

interface Edge {
  from: Node;
  to: Node;
  cpx: number;
  cpy: number;
  // signal particles traveling along this edge
  signals: Signal[];
}

interface Signal {
  t: number; // 0→1 progress along bezier
  speed: number; // rate of t per second
  alpha: number;
  size: number;
}

interface BgParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

const TAU = Math.PI * 2;
const LAYERS = [5, 7, 9, 7, 5];
const BG_PARTICLE_COUNT = 60;

const CASCADE_INTERVAL_MIN = 7;
const CASCADE_INTERVAL_MAX = 13;
const CASCADE_DURATION = 1.8;

const COL = {
  nodeFill: "hsla(205, 55%, 72%, 0.72)",
  nodeStroke: "hsla(205, 45%, 82%, 0.45)",
  nodeGlow: "hsla(200, 60%, 68%, 0.20)",
  nodeCascade: "hsla(195, 70%, 68%, 0.80)",
  nodeCascadeGlow: "hsla(195, 70%, 65%, 0.25)",
  edge: "hsla(210, 40%, 62%, 0.30)",
  edgeSkip: "hsla(210, 35%, 55%, 0.18)",
  edgeCascade: "hsla(195, 50%, 65%, 0.40)",
  signal: "hsla(190, 70%, 60%, 0.70)",
  signalCascade: "hsla(190, 75%, 65%, 0.85)",
  bgParticle: "hsla(210, 40%, 58%, 0.14)",
};

const bezierPoint = (
  t: number,
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
) => {
  const u = 1 - t;
  return {
    x: u * u * ax + 2 * u * t * cx + t * t * bx,
    y: u * u * ay + 2 * u * t * cy + t * t * by,
  };
};

export default function NeuralNetworkField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    nodes: Node[];
    edges: Edge[];
    bgParticles: BgParticle[];
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
    cascadeUntil: number;
    nextCascade: number;
  } | null>(null);

  const initState = useCallback((width: number, height: number) => {
    const padX = 140;
    const padY = 100;
    const availW = width - padX * 2;
    const availH = height - padY * 2;
    const maxNodes = Math.max(...LAYERS);
    const nodeSpacingY = availH / (maxNodes + 1);

    // Create nodes
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
          baseRadius: 3.8 + Math.random() * 0.8,
          phase: Math.random() * TAU,
          pulse: 0,
          cascadeGlow: 0,
        });
      }
    }

    // Build edges — fully connected between adjacent layers
    const edges: Edge[] = [];
    const nodeByLayer = (l: number) => nodes.filter((n) => n.layer === l);

    for (let l = 0; l < LAYERS.length - 1; l++) {
      const fromNodes = nodeByLayer(l);
      const toNodes = nodeByLayer(l + 1);
      for (const from of fromNodes) {
        for (const to of toNodes) {
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          const dy = to.y - from.y;
          // Bow control point outward for nice curves
          const bow = Math.min(60, Math.abs(dy) * 0.3 + 15) * (dy > 0 ? 1 : -1);
          const cpx = midX;
          const cpy = midY + bow * (0.6 + Math.random() * 0.5);
          const signalCount =
            Math.random() < 0.7 ? 1 : Math.random() < 0.6 ? 2 : 0;
          const signals: Signal[] = [];
          for (let s = 0; s < signalCount; s++) {
            signals.push({
              t: Math.random(),
              speed: 0.08 + Math.random() * 0.18,
              alpha: 0.4 + Math.random() * 0.4,
              size: 1.5 + Math.random() * 1.0,
            });
          }
          edges.push({ from, to, cpx, cpy, signals });
        }
      }
    }

    // Skip connections (layer 0→2, layer 1→3, layer 2→4) for visual depth
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
          signals:
            Math.random() < 0.5
              ? [
                  {
                    t: Math.random(),
                    speed: 0.06 + Math.random() * 0.12,
                    alpha: 0.3,
                    size: 1.3,
                  },
                ]
              : [],
        });
      }
    }

    // Background ambient particles
    const bgParticles: BgParticle[] = [];
    for (let i = 0; i < BG_PARTICLE_COUNT; i++) {
      bgParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15 - 0.05,
        radius: 0.6 + Math.random() * 1.0,
        alpha: 0.08 + Math.random() * 0.18,
      });
    }

    return {
      nodes,
      edges,
      bgParticles,
      mouseX: width / 2,
      mouseY: height / 2,
      width,
      height,
      cascadeUntil: 0,
      nextCascade:
        CASCADE_INTERVAL_MIN +
        Math.random() * (CASCADE_INTERVAL_MAX - CASCADE_INTERVAL_MIN),
    };
  }, []);

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
    let lastTime = 0;

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

    const onMouseMove = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s) return;
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;
    };

    const draw = (timestamp: number) => {
      const s = stateRef.current;
      if (!s) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const rawDt = lastTime ? (timestamp - lastTime) * 0.001 : 0.016;
      const dt = Math.min(rawDt, 0.1);
      lastTime = timestamp;

      // ── Update ──────────────────────────────────────────────────────────

      const now = timestamp * 0.001;

      // Cascade logic
      if (now > s.nextCascade) {
        s.cascadeUntil = now + CASCADE_DURATION;
        s.nextCascade =
          now +
          CASCADE_INTERVAL_MIN +
          Math.random() * (CASCADE_INTERVAL_MAX - CASCADE_INTERVAL_MIN);
      }

      const cascadeProgress =
        s.cascadeUntil > now
          ? 1 - (s.cascadeUntil - now) / CASCADE_DURATION
          : -1;
      const inCascade = cascadeProgress >= 0;
      const waveFront = inCascade ? cascadeProgress * (LAYERS.length - 1) : -1;

      // Parallax offsets from mouse position
      const mx = (s.mouseX / s.width - 0.5) * 2;
      const my = (s.mouseY / s.height - 0.5) * 2;
      const parallaxStr = 8;

      // Update nodes
      for (const node of s.nodes) {
        // Breathing pulse
        node.pulse = Math.sin(now * 1.3 + node.phase) * 0.18;
        // Cascade glow
        const distFromWave = inCascade ? Math.abs(node.layer - waveFront) : 999;
        const gauss = Math.exp(-(distFromWave * distFromWave) / 0.7);
        node.cascadeGlow = inCascade
          ? Math.max(0, gauss * (1 - Math.abs(cascadeProgress - 0.5) * 2))
          : 0;
      }

      // Update signal particles
      for (const edge of s.edges) {
        for (let i = edge.signals.length - 1; i >= 0; i--) {
          const sig = edge.signals[i];
          sig.t += sig.speed * dt;
          if (sig.t >= 1) {
            sig.t = 0;
          }
        }
      }

      // Update background particles
      for (const p of s.bgParticles) {
        p.x += p.vx * dt * 30;
        p.y += p.vy * dt * 30;
        if (p.x < -10) p.x = s.width + 10;
        if (p.x > s.width + 10) p.x = -10;
        if (p.y < -10) p.y = s.height + 10;
        if (p.y > s.height + 10) p.y = -10;
      }

      ctx.clearRect(0, 0, s.width, s.height);

      // Background ambient particles (draw first, behind everything)
      for (const p of s.bgParticles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = COL.bgParticle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, TAU);
        ctx.fill();
      }

      // Draw edges (sorted roughly back-to-front by layer for slight depth)
      const sortedEdges = [...s.edges].sort(
        (a, b) => a.from.layer - b.from.layer,
      );

      for (const edge of sortedEdges) {
        const { from, to } = edge;
        // Parallax-shifted positions
        const depthA = from.layer * 1.5;
        const depthB = to.layer * 1.5;
        const ax = from.x + mx * parallaxStr * (1 + depthA * 0.3);
        const ay = from.y + my * parallaxStr * (1 + depthA * 0.3);
        const bx = to.x + mx * parallaxStr * (1 + depthB * 0.3);
        const by = to.y + my * parallaxStr * (1 + depthB * 0.3);
        const cpx =
          edge.cpx + mx * parallaxStr * (1 + (depthA + depthB) * 0.15);
        const cpy =
          edge.cpy + my * parallaxStr * (1 + (depthA + depthB) * 0.15);

        const isSkip = Math.abs(to.layer - from.layer) > 1;

        // Edge alpha boosted near cascade wave front
        let edgeAlpha = isSkip ? 0.16 : 0.28;
        if (inCascade) {
          const edgeCenter = (from.layer + to.layer) / 2;
          const edgeDist = Math.abs(edgeCenter - waveFront);
          const edgeGauss = Math.exp(-(edgeDist * edgeDist) / 1.2);
          edgeAlpha += edgeGauss * 0.18;
        }

        ctx.globalAlpha = Math.min(0.55, edgeAlpha);
        ctx.strokeStyle = isSkip
          ? COL.edgeSkip
          : inCascade && edgeAlpha > 0.32
            ? COL.edgeCascade
            : COL.edge;
        ctx.lineWidth = isSkip ? 0.5 : 0.7;
        ctx.setLineDash(isSkip ? [3, 5] : []);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(cpx, cpy, bx, by);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw signal particles
        for (const sig of edge.signals) {
          const pt = bezierPoint(sig.t, ax, ay, cpx, cpy, bx, by);
          let sigAlpha = sig.alpha;
          if (inCascade) {
            const sigLayer = from.layer + sig.t * (to.layer - from.layer);
            const sigDist = Math.abs(sigLayer - waveFront);
            sigAlpha = Math.min(
              1,
              sigAlpha + Math.exp(-(sigDist * sigDist) / 0.5) * 0.5,
            );
          }
          ctx.globalAlpha = Math.min(0.9, sigAlpha);
          ctx.fillStyle =
            inCascade && sigAlpha > 0.55 ? COL.signalCascade : COL.signal;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, sig.size, 0, TAU);
          ctx.fill();
        }
      }

      // Draw nodes (back layers first for depth)
      const sortedNodes = [...s.nodes].sort((a, b) => a.layer - b.layer);

      for (const node of sortedNodes) {
        const depth = node.layer * 1.5;
        const nx = node.x + mx * parallaxStr * (1 + depth * 0.3);
        const ny = node.y + my * parallaxStr * (1 + depth * 0.3);
        const breath = 1 + node.pulse;
        const r = node.baseRadius * breath;

        // Glow halo
        const glowR = r * 3.0;
        const glowAlpha = 0.16 + node.cascadeGlow * 0.3;
        ctx.globalAlpha = glowAlpha;
        const glowGrad = ctx.createRadialGradient(
          nx,
          ny,
          r * 0.5,
          nx,
          ny,
          glowR,
        );
        glowGrad.addColorStop(0, COL.nodeGlow);
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, glowR, 0, TAU);
        ctx.fill();

        // Outer halo (subtle)
        ctx.globalAlpha = 0.08 + node.cascadeGlow * 0.15;
        ctx.fillStyle = COL.nodeGlow;
        ctx.beginPath();
        ctx.arc(nx, ny, r * 4.5, 0, TAU);
        ctx.fill();

        // Node body
        const fillAlpha = 0.65 + node.pulse * 0.2 + node.cascadeGlow * 0.3;
        const fillColor =
          node.cascadeGlow > 0.1 ? COL.nodeCascade : COL.nodeFill;

        ctx.globalAlpha = Math.min(0.9, fillAlpha);
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, TAU);
        ctx.fill();

        // Node stroke
        ctx.globalAlpha = 0.35 + node.cascadeGlow * 0.25;
        ctx.strokeStyle = COL.nodeStroke;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, TAU);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", debouncedResize);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      window.removeEventListener("mousemove", onMouseMove);
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
