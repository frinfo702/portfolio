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

type Controls = {
  seek: (time: number) => void;
  redraw: () => void;
  setPaused: (paused: boolean) => void;
};

export function useCanvasLoop({ draw, height, stillTime }: Options) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const heightRef = useRef(height);
  const controlsRef = useRef<Controls>({
    seek: () => {},
    redraw: () => {},
    setPaused: () => {},
  });

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
    let elapsed = reduceMotion ? stillTime : 0;
    let last = 0;
    let frame = 0;
    let visible = false;
    let paused = false;

    const render = () => {
      if (width === 0) return;
      ctx.clearRect(0, 0, width, viewHeight);
      ctx.globalAlpha = 1;
      drawRef.current(ctx, width, viewHeight, elapsed);
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
      if (reduceMotion || paused || !visible || frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    controlsRef.current = {
      seek: (time) => {
        elapsed = time;
        render();
      },
      // Only needed when the loop is idle (paused, offscreen, reduced motion).
      redraw: () => {
        if (!frame) render();
      },
      setPaused: (next) => {
        paused = next;
        if (paused) stop();
        else play();
      },
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else stop();
    });
    visibility.observe(canvas);
    resize();

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
    };
  }, [stillTime]);

  return {
    canvasRef,
    seek: (time: number) => controlsRef.current.seek(time),
    redraw: () => controlsRef.current.redraw(),
    setPaused: (paused: boolean) => controlsRef.current.setPaused(paused),
  };
}
