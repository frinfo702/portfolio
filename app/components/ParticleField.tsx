"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  baseSize: number;
  phase: number;
  speed: number;
  opacity: number;
  theta: number;
  strand: number;
  idx: number;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastW = 0;
    let lastH = 0;

    const mouse = { x: null as number | null, y: null as number | null };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const initParticles = (width: number, height: number) => {
      particles = [];
      const cx = width * 0.52;
      const cy = height * 0.1;
      const turns = 5.5;
      const pointsPerTurn = 55;
      const radius = 72;
      const slantX = 2.0;
      const slantY = 3.0;

      const totalPoints = Math.floor(turns * pointsPerTurn);

      for (let i = 0; i < totalPoints; i++) {
        const t = (i / pointsPerTurn) * Math.PI * 2;

        for (let strand = 0; strand < 3; strand++) {
          const angle = t + strand * ((Math.PI * 2) / 3);

          // draw(time=0) と同じ式で初期位置を計算し、飛び出しを防ぐ
          const waveR = Math.sin(i * 0.35) * 3.5;
          const waveAxis = Math.cos(i * 0.25) * 1.5;
          const curveX = Math.sin(i * 0.08) * 45;
          const curveY = Math.cos(i * 0.06) * 35;

          const axisX = cx + i * slantX + waveAxis * slantX * 0.3 + curveX;
          const axisY = cy + i * slantY + waveAxis * slantY * 0.3 + curveY;

          const x = axisX + (radius + waveR) * Math.cos(angle);
          const y = axisY + (radius + waveR) * Math.sin(angle);
          const z = Math.sin(angle);

          const size = 0.5 + (1 + z) * 0.55;
          const opacity = 0.25 + (1 + z) * 0.4;
          const jitter = 1.2;

          particles.push({
            x: x + (Math.random() - 0.5) * jitter,
            y: y + (Math.random() - 0.5) * jitter,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
            baseSize: size,
            phase: Math.random() * Math.PI * 2,
            speed: 0.15 + Math.random() * 0.25,
            opacity,
            theta: angle,
            strand,
            idx: i,
          });
        }
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const dw = Math.abs(width - lastW);
      const dh = Math.abs(height - lastH);
      if (lastW === 0 || dw > 50 || dh > 50) {
        lastW = width;
        lastH = height;
        initParticles(width, height);
      }
    };

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };

    const springK = 0.04;
    const damping = 0.93;
    const repelStrength = 0.6;
    const repelRadius = 90;

    const draw = (time: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const t = time * 0.0005;
      const globalRotation = t * 0.35;

      const cx = width * 0.52;
      const cy = height * 0.1;
      const radius = 72;
      const slantX = 2.0;
      const slantY = 3.0;

      for (const p of particles) {
        const theta = p.theta + globalRotation;
        const waveR = Math.sin(p.idx * 0.35 - t * 2.5) * 3.5;
        const waveAxis = Math.cos(p.idx * 0.25 + t * 1.8) * 1.5;
        const curveX = Math.sin(p.idx * 0.08 + t * 0.5) * 45;
        const curveY = Math.cos(p.idx * 0.06 + t * 0.3) * 35;

        const axisX = cx + p.idx * slantX + waveAxis * slantX * 0.3 + curveX;
        const axisY = cy + p.idx * slantY + waveAxis * slantY * 0.3 + curveY;

        p.baseX = axisX + (radius + waveR) * Math.cos(theta);
        p.baseY = axisY + (radius + waveR) * Math.sin(theta);

        const ax = (p.baseX - p.x) * springK;
        const ay = (p.baseY - p.y) * springK;

        let fx = 0;
        let fy = 0;
        if (mouse.x !== null && mouse.y !== null) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const distSq = mdx * mdx + mdy * mdy;
          if (distSq < repelRadius * repelRadius && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / repelRadius) * repelStrength;
            fx = (mdx / dist) * force;
            fy = (mdy / dist) * force;
          }
        }

        p.vx = (p.vx + ax + fx) * damping;
        p.vy = (p.vy + ay + fy) * damping;
        p.x += p.vx;
        p.y += p.vy;

        const z = Math.sin(theta);
        const size = p.baseSize * (0.75 + (1 + z) * 0.25);
        const alpha = p.opacity * (0.7 + (1 + z) * 0.3);

        ctx.fillStyle = `rgba(228, 228, 228, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, size), 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", debouncedResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.65 }}
    />
  );
}
