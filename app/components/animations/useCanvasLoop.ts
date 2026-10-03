"use client";

import { useEffect, useRef } from "react";

export type DrawFrame = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
) => void;

type Options = {
  draw: DrawFrame;
  height: (width: number) => number;
  // Frame shown instead of the loop when the viewer prefers reduced motion.
  stillTime: number;
};

export function useCanvasLoop({ draw, height, stillTime }: Options) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const heightRef = useRef(height);
  const restartRef = useRef(() => {});

  useEffect(() => {
    drawRef.current = draw;
    heightRef.current = height;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let viewHeight = 0;
    let elapsed = 0;
    let last = 0;
    let frame = 0;

    const render = () => {
      if (width === 0) return;
      ctx.clearRect(0, 0, width, viewHeight);
      ctx.globalAlpha = 1;
      drawRef.current(
        ctx,
        width,
        viewHeight,
        reduceMotion ? stillTime : elapsed,
      );
    };

    const resize = () => {
      const nextWidth = canvas.clientWidth;
      if (nextWidth === width) return;
      width = nextWidth;
      viewHeight = heightRef.current(width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.height = `${viewHeight}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(viewHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    };

    const tick = (now: number) => {
      elapsed += Math.min(now - last, 100) / 1000;
      last = now;
      render();
      frame = requestAnimationFrame(tick);
    };

    const play = () => {
      if (reduceMotion || frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    restartRef.current = () => {
      elapsed = 0;
      render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) =>
      entry.isIntersecting ? play() : pause(),
    );
    visibility.observe(canvas);
    resize();

    return () => {
      pause();
      resizeObserver.disconnect();
      visibility.disconnect();
    };
  }, [stillTime]);

  return { canvasRef, restart: () => restartRef.current() };
}
