"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass.js";

/**
 * Production CAD wireframe booster (AA12-style density).
 * Pure engineering wireframe + SSAA + bloom. Background ambient.
 */

type Segs = number[];

function push(
  out: Segs,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
) {
  out.push(ax, ay, az, bx, by, bz);
}

function ring(
  out: Segs,
  y: number,
  r: number,
  segs: number,
  cx = 0,
  cz = 0,
) {
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    push(
      out,
      cx + Math.cos(a0) * r,
      y,
      cz + Math.sin(a0) * r,
      cx + Math.cos(a1) * r,
      y,
      cz + Math.sin(a1) * r,
    );
  }
}

function meridianArc(
  out: Segs,
  angle: number,
  y0: number,
  y1: number,
  r: number,
  steps: number,
) {
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const ya = y0 + (y1 - y0) * t0;
    const yb = y0 + (y1 - y0) * t1;
    push(
      out,
      Math.cos(angle) * r,
      ya,
      Math.sin(angle) * r,
      Math.cos(angle) * r,
      yb,
      Math.sin(angle) * r,
    );
  }
}

/** Dense cylindrical shell: station rings + stringers + intermediate hoops */
function barrelWire(
  out: Segs,
  yBot: number,
  yTop: number,
  r: number,
  radialSegs: number,
  ringCount: number,
  stringers: number,
) {
  for (let i = 0; i <= ringCount; i++) {
    const y = yBot + ((yTop - yBot) * i) / ringCount;
    ring(out, y, r, radialSegs);
  }
  for (let s = 0; s < stringers; s++) {
    const a = (s / stringers) * Math.PI * 2;
    meridianArc(out, a, yBot, yTop, r, ringCount);
  }
}

/** Nose dome: latitude rings + meridians + top plate spokes */
function domeWire(out: Segs, yBase: number, r: number, segs: number) {
  const latCount = 14;
  const meridians = 32;

  for (let j = 1; j <= latCount; j++) {
    const t = j / (latCount + 0.5);
    const phi = t * (Math.PI / 2);
    const rr = r * Math.cos(phi);
    const y = yBase + r * Math.sin(phi);
    if (rr > 0.02) ring(out, y, rr, segs);
  }

  for (let m = 0; m < meridians; m++) {
    const a = (m / meridians) * Math.PI * 2;
    let px = Math.cos(a) * r;
    let py = yBase;
    let pz = Math.sin(a) * r;
    for (let j = 1; j <= latCount + 1; j++) {
      const t = j / (latCount + 1);
      const phi = t * (Math.PI / 2);
      const rr = r * Math.cos(phi);
      const y = yBase + r * Math.sin(phi);
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      push(out, px, py, pz, x, y, z);
      px = x;
      py = y;
      pz = z;
    }
  }

  // forward dome bulkhead plate
  const plateY = yBase + r * 0.72;
  const plateR = r * 0.48;
  ring(out, plateY, plateR, segs);
  ring(out, plateY, plateR * 0.55, Math.floor(segs * 0.7));
  ring(out, plateY, plateR * 0.22, Math.floor(segs * 0.45));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    push(out, 0, plateY, 0, Math.cos(a) * plateR, plateY, Math.sin(a) * plateR);
  }
  // cross braces on plate
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = a + Math.PI / 8;
    push(
      out,
      Math.cos(a) * plateR * 0.55,
      plateY,
      Math.sin(a) * plateR * 0.55,
      Math.cos(b) * plateR,
      plateY,
      Math.sin(b) * plateR,
    );
  }
}

