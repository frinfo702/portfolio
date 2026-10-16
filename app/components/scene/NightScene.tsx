"use client";

import { useEffect, useRef } from "react";
import Car from "./Car";
import { startSmoke, type SmokeState } from "./smoke";

// Tail-light bar in the car's 1000x400 viewBox.
const LIGHT_Y = 238 / 400;
const LIGHT_HALF_WIDTH = 430 / 1000;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (from: number, to: number, v: number) => clamp01((v - from) / (to - from));

/**
 * Pinned night scene. Scrolling through the section drives one progress value:
 * smoke at rest -> red tail light -> car emerges -> wind clears the smoke.
 */
export default function NightScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const car = carRef.current;
    if (!section || !stage || !canvas || !car) return;

    const state: SmokeState = {
      progress: 0,
      neon: 0,
      light: [0.5, 0.7],
      lightHalfWidth: 0.3,
      visible: true,
    };

    const apply = (progress: number) => {
      state.progress = progress;
      state.neon = ramp(0.08, 0.3, progress);
      stage.style.setProperty("--neon", state.neon.toFixed(3));
      stage.style.setProperty("--reveal", ramp(0.22, 0.68, progress).toFixed(3));
      stage.style.setProperty("--clear", ramp(0.4, 1, progress).toFixed(3));
    };

    const measure = () => {
      const box = car.getBoundingClientRect();
      const frame = stage.getBoundingClientRect();
      state.light = [
        (box.left + box.width / 2 - frame.left) / frame.width,
        (box.top + box.height * LIGHT_Y - frame.top) / frame.height,
      ];
      state.lightHalfWidth = (box.width * LIGHT_HALF_WIDTH) / frame.width;
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) {
      stage.classList.add("is-static");
      apply(1);
      return;
    }

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const travel = section.offsetHeight - window.innerHeight;
        apply(travel > 0 ? clamp01(-section.getBoundingClientRect().top / travel) : 1);
      });
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    const observer = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
    });
    observer.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onResize();

    let stop: (() => void) | undefined;
    let disposed = false;
    startSmoke(canvas, state)
      .then((teardown) => {
        if (disposed) teardown();
        else stop = teardown;
      })
      .catch(() => stage.classList.add("no-gpu"));

    return () => {
      disposed = true;
      stop?.();
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section ref={sectionRef} className="scene" aria-label="Night scene">
      <div ref={stageRef} className="scene-stage">
        <div className="scene-sky" aria-hidden="true" />
        <div ref={carRef} className="scene-car">
          <Car />
        </div>
        <div className="scene-floor" aria-hidden="true">
          <span />
          <span />
        </div>
        <canvas ref={canvasRef} className="scene-smoke" aria-hidden="true" />
        <div className="scene-smoke-fallback" aria-hidden="true" />
        <p className="scene-hint" aria-hidden="true">
          Scroll
        </p>
      </div>
    </section>
  );
}
