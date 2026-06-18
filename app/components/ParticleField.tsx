"use client";

import { useEffect, useRef } from "react";

interface Particle {
  u: number; // position along the strip centerline [0, 4π) i.e. twice around
  v: number; // offset across the strip width [-1, 1]
  spd: number; // per-particle flow speed
  size: number;
  life: number;
  maxLife: number;
  warm: boolean; // rare ember for contrast
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
    let start = performance.now();

    // Configuration ----------------------------------------------------------
    const TAU = Math.PI * 2;
    const STRIP_HALF_W = 22; // half-width of the Mobius strip
    const HALF_TURNS = 2; // particle parameter goes around 2x (full Mobius)
    const PCOUNT = 900;
    const FLOW_SPEED = 0.0065; // base flow speed along u
    const SWIRL = 1.4; // cross-strip oscillation amplitude

    const spawn = (p: Particle, initial: boolean) => {
      p.u = Math.random() * TAU * HALF_TURNS;
      p.v = (Math.random() * 2 - 1);
      p.spd = FLOW_SPEED * (0.6 + Math.random() * 0.9);
      p.size = 0.5 + Math.random() * 1.4;
      p.maxLife = 220 + Math.random() * 320;
      p.life = initial ? Math.random() * p.maxLife : 0;
      p.warm = Math.random() < 0.04;
    };

    const initParticles = () => {
      particles = new Array(PCOUNT);
      for (let i = 0; i < PCOUNT; i++) {
        const p: Particle = {
          u: 0, v: 0, spd: 0, size: 0, life: 0, maxLife: 0, warm: false,
        };
        spawn(p, true);
        particles[i] = p;
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      // Compact band at the top of the viewport.
      height = Math.min(240, Math.max(160, Math.floor(window.innerHeight * 0.28)));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      initParticles();
    };

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    };

    // Project a 3D point to screen with a simple perspective camera.
    // Camera looks down +Z; ring sits near top of the band.
    const project = (x: number, y: number, z: number, camZ: number, focal: number) => {
      const dz = camZ - z;
      const s = focal / Math.max(0.1, dz);
      return { sx: x * s, sy: y * s, s };
    };

    const draw = (now: number) => {
      const t = (now - start) * 0.001;

      // Fade previous frame -> icy trails with mercury-like persistence
      ctx.fillStyle = "rgba(0, 0, 0, 0.075)";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.42;

      // Ring geometry: base radius scales with width but stays compact
      const baseR = Math.min(180, Math.max(110, width * 0.13));
      // Slow breathing of radius + a gentle tilt precession -> fluid mercury swell
      const R = baseR + Math.sin(t * 0.5) * 8;
      const tilt = 0.5 + Math.sin(t * 0.13) * 0.12; // pitch
      const yaw = t * 0.05; // slow turn
      const cTilt = Math.cos(tilt);
      const sTilt = Math.sin(tilt);
      const cYaw = Math.cos(yaw);
      const sYaw = Math.sin(yaw);

      const camZ = 520;
      const focal = 520;

      // Cross-strip flow: fluid-dynamics-like traveling wave on v
      const vWave = (u: number) => Math.sin(u * 2.0 + t * 1.8) * SWIRL;

      // Sort-free alpha blending: draw back-half then front-half using z sign.
      // We iterate twice with a z test.
      for (let pass = 0; pass < 2; pass++) {
        const wantBack = pass === 0;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.u += p.spd;
          if (p.u > TAU * HALF_TURNS) p.u -= TAU * HALF_TURNS;
          p.life += 1;

          // u in [0, 4π); half-angle for the ring circle
          const phi = p.u; // full parameter
          const ringAngle = phi; // we use phi directly for the circular part
          const cosP = Math.cos(ringAngle);
          const sinP = Math.sin(ringAngle);

          // Mobius strip param:
          //   center: (R + v * cos(u/2)) * (cos u, sin u, 0) but we add 3D twist
          // The half-angle twist gives the Mobius half-flip over HALF_TURNS=2 => full flip.
          const half = p.u * 0.5;
          const twistCos = Math.cos(half + t * 0.2);
          const twistSin = Math.sin(half + t * 0.2);

          // Add cross-strip fluid wave to v
          const vEff = p.v + vWave(p.u) * 0.15;

          const radial = R + vEff * STRIP_HALF_W * twistCos;
          // local y on strip (perpendicular in-plane) + z from twist
          const localY = vEff * STRIP_HALF_W * twistSin;

          // Position on ring in ring-local frame (x,y plane, z=localY rotated)
          const lx = radial * cosP;
          const ly = radial * sinP;
          const lz = localY;

          // Apply ring tilt (pitch about X axis) then yaw (about Y axis)
          // Tilt about X:
          const y1 = ly * cTilt - lz * sTilt;
          const z1 = ly * sTilt + lz * cTilt;
          // Yaw about Y:
          const x2 = lx * cYaw + z1 * sYaw;
          const z2 = -lx * sYaw + z1 * cYaw;

          const isBack = z2 < 0;
          if (isBack !== wantBack) continue;

          const pr = project(x2, y1, z2, camZ, focal);
          const sx = cx + pr.sx;
          const sy = cy + pr.sy;

          if (
            sx < -20 || sx > width + 20 ||
            sy < -20 || sy > height + 20 ||
            p.life >= p.maxLife
          ) {
            if (p.life >= p.maxLife) spawn(p, false);
            continue;
          }

          // Lifecycle fade
          const lr = p.life / p.maxLife;
          let alpha: number;
          if (lr < 0.12) alpha = lr / 0.12;
          else if (lr > 0.82) alpha = (1 - lr) / 0.18;
          else alpha = 1;

          // Depth-based size & brightness: far side dimmer/smaller (ice depth)
          const depthFade = 0.55 + 0.45 * Math.max(0, Math.min(1, (z2 + 120) / 240));
          const sz = Math.max(0.15, p.size * depthFade * pr.s * 0.9);

          // Palette: ice/azure flame base, mercury specular highlight, rare ember
          const ember = p.warm;
          const hue = ember ? 24 + Math.sin(t + i) * 6 : 198 + Math.sin(p.u + t) * 22;
          const sat = ember ? 60 : 42;
          // Mercury-like specular pop on near side
          const lum = (ember ? 60 : 72) * depthFade + Math.max(0, (z2 + 60) / 200) * 18;
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lum}%, ${alpha * 0.62})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sz, 0, TAU);
          ctx.fill();

          // Mercury specular dot for close, bright particles
          if (!ember && z2 > 30 && alpha > 0.5) {
            ctx.fillStyle = `hsla(200, 20%, 96%, ${alpha * 0.35})`;
            ctx.beginPath();
            ctx.arc(sx, sy, sz * 0.4, 0, TAU);
            ctx.fill();
          }
        }
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
      className="pointer-events-none fixed inset-x-0 top-0 z-0"
      style={{ display: "block" }}
    />
  );
}