/** Landing leg as lattice fin (reference-style mesh) */
function legWire(
  out: Segs,
  base: THREE.Vector3,
  dirAngle: number,
  length: number,
) {
  const outward = new THREE.Vector3(Math.cos(dirAngle), 0, Math.sin(dirAngle));
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(up, outward).normalize();

  // leg is a tapered lattice panel in the radial plane
  const root = base.clone();
  const tip = base
    .clone()
    .add(outward.clone().multiplyScalar(length * 0.95))
    .add(new THREE.Vector3(0, -length * 0.85, 0));
  const midOut = base
    .clone()
    .add(outward.clone().multiplyScalar(length * 0.55))
    .add(new THREE.Vector3(0, -length * 0.25, 0));
  const midIn = base
    .clone()
    .add(outward.clone().multiplyScalar(length * 0.15))
    .add(new THREE.Vector3(0, -length * 0.35, 0));

  const width = length * 0.22;
  const corners = [
    root.clone().add(side.clone().multiplyScalar(width * 0.15)),
    root.clone().add(side.clone().multiplyScalar(-width * 0.15)),
    tip.clone().add(side.clone().multiplyScalar(width * 0.08)),
    tip.clone().add(side.clone().multiplyScalar(-width * 0.08)),
    midOut.clone().add(side.clone().multiplyScalar(width * 0.35)),
    midOut.clone().add(side.clone().multiplyScalar(-width * 0.35)),
    midIn.clone().add(side.clone().multiplyScalar(width * 0.2)),
    midIn.clone().add(side.clone().multiplyScalar(-width * 0.2)),
  ];

  // outer silhouette
  const loop = [0, 4, 2, 3, 5, 1, 0];
  for (let i = 0; i < loop.length - 1; i++) {
    const a = corners[loop[i]];
    const b = corners[loop[i + 1]];
    push(out, a.x, a.y, a.z, b.x, b.y, b.z);
  }

  // structured lattice: span lines along leg
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    const along = new THREE.Vector3().lerpVectors(root, tip, t);
    const spread = width * (0.35 * (1 - t) + 0.08);
    const a = along.clone().add(side.clone().multiplyScalar(spread));
    const b = along.clone().add(side.clone().multiplyScalar(-spread));
    push(out, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const s = (i / 3) * width * 0.35;
    const a = root.clone().add(side.clone().multiplyScalar(s * 0.4));
    const b = tip.clone().add(side.clone().multiplyScalar(s * 0.15));
    push(out, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  // diagonal braces
  for (let i = 0; i < 5; i++) {
    const t0 = i / 5;
    const t1 = (i + 1) / 5;
    const p0 = new THREE.Vector3().lerpVectors(root, tip, t0);
    const p1 = new THREE.Vector3().lerpVectors(root, tip, t1);
    const s0 = width * (0.32 * (1 - t0) + 0.08);
    const s1 = width * (0.32 * (1 - t1) + 0.08);
    push(
      out,
      p0.x + side.x * s0,
      p0.y,
      p0.z + side.z * s0,
      p1.x - side.x * s1,
      p1.y,
      p1.z - side.z * s1,
    );
    push(
      out,
      p0.x - side.x * s0,
      p0.y,
      p0.z - side.z * s0,
      p1.x + side.x * s1,
      p1.y,
      p1.z + side.z * s1,
    );
  }

  // foot pad
  ring(out, tip.y, length * 0.06, 12, tip.x, tip.z);
  ring(out, tip.y, length * 0.035, 10, tip.x, tip.z);
}

/** Aft engine section + thrust structure */
function aftWire(out: Segs, y: number, r: number) {
  ring(out, y, r * 0.95, 48);
  ring(out, y - 0.08, r * 0.88, 48);
  ring(out, y - 0.16, r * 0.72, 40);

  // radial spars
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    push(
      out,
      Math.cos(a) * r * 0.95,
      y,
      Math.sin(a) * r * 0.95,
      Math.cos(a) * r * 0.35,
      y - 0.12,
      Math.sin(a) * r * 0.35,
    );
  }

  // 9 engine bells
  const centers: [number, number][] = [[0, 0]];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    centers.push([Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42]);
  }

  for (const [cx, cz] of centers) {
    const tiers = 8;
    for (let t = 0; t <= tiers; t++) {
      const u = t / tiers;
      const rr = 0.055 + u * 0.055;
      const yy = y - 0.1 - u * 0.28;
      ring(out, yy, rr, 16, cx, cz);
    }
    for (let m = 0; m < 8; m++) {
      const a = (m / 8) * Math.PI * 2;
      push(
        out,
        cx + Math.cos(a) * 0.055,
        y - 0.1,
        cz + Math.sin(a) * 0.055,
        cx + Math.cos(a) * 0.11,
        y - 0.38,
        cz + Math.sin(a) * 0.11,
      );
    }
  }

  // center octweb
  ring(out, y - 0.05, r * 0.28, 24);
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    push(
      out,
      Math.cos(a0) * r * 0.12,
      y - 0.05,
      Math.sin(a0) * r * 0.12,
      Math.cos(a1) * r * 0.28,
      y - 0.05,
      Math.sin(a1) * r * 0.28,
    );
  }
}

