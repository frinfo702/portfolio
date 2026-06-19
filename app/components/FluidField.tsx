"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ── Noise utilities ──────────────────────────────────────────────────────
function hash(x: number, y: number, z: number): number {
  let h = x * 374761393 + y * 668265263 + z * 1440671273;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) / 2147483648 + 0.5;
}

function smoothNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);

  const n000 = hash(ix, iy, iz);
  const n100 = hash(ix + 1, iy, iz);
  const n010 = hash(ix, iy + 1, iz);
  const n110 = hash(ix + 1, iy + 1, iz);
  const n001 = hash(ix, iy, iz + 1);
  const n101 = hash(ix + 1, iy, iz + 1);
  const n011 = hash(ix, iy + 1, iz + 1);
  const n111 = hash(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * sx;
  const nx10 = n010 + (n110 - n010) * sx;
  const nx01 = n001 + (n101 - n001) * sx;
  const nx11 = n011 + (n111 - n011) * sx;

  const nxy0 = nx00 + (nx10 - nx00) * sy;
  const nxy1 = nx01 + (nx11 - nx01) * sy;

  return nxy0 + (nxy1 - nxy0) * sz;
}

function fbm(x: number, y: number, z: number, octaves = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq, z * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return value;
}

// ── Create a realistic rock mesh using displaced icosahedron ─────────────
function createRock(detail: number, scale: number, roughness: number): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const positions = geo.attributes.position;
  const normals = geo.attributes.normal;

  // Displace vertices along normals using multi-scale noise
  for (let i = 0; i < positions.count; i++) {
    const px = positions.getX(i);
    const py = positions.getY(i);
    const pz = positions.getZ(i);
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);

    // Multi-octave displacement for natural rock shape
    const n1 = fbm(px * 2.5, py * 2.5, pz * 2.5, 4) * 0.35;
    const n2 = fbm(px * 5.0, py * 5.0, pz * 5.0, 3) * 0.15;
    const n3 = fbm(px * 9.0, py * 9.0, pz * 9.0, 2) * 0.07;
    const disp = (n1 + n2 + n3) * roughness;

    positions.setXYZ(
      i,
      px + nx * disp,
      py + ny * disp,
      pz + nz * disp,
    );
  }

  geo.computeVertexNormals();

  // Dark rock material with subtle roughness
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.08, 0.08, 0.09),
    roughness: 0.75,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

export default function FluidField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // ── Renderer ──────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0, 0, 0);
    scene.fog = new THREE.Fog(0, 8, 40);

    // ── Camera ────────────────────────────────────────────────────────
    const aspect = w / h;
    const camera = new THREE.PerspectiveCamera(35, aspect, 0.5, 60);
    camera.position.set(3, 2.5, 10);
    camera.lookAt(0, -0.5, 0);

    // ── Lighting ──────────────────────────────────────────────────────
    // Dim ambient
    const ambient = new THREE.AmbientLight(0x111122, 0.6);
    scene.add(ambient);

    // Key light (directional, casts shadows)
    const keyLight = new THREE.DirectionalLight(0x8899bb, 2.5);
    keyLight.position.set(8, 10, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0x334455, 1.5);
    rimLight.position.set(-4, 2, -2);
    scene.add(rimLight);

    // Subtle bottom fill
    const fillLight = new THREE.DirectionalLight(0x1a1a2e, 0.8);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);

    // ── Ground plane (dark) ───────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.03, 0.03, 0.04),
      roughness: 0.9,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Create rocks ──────────────────────────────────────────────────
    const rockDefs = [
      { x: -1.8, y: -1.5, z: 0.5, scale: 1.4, detail: 5, roughness: 0.5 },
      { x: 1.5, y: -1.8, z: 0.2, scale: 1.1, detail: 4, roughness: 0.6 },
      { x: 0.2, y: -0.8, z: -0.3, scale: 0.9, detail: 4, roughness: 0.45 },
      { x: -0.6, y: -2.0, z: -0.8, scale: 1.6, detail: 5, roughness: 0.55 },
      { x: 2.2, y: -0.6, z: -0.5, scale: 0.7, detail: 3, roughness: 0.5 },
    ];

    for (const def of rockDefs) {
      const mesh = createRock(def.detail, def.scale, def.roughness);
      mesh.position.set(def.x, def.y, def.z);
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      scene.add(mesh);
    }

    // ── Resize handler ────────────────────────────────────────────────
    const onResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      renderer.setSize(nw, nh);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ── Animation loop ────────────────────────────────────────────────
    const animate = () => {
      requestAnimationFrame(animate);

      const now = performance.now() * 0.001;

      // Slow camera drift
      const camAngle = now * 0.08;
      camera.position.x = Math.sin(camAngle) * 4;
      camera.position.z = Math.cos(camAngle) * 5 + 5;
      camera.position.y = 2.5 + Math.sin(now * 0.15) * 0.3;
      camera.lookAt(0, -0.5, 0);

      renderer.render(scene, camera);
    };
    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();

      // Cleanup geometries and materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
