"use client";

import { useEffect, useRef } from "react";

// 3D diffusion field powered by jax-js.
//
// A cloud of particles undergoes overdamped Langevin dynamics (an
// Ornstein-Uhlenbeck process) with an added swirling advection field:
//
//   dx = (-kappa * x + alpha * cross(x, axis)) * dt + sigma * sqrt(dt) * N(0,1)
//
// All vectorized array ops run on jax-js (WebGPU when available, else Wasm)
// and are fused into a single kernel via jit(). Positions are read back each
// frame and projected onto a 2D canvas with a slowly rotating perspective
// camera. Motion trails come from a translucent black overlay each frame plus
// streak lines between consecutive projected positions.

const TAU = Math.PI * 2;
const N_PARTICLES = 1200;
const DT = 0.06;
const KAPPA = 0.18; // harmonic confinement (OU drift)
const SIGMA = 0.7; // diffusion (noise) scale
const SWIRL = 0.9; // rotational advection strength

// Slate-blue family, varied by alpha.
const COL_CORE = "hsl(205, 32%, 66%)";
const COL_HALO = "hsl(205, 26%, 52%)";
const COL_HOT = "hsl(198, 42%, 76%)";

type JaxArray = import("@jax-js/jax").Array;
type JaxModule = typeof import("@jax-js/jax");

