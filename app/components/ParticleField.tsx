"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

// Deterministic 2D smooth-ish noise via hashed gradients.
// Cheap, allocation-free, good enough for a background flow field.
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = smooth(fx);
  const uy = smooth(fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
// fbm for richer turbulence
function fbm(x: number, y: number): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < 3; o++) {
    v += noise(x * freq, y * freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return v;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    // Fade overlay so particles leave trails instead of clearing each frame.
    // Lower alpha => longer trails. Tuned for elegance, not smear.
    const FADE_ALPHA = 0.06;

    const targetCount = () => {
      // Density scales with viewport area but is capped for performance.
      const area = width * height;
      const base = Math.floor(area / 5200);
      return Math.max(240, Math.min(base, 1400));
    };

    const spawn = (p: Particle, initial: boolean) => {
      if (initial) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
      } else {
        // Respawn from a random edge to keep flow continuous
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
          p.x = Math.random() * width;
          p.y = -4;
        } else if (edge === 1) {
          p.x = width + 4;
          p.y = Math.random() * height;
        } else if (edge === 2) {
          p.x = Math.random() * width;
          p.y = height + 4;
        } else {
          p.x = -4;
          p.y = Math.random() * height;
        }
      }
      p.vx = 0;
      p.vy = 0;
      p.maxLife = 220 + Math.random() * 360;
      p.life = initial ? Math.random() * p.maxLife : 0;
      p.size = 0.4 + Math.random() * 1.1;
      // Cool near-neutral palette: silver-blue with occasional warm spark
      const warm = Math.random() < 0.06;
      p.hue = warm ? 28 + Math.random() * 12 : 200 + Math.random() * 40;
    };

    const initParticles = () => {
      const n = targetCount();
      particles = new Array(n);
      for (let i = 0; i < n; i++) {
        const p: Particle = {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          life: 0,
          maxLife: 0,
          size: 0,
          hue: 0,
        };
        spawn(p, true);
        particles[i] = p;
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Reset canvas to black baseline so fade trails build on pure black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      initParticles();
    };

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    };

    let start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) * 0.0001;

      // Fade previous frame to produce elegant motion trails
      ctx.fillStyle = `rgba(0, 0, 0, ${FADE_ALPHA})`;
      ctx.fillRect(0, 0, width, height);

      const scale = 0.0016; // noise spatial scale -> broad, slow flows
      const speed = 1.35; // particle advection speed
      // Slowly rotating field angle gives gentle global drift
      const drift = t * 0.6;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Sample fbm flow field and map to angle. Two octaves of offset
        // create layered currents that feel organic rather than gridded.
        const nx = p.x * scale;
        const ny = p.y * scale;
        const angle =
          fbm(nx + drift, ny - drift * 0.5) * Math.PI * 4 +
          fbm(nx * 2.0 - drift * 0.3, ny * 2.0 + drift * 0.2) * Math.PI * 2;

        // Ease velocity toward field direction for smooth turns
        const tvx = Math.cos(angle) * speed;
        const tvy = Math.sin(angle) * speed;
        p.vx += (tvx - p.vx) * 0.08;
        p.vy += (tvy - p.vy) * 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        // Lifecycle fade: ease-in at birth, ease-out near death
        const lifeRatio = p.life / p.maxLife;
        let alpha: number;
        if (lifeRatio < 0.15) {
          alpha = lifeRatio / 0.15;
        } else if (lifeRatio > 0.8) {
          alpha = (1 - lifeRatio) / 0.2;
        } else {
          alpha = 1;
        }
        // Depth-ish sizing based on speed for subtle parallax feel
        const sp = Math.hypot(p.vx, p.vy);
        const sizeMul = 0.7 + Math.min(sp / speed, 1) * 0.6;
        const r = Math.max(0.1, p.size * sizeMul);

        // Off-screen or expired -> respawn
        if (
          p.x < -10 ||
          p.x > width + 10 ||
          p.y < -10 ||
          p.y > height + 10 ||
          p.life >= p.maxLife
        ) {
          spawn(p, false);
          continue;
        }

        // Brightness peaks mid-life; keep overall luminance low for a
        // refined background that never competes with content.
        const lum = 0.5 + alpha * 0.5;
        const sat = 18 + (p.hue < 60 ? 30 : 12);
        ctx.fillStyle = `hsla(${p.hue}, ${sat}%, ${lum * 55}%, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    start = performance.now();
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
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
