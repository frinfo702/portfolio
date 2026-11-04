"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
import { createKatana, SWORD_LENGTH } from "./iceKatana";

const FRAME_MS = 1000 / 30;
const FOV = 22;
const WHITE = 0xffffff; // keep in step with --background in globals.css

// Fixed backdrop: the ice katana alone, laid diagonally across the white page.
export default function KatanaBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      let renderer: Three.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the plain white page stays.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(WHITE);

      const katana = await createKatana(
        THREE,
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
        renderer,
      );
      if (cancelled) {
        katana.dispose();
        renderer.dispose();
        return;
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(WHITE); // the ice refracts the page behind it
      scene.add(katana.root);
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 50);
      const tanHalf = Math.tan(((FOV / 2) * Math.PI) / 180);

      // Landscape: a shallow diagonal fitted to the width. Portrait: steeper, so it is not tiny.
      let angle = 0;
      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const aspect = w / h;
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        const want = aspect < 1 ? 58 : 28;
        if (want !== angle) {
          angle = want;
          katana.place(angle);
        }
        const a = (angle * Math.PI) / 180;
        const fitH = (SWORD_LENGTH * Math.sin(a)) / (0.8 * 2 * tanHalf);
        const fitW = (SWORD_LENGTH * Math.cos(a)) / (0.82 * 2 * tanHalf * aspect);
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
          // A slow float, and a slight turn toward the pointer: the highlights slide along the blade.
          look.x += (pointer.x + Math.sin(s * 0.15) * 0.3 - look.x) * 0.05;
          look.y += (pointer.y - look.y) * 0.05;
          katana.root.rotation.set(look.y * 0.06, look.x * 0.1, Math.sin(s * 0.3) * 0.012);
          katana.root.position.y = Math.sin(s * 0.5) * 0.006;
          katana.update(s);
        } else {
          katana.update(0);
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
        katana.dispose();
        renderer.dispose();
      };
    })().catch(() => {
      // A failed load leaves the plain page; nothing else depends on it.
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  return (
    <div className="backdrop" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