export default function DiffusionField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId = 0;
    let disposed = false;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    let jax: JaxModule | null = null;
    let key: JaxArray | null = null;
    let X: JaxArray | null = null;
    let stepJit: ((x: JaxArray, k: JaxArray) => [JaxArray, JaxArray]) | null = null;
    let prevScreen: Float32Array | null = null;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = Math.min(420, Math.max(280, Math.floor(window.innerHeight * 0.42)));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      prevScreen = null;
    };

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    };

    const setupJax = async () => {
      jax = await import("@jax-js/jax");
      const np = jax.numpy;
      const random = jax.random;
      const { jit } = jax;

      try {
        const devices = await jax.init();
        if (devices.includes("webgpu")) jax.defaultDevice("webgpu");
      } catch {
        // fall back to default wasm device
      }

      key = random.key(20260618);
      const [k0, k1] = random.split(key, 2);
      key = k0;
      X = random.normal(k1, [N_PARTICLES, 3]).mul(0.5);

      // Swirl axis (constant, baked into the compiled kernel).
      const axis = np.array([0.35, 1.0, 0.25], { dtype: np.float32 });

      // One fused step: overdamped Langevin SDE.
    //   dx = (-kappa * x + alpha * cross(x, axis)) * dt + sigma * sqrt(dt) * noise
    //   x' = x + dx
    //   k' = split(k)[0]
      stepJit = jit(function step(x: JaxArray, k: JaxArray): [JaxArray, JaxArray] {
        // x is used 3 times: neg (drift), cross (swirl), add (update).
        const drift = x.ref.neg().mul(KAPPA);
        const swirl = np.cross(x.ref, axis).mul(SWIRL);
        const [kNext, kNoise] = random.split(k, 2);
        const noise = random.normal(kNoise, [N_PARTICLES, 3]);
        const sqrtDt = Math.sqrt(DT);
        const dx = drift.add(swirl).mul(DT).add(noise.mul(SIGMA * sqrtDt));
        const newX = x.add(dx);
        return [newX, kNext];
      });
    };

    const project = (
      wx: number,
      wy: number,
      wz: number,
      cosY: number,
      sinY: number,
      cosT: number,
      sinT: number,
      cx: number,
      cy: number,
    ) => {
      const rx = wx * cosY - wz * sinY;
      const rz = wx * sinY + wz * cosY;
      const ty = wy * cosT - rz * sinT;
      const tz = wy * sinT + rz * cosT;
      const denom = 9.5 + tz;
      const scale = 760 / (denom > 0.1 ? denom : 0.1);
      return { sx: cx + rx * scale, sy: cy + ty * scale, depth: tz, scale };
    };

    const draw = async () => {
      if (!jax || !stepJit || !X || !key) {
        if (!disposed) animationId = requestAnimationFrame(draw);
        return;
      }

      const t = performance.now() * 0.001;

      // Run two fused steps per frame for richer motion.
      try {
        const r1 = stepJit(X, key);
        X = r1[0];
        key = r1[1];
        const r2 = stepJit(X, key);
        X = r2[0];
        key = r2[1];
      } catch {
        if (!disposed) animationId = requestAnimationFrame(draw);
        return;
      }

      const data = await X.data();
      const pos = data as Float32Array;

      // Fade prior frame for motion trails.
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const rotY = t * 0.14;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const tilt = -0.34;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      type Item = {
        sx: number;
        sy: number;
        r: number;
        a: number;
        depth: number;
        psx: number;
        psy: number;
      };
      const items: Item[] = [];
      const prev = prevScreen;

      for (let i = 0; i < N_PARTICLES; i++) {
        const p = project(
          pos[i * 3],
          pos[i * 3 + 1],
          pos[i * 3 + 2],
          cosY,
          sinY,
          cosT,
          sinT,
          cx,
          cy,
        );
        const depthFade = 1 - Math.min(1, Math.max(0, (p.depth - 2) / 9)) * 0.6;
        const r = Math.max(0.4, 1.0 + p.scale * 0.045);
        items.push({
          sx: p.sx,
          sy: p.sy,
          r,
          a: depthFade,
          depth: p.depth,
          psx: prev ? prev[i * 2] : p.sx,
          psy: prev ? prev[i * 2 + 1] : p.sy,
        });
      }

      // Sort back-to-front by depth.
      items.sort((a, b) => b.depth - a.depth);

      for (const it of items) {
        // Streak from previous to current position.
        if (prev && (Math.abs(it.sx - it.psx) > 0.3 || Math.abs(it.sy - it.psy) > 0.3)) {
          ctx.globalAlpha = it.a * 0.35;
          ctx.strokeStyle = COL_HALO;
          ctx.lineWidth = it.r * 0.85;
          ctx.beginPath();
          ctx.moveTo(it.psx, it.psy);
          ctx.lineTo(it.sx, it.sy);
          ctx.stroke();
        }
        // Halo.
        ctx.globalAlpha = it.a * 0.18;
        ctx.fillStyle = COL_HALO;
        ctx.beginPath();
        ctx.arc(it.sx, it.sy, it.r * 2.6, 0, TAU);
        ctx.fill();
        // Core.
        ctx.globalAlpha = it.a * 0.85;
        ctx.fillStyle = COL_CORE;
        ctx.beginPath();
        ctx.arc(it.sx, it.sy, it.r, 0, TAU);
        ctx.fill();
      }

      // Hot highlights on a sparse subset for sparkle.
      for (let i = 0; i < items.length; i += 23) {
        const it = items[i];
        ctx.globalAlpha = it.a * 0.6;
        ctx.fillStyle = COL_HOT;
        ctx.beginPath();
        ctx.arc(it.sx, it.sy, it.r * 0.65, 0, TAU);
        ctx.fill();
      }

      // Store projected positions for next frame's streaks.
      if (!prevScreen || prevScreen.length !== N_PARTICLES * 2) {
        prevScreen = new Float32Array(N_PARTICLES * 2);
      }
      // Need to store in original index order, not sorted order.
      for (let i = 0; i < N_PARTICLES; i++) {
        const p = project(
          pos[i * 3],
          pos[i * 3 + 1],
          pos[i * 3 + 2],
          cosY,
          sinY,
          cosT,
          sinT,
          cx,
          cy,
        );
        prevScreen[i * 2] = p.sx;
        prevScreen[i * 2 + 1] = p.sy;
      }

      ctx.globalAlpha = 1;
      if (!disposed) animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", debouncedResize);

    setupJax()
      .then(() => {
        if (!disposed) animationId = requestAnimationFrame(draw);
      })
      .catch((err) => {
        console.warn("DiffusionField: jax-js init failed, rendering fallback.", err);
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
        const g = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.7,
        );
        g.addColorStop(0, "rgba(40, 70, 110, 0.45)");
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      });

    return () => {
      disposed = true;
      window.removeEventListener("resize", debouncedResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      cancelAnimationFrame(animationId);
      try {
        X?.dispose();
        key?.dispose();
      } catch {
        // ignore
      }
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