function buildWireBooster(): { primary: Segs; secondary: Segs; dim: Segs } {
  const primary: Segs = [];
  const secondary: Segs = [];
  const dim: Segs = [];

  const R = 0.52;
  const yBot = -1.15;
  const yTop = 1.25;
  const radial = 56;
  const rings = 28;
  const stringers = 36;

  // main barrel — dense grid (hero)
  barrelWire(primary, yBot, yTop, R, radial, rings, stringers);

  // major station rings (heavier emphasis via duplicate slightly larger)
  for (const y of [yBot, -0.55, 0.05, 0.65, yTop]) {
    ring(primary, y, R + 0.002, radial);
    ring(secondary, y, R * 0.97, radial);
  }

  // interstage-ish common dome line (double ring)
  ring(primary, 0.05, R + 0.008, radial);
  ring(primary, 0.08, R + 0.008, radial);

  // nose
  domeWire(primary, yTop, R, 48);

  // aft + engines
  aftWire(primary, yBot, R);

  // legs
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const base = new THREE.Vector3(
      Math.cos(a) * R * 0.98,
      yBot + 0.02,
      Math.sin(a) * R * 0.98,
    );
    legWire(primary, base, a, 0.95);
  }

  // construction axis (dim)
  push(dim, 0, yBot - 0.55, 0, 0, yTop + R + 0.15, 0);

  // mid-body reference ticks (dim)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    push(
      dim,
      Math.cos(a) * R,
      yBot,
      Math.sin(a) * R,
      Math.cos(a) * (R + 0.06),
      yBot,
      Math.sin(a) * (R + 0.06),
    );
  }

  return { primary, secondary, dim };
}

function segsToLine(
  positions: Segs,
  color: number,
  opacity: number,
): THREE.LineSegments {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
  );
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  return new THREE.LineSegments(geo, mat);
}

function buildSceneModel(): THREE.Group {
  const root = new THREE.Group();
  const { primary, secondary, dim } = buildWireBooster();

  // layered brightness → bloom reads like reference glow
  root.add(segsToLine(primary, 0x65776b, 0.32));
  root.add(segsToLine(secondary, 0x8a9587, 0.18));
  root.add(segsToLine(dim, 0xb8b4a7, 0.1));

  // perspective floor grid (CAD viewport)
  const grid = new THREE.GridHelper(10, 40, 0xc3bcae, 0xd7d0c3);
  grid.position.y = -2.15;
  const gMat = grid.material;
  if (Array.isArray(gMat)) {
    gMat.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.3;
      m.toneMapped = false;
    });
  } else {
    gMat.transparent = true;
    gMat.opacity = 0.3;
    gMat.toneMapped = false;
  }
  root.add(grid);

  return root;
}

export default function CadAssembly() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0xf6f3ec, 0.022);

    const sizeOf = () => ({
      w: Math.max(mount.clientWidth, 1),
      h: Math.max(mount.clientHeight, 1),
    });
    let { w, h } = sizeOf();

    // low angle · looking up — matches reference framing
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.05, 100);
    camera.position.set(3.6, 0.35, 5.8);
    camera.lookAt(0.9, 0.15, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0xf6f3ec, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      display: "block",
      width: "100%",
      height: "100%",
    });
    renderer.domElement.setAttribute("aria-hidden", "true");

    // unlit wireframe — no lighting needed, but keep mild ambient for grid
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const model = buildSceneModel();
    model.position.set(1.15, 0.05, 0);
    model.rotation.y = 0.15;
    model.scale.setScalar(1.12);
    scene.add(model);

    const composer = new EffectComposer(renderer);
    const ssaa = new SSAARenderPass(scene, camera, 0xf6f3ec, 0);
    ssaa.sampleLevel = reduceMotion ? 2 : 3; // production: 8–16 samples
    ssaa.unbiased = true;
    composer.addPass(ssaa);

    // bloom off — keep SSAA only for clean lines without glow
    composer.addPass(new OutputPass());

    let raf = 0;
    const t0 = performance.now();
    let last = t0;

    const onResize = () => {
      ({ w, h } = sizeOf());
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) * 0.001;

      if (!reduceMotion) {
        model.rotation.y += dt * 0.08;
        camera.position.x = 3.6 + Math.sin(t * 0.06) * 0.08;
        camera.position.y = 0.35 + Math.cos(t * 0.05) * 0.04;
        camera.lookAt(0.9, 0.15, 0);
      }

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      composer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
}
