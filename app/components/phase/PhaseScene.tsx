"use client";

import Link from "next/link";
import SocialLights from "./SocialLights";
import { useEffect, useRef, useState } from "react";
import { compositeShader, fragmentShader, vertexShader } from "./shaders";
import "./phase.css";

export default function PhaseScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const pausedRef = useRef(false);
  const targetProgressRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let animation = 0;
    let armed = window.scrollY <= 1;
    let touchY = 0;
    const cancel = () => { cancelAnimationFrame(animation); animation = 0; };
    const update = (canReveal = false) => {
      const distance = Math.max(1, root.offsetHeight - window.innerHeight);
      const offset = -root.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, offset / distance));
      targetProgressRef.current = progress;
      root.dataset.revealed = String(progress > 0.93);
      if (offset <= 0 && !animation) armed = true;
      if (!canReveal || !armed || offset <= 0 || animation) return;
      armed = false;
      const from = window.scrollY;
      const to = from - offset + distance;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.scrollTo({ top: to, behavior: "instant" });
        return;
      }
      const started = performance.now();
      const advance = (now: number) => {
        const t = Math.min(1, (now - started) / 1700);
        window.scrollTo({ top: from + (to - from) * (1 - Math.pow(1 - t, 3)), behavior: "instant" });
        animation = t < 1 ? requestAnimationFrame(advance) : 0;
      };
      animation = requestAnimationFrame(advance);
    };
    const scroll = () => update(true);
    const resize = () => { cancel(); update(); };
    const wheel = (event: WheelEvent) => { if (event.deltaY < 0) cancel(); };
    const key = (event: KeyboardEvent) => {
      if (["ArrowUp", "PageUp", "Home", "Escape"].includes(event.key) || (event.key === " " && event.shiftKey)) cancel();
    };
    const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const touchMove = (event: TouchEvent) => {
      const next = event.touches[0]?.clientY ?? touchY;
      if (next > touchY + 2) cancel();
      touchY = next;
    };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    return () => {
      cancel();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    let disposed = false;
    let cleanup = () => {};
    async function init() {
      const THREE = await import("three");
      if (disposed || !canvas || !root) return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
      const uniforms = {
        uPass: { value: 0 },
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uIntro: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
        uResolution: { value: new THREE.Vector2() },
      };
      const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      scene.add(new THREE.Mesh(geometry, material));
      const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
      const smokeTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
      const compositeUniforms = {
        uScene: { value: sceneTarget.texture },
        uSmoke: { value: smokeTarget.texture },
        uPixel: { value: new THREE.Vector2() },
      };
      const compositeMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: compositeShader, uniforms: compositeUniforms });
      const compositeScene = new THREE.Scene();
      compositeScene.add(new THREE.Mesh(geometry, compositeMaterial));
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const pointer = new THREE.Vector2();
      const neutralPointer = new THREE.Vector2();
      let contextAvailable = true;
      let frame = 0;
      let last = performance.now();
      let elapsed = 0;
      let firstFrame = true;
      let dirty = true;
      let resolutionScale = 1;
      let slowFrames = 0;
      const resize = () => {
        dirty = true;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = Math.min(window.devicePixelRatio, 1.5, Math.sqrt(2000000 / (width * height)));
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
        uniforms.uResolution.value.set(width, height);
        sceneTarget.setSize(Math.round(width * ratio), Math.round(height * ratio));
        smokeTarget.setSize(Math.max(1, Math.round(width * ratio * 0.5 * resolutionScale)), Math.max(1, Math.round(height * ratio * 0.5 * resolutionScale)));
        compositeUniforms.uPixel.value.set(1 / (width * ratio), 1 / (height * ratio));
      };
      const move = (event: PointerEvent) => {
        if (event.pointerType === "mouse") pointer.set(event.clientX / window.innerWidth * 2 - 1, 1 - event.clientY / window.innerHeight * 2);
      };
      const draw = (now: number) => {
        const delta = Math.min((now - last) / 1000, 0.1);
        last = now;
        const targetProgress = targetProgressRef.current;
        const still = reducedMotion.matches || pausedRef.current;
        if (!still) elapsed += delta;
        uniforms.uTime.value = elapsed;
        uniforms.uIntro.value = Math.min(1, uniforms.uIntro.value + delta * 0.5);
        const progressChanged = Math.abs(targetProgress - uniforms.uProgress.value) > 0.0001;
        uniforms.uProgress.value += (targetProgress - uniforms.uProgress.value) * (still ? 1 : 1 - Math.exp(-delta * 5));
        uniforms.uPointer.value.lerp(still ? neutralPointer : pointer, 1 - Math.exp(-delta * 3));
        if (!still || firstFrame || dirty || progressChanged || uniforms.uIntro.value < 1) {
          dirty = false;
          uniforms.uPass.value = 0;
          renderer.setRenderTarget(sceneTarget);
          renderer.render(scene, camera);
          uniforms.uPass.value = 1;
          renderer.setRenderTarget(smokeTarget);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          renderer.render(compositeScene, camera);
        }
        if (firstFrame) { firstFrame = false; setStatus("ready"); }
        if (delta > 0.045 && !still) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames > 45 && resolutionScale > 0.55) { resolutionScale *= 0.8; slowFrames = 0; resize(); }
        frame = requestAnimationFrame(draw);
      };
      const visibility = () => {
        cancelAnimationFrame(frame);
        if (!document.hidden && contextAvailable) { last = performance.now(); firstFrame = true; frame = requestAnimationFrame(draw); }
      };
      const contextLost = (event: Event) => {
        event.preventDefault();
        contextAvailable = false;
        cancelAnimationFrame(frame);
        setStatus("fallback");
      };
      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("visibilitychange", visibility);
      canvas.addEventListener("webglcontextlost", contextLost);
      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", move);
        document.removeEventListener("visibilitychange", visibility);
        canvas.removeEventListener("webglcontextlost", contextLost);
        geometry.dispose(); material.dispose(); compositeMaterial.dispose();
        sceneTarget.dispose(); smokeTarget.dispose(); renderer.dispose();
      };
      frame = requestAnimationFrame(draw);
    }
    init().catch(() => { if (!disposed) setStatus("fallback"); });
    return () => { disposed = true; cleanup(); };
  }, []);

  return (
    <main className="phase-experience" ref={rootRef} data-status={status} data-paused={paused}>
      <div className="phase-stage">
        <div className="phase-fallback" aria-hidden="true" />
        <canvas ref={canvasRef} className="phase-canvas" aria-label="Two sculptural rings with red neon edges emerge from drifting white smoke above a reflective floor." role="img" />
        <header className="phase-header">
          <Link className="phase-name" href="/" aria-label="Kenichiro Goto, home">Kenichiro Goto</Link>
        </header>
        <SocialLights />
        <footer className="phase-footer">
          <button className="phase-pause" disabled={status !== "ready"} onClick={() => { pausedRef.current = !paused; setPaused(!paused); }} aria-label={paused ? "Resume motion" : "Pause motion"} aria-pressed={paused}>
            <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
          </button>
        </footer>
      </div>
    </main>
  );
}
