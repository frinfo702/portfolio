"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type * as Three from "three";
import { createBlades } from "./darkBlades";
import { createKatana } from "./iceKatana";
import { currentTheme, subscribeTheme } from "./theme";

const FRAME_MS = 1000 / 30;
const FOV = 22;
// keep in step with --background in globals.css
const PAGE = { light: 0xffffff, dark: 0x0c0e10 };

// Fixed backdrop that follows the page theme (theme.ts): the ice katana laid diagonally across the
// white page, or the two black blades crossed and floating over the dark one.
export default function KatanaBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dark = useSyncExternalStore(subscribeTheme, () => currentTheme() === "dark", () => false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let teardown = () => {};

    (async () => {
      const [THREE, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/libs/meshopt_decoder.module.js"),
      ]);
      if (cancelled) return;

      let renderer: Three.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the plain page stays.
      }
      const page = dark ? PAGE.dark : PAGE.light;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(page);

      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const art = await (dark ? createBlades : createKatana)(THREE, loader, renderer);
      if (cancelled) {
        art.dispose();
        renderer.dispose();
        return;
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(page); // the ice refracts the page behind it
      scene.add(art.root);
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 50);
      const tanHalf = Math.tan(((FOV / 2) * Math.PI) / 180);

      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const aspect = w / h;
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        const f = art.frame(aspect);
        const fitH = f.h / (0.8 * 2 * tanHalf);
        const fitW = f.w / (0.82 * 2 * tanHalf * aspect);
        camera.position.set(0, 0, Math.max(fitH, fitW));
      };

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const pointer = { x: 0, y: 0 };
      const look = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      };

      const draw = (t: number) => {
        const s = t / 1000;
        if (!reduced.matches) {
          // A slow float, and a slight turn toward the pointer: the highlights slide along the blades.
          look.x += (pointer.x + Math.sin(s * 0.15) * 0.3 - look.x) * 0.05;
          look.y += (pointer.y - look.y) * 0.05;
          art.root.rotation.set(look.y * 0.06, look.x * 0.1, Math.sin(s * 0.3) * 0.012);
          art.root.position.y = Math.sin(s * 0.5) * 0.006;
          art.update(s);
        } else {
          art.update(0);
        }
        renderer.render(scene, camera);
      };

      let raf = 0;
      let last = -Infinity;
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        if (t - last < FRAME_MS) return;
        last = t;
        draw(t);
      };
      const start = () => {
        cancelAnimationFrame(raf);
        if (reduced.matches) draw(0);
        else raf = requestAnimationFrame(loop);
      };
      const onResize = () => {
        resize();
        if (reduced.matches) draw(0);
      };

      resize();
      draw(0);
      canvas.dataset.ready = "";
      start();
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onPointer, { passive: true });
      reduced.addEventListener("change", start);

      teardown = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        reduced.removeEventListener("change", start);
        scene.traverse((o) => {
          const mesh = o as Three.Mesh;
          mesh.geometry?.dispose();
          (mesh.material as Three.Material | undefined)?.dispose?.();
        });
        art.dispose();
        renderer.dispose();
      };
    })().catch(() => {
      // A failed load leaves the plain page; nothing else depends on it.
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [dark]);

  return (
    <div className="backdrop" aria-hidden="true">
      {/* a fresh canvas per theme: a WebGL context cannot be handed to a second renderer */}
      <canvas key={dark ? "dark" : "light"} ref={canvasRef} />
    </div>
  );
}
