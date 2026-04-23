"use client";

import { useEffect, useRef } from "react";

// Isometric pixel art landscape drawn on Canvas
export default function PixelLandscape() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear to dark grid background
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, W, H);

    // Draw faint grid lines
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Isometric parameters
    const tileW = 24;
    const tileH = 12;
    const offsetX = W / 2;
    const offsetY = H / 3;

    // Simple height map: returns elevation at grid coordinate
    function heightAt(gx: number, gy: number): number {
      const cx1 = 6,
        cy1 = 6,
        r1 = 5;
      const cx2 = 14,
        cy2 = 10,
        r2 = 4;
      const d1 = Math.sqrt((gx - cx1) ** 2 + (gy - cy1) ** 2);
      const d2 = Math.sqrt((gx - cx2) ** 2 + (gy - cy2) ** 2);
      let h = 0;
      if (d1 < r1) h += Math.max(0, (r1 - d1) * 18);
      if (d2 < r2) h += Math.max(0, (r2 - d2) * 14);
      // base rolling terrain
      h += Math.sin(gx * 0.4) * 4 + Math.cos(gy * 0.3) * 4;
      return Math.max(0, h);
    }

    function isoX(gx: number, gy: number) {
      return offsetX + (gx - gy) * tileW;
    }
    function isoY(gx: number, gy: number, h: number) {
      return offsetY + (gx + gy) * tileH - h;
    }

    const gridSize = 22;
    const terrain: number[][] = [];
    for (let y = 0; y < gridSize; y++) {
      terrain[y] = [];
      for (let x = 0; x < gridSize; x++) {
        terrain[y][x] = heightAt(x, y);
      }
    }

    // Draw terrain tiles back-to-front
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const h = terrain[gy][gx];
        const x = isoX(gx, gy);
        const y = isoY(gx, gy, h);

        // Determine surface color
        const dCenter = Math.sqrt((gx - 8) ** 2 + (gy - 8) ** 2);
        let surface = h > 25 ? "#8a8a7a" : dCenter < 7 ? "#6b8f5e" : "#c2b280";
        if (h < 2) surface = "#b8a868";
        if (h > 35) surface = "#9a9a8a";

        // Draw top face
        ctx.fillStyle = surface;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + tileW, y + tileH);
        ctx.lineTo(x, y + tileH * 2);
        ctx.lineTo(x - tileW, y + tileH);
        ctx.closePath();
        ctx.fill();

        // Draw left side if exposed
        if (gx === 0 || terrain[gy][gx - 1] < h) {
          ctx.fillStyle = shade(surface, -20);
          ctx.beginPath();
          ctx.moveTo(x - tileW, y + tileH);
          ctx.lineTo(x, y + tileH * 2);
          ctx.lineTo(x, y + tileH * 2 + h);
          ctx.lineTo(x - tileW, y + tileH + h);
          ctx.closePath();
          ctx.fill();
        }

        // Draw right side if exposed
        if (gy === gridSize - 1 || terrain[gy + 1]?.[gx] < h) {
          ctx.fillStyle = shade(surface, -35);
          ctx.beginPath();
          ctx.moveTo(x + tileW, y + tileH);
          ctx.lineTo(x, y + tileH * 2);
          ctx.lineTo(x, y + tileH * 2 + h);
          ctx.lineTo(x + tileW, y + tileH + h);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Draw wireframe cliffs (darker edges)
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const h = terrain[gy][gx];
        const x = isoX(gx, gy);
        const y = isoY(gx, gy, h);
        const below = gy < gridSize - 1 ? terrain[gy + 1][gx] : 0;
        if (below < h - 5) {
          ctx.beginPath();
          ctx.moveTo(x, y + tileH * 2);
          ctx.lineTo(x, y + tileH * 2 + (h - below));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - tileW, y + tileH);
          ctx.lineTo(x - tileW, y + tileH + (h - below));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + tileW, y + tileH);
          ctx.lineTo(x + tileW, y + tileH + (h - below));
          ctx.stroke();
        }
      }
    }

    // Draw trees on green tiles
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const h = terrain[gy][gx];
        const dCenter = Math.sqrt((gx - 8) ** 2 + (gy - 8) ** 2);
        if (h > 2 && h < 28 && dCenter < 7 && Math.random() > 0.6) {
          const x = isoX(gx, gy);
          const y = isoY(gx, gy, h) + tileH;
          drawTree(ctx, x, y);
        }
      }
    }

    // Draw a wireframe tower in center
    const tx = 8,
      ty = 8;
    const th = terrain[ty][tx] + 5;
    const txIso = isoX(tx, ty);
    const tyIso = isoY(tx, ty, th);
    drawWireframeTower(ctx, txIso, tyIso, 30);

    // Draw flying saucers
    drawSaucer(ctx, isoX(4, 2) - 40, isoY(4, 2, terrain[2][4]) - 80, 18);
    drawSaucer(ctx, isoX(10, 3) + 20, isoY(10, 3, terrain[3][10]) - 100, 22);
    drawSaucer(ctx, isoX(16, 5) - 10, isoY(16, 5, terrain[5][16]) - 70, 16);
    drawSaucer(ctx, isoX(7, 16) + 30, isoY(7, 16, terrain[16][7]) - 90, 20);
    drawSaucer(ctx, isoX(18, 18) - 30, isoY(18, 18, terrain[18][18]) - 60, 14);

    function shade(hex: string, amount: number) {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
      const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
    }

    function drawTree(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
    ) {
      // Trunk
      c.fillStyle = "#3e2b1f";
      c.fillRect(x - 1, y - 8, 2, 8);
      // Leaves (three layered circles)
      const greens = ["#4a7c3f", "#5a9a4a", "#6bb85a"];
      greens.forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(x, y - 10 - i * 5, 5 - i, 0, Math.PI * 2);
        c.fill();
      });
    }

    function drawWireframeTower(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      h: number,
    ) {
      c.strokeStyle = "#aaa";
      c.lineWidth = 1.5;
      const w = 12;
      // Vertical lines
      for (let i = 0; i < 4; i++) {
        const ox = x + (i % 2 === 0 ? -w : w) + (i < 2 ? -w / 2 : w / 2);
        const oy = y + (i < 2 ? -tileH : tileH) * 0.5;
        c.beginPath();
        c.moveTo(ox, oy);
        c.lineTo(ox, oy - h);
        c.stroke();
      }
      // Horizontal rings
      for (let r = 0; r < 5; r++) {
        const ry = y - (h / 5) * r;
        c.beginPath();
        c.moveTo(x - w, ry - tileH * 0.5);
        c.lineTo(x, ry);
        c.lineTo(x + w, ry - tileH * 0.5);
        c.lineTo(x, ry - tileH);
        c.closePath();
        c.stroke();
      }
    }

    function drawSaucer(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
    ) {
      // Hull
      c.fillStyle = "#a05a2c";
      c.beginPath();
      c.ellipse(x, y, size, size * 0.35, 0, 0, Math.PI * 2);
      c.fill();
      // Dark underside
      c.fillStyle = "#6b3a1a";
      c.beginPath();
      c.ellipse(x, y + 2, size * 0.7, size * 0.2, 0, 0, Math.PI * 2);
      c.fill();
      // Grid hatch
      c.strokeStyle = "#3a2210";
      c.lineWidth = 1;
      for (let i = -size + 4; i < size - 4; i += 5) {
        c.beginPath();
        c.moveTo(x + i, y - size * 0.25);
        c.lineTo(x + i, y + size * 0.25);
        c.stroke();
      }
      // Small fin
      c.fillStyle = "#8a4a20";
      c.fillRect(x - 2, y - size * 0.35 - 6, 4, 6);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={480}
      className="w-full rounded-sm"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
