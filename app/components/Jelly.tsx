"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const RADIUS = 1;
const DETAIL = 5;
const GRAB_RADIUS = 0.8;
const MAX_DRAG = 1.25;
const SPRING = 40;
const GRAB_SPRING = -20;
const DAMPING = 4.2;
const SUBSTEPS = 3;

export default function Jelly() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0, 7.5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(2.5, 3, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3ce6ad, 2.2);
    rimLight.position.set(-3, -1.5, 2.5);
    scene.add(rimLight);

    const geometry = mergeVertices(
      new THREE.IcosahedronGeometry(RADIUS, DETAIL)
    );
    geometry.computeVertexNormals();
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(),
      RADIUS + MAX_DRAG + 0.3
    );

    const positionAttribute = geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const rest = new Float32Array(positions);
    const velocities = new Float32Array(positions.length);
    const grabbed = new Float32Array(positions.length / 3);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x35a37f,
      roughness: 0.55,
      metalness: 0,
      envMapIntensity: 0.7,
    });
    const core = new THREE.Mesh(geometry, coreMaterial);
    core.scale.setScalar(0.62);
    scene.add(core);

    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf2fffb,
      metalness: 0,
      roughness: 0.07,
      transmission: 1,
      thickness: 1.3,
      ior: 1.34,
      dispersion: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      iridescence: 0.35,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [120, 420],
      attenuationColor: new THREE.Color(0x2fc493),
      attenuationDistance: 2.4,
      envMapIntensity: 1.6,
    });
    const shell = new THREE.Mesh(geometry, shellMaterial);
    scene.add(shell);

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planePoint = new THREE.Vector3();
    const dragStart = new THREE.Vector3();
    const dragTarget = new THREE.Vector3();
    const grabLocal = new THREE.Vector3();
    let grabAmount = 0;
    let dragging = false;
    let activePointer: number | null = null;

    const toNdc = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      if (activePointer !== null) return;
      toNdc(event);
      raycaster.setFromCamera(pointerNdc, camera);
      shell.updateMatrixWorld();
      const hit = raycaster.intersectObject(shell, false)[0];
      if (hit) {
        grabLocal.copy(hit.point);
      } else {
        raycaster.ray.intersectPlane(plane, grabLocal);
        if (grabLocal.lengthSq() > RADIUS * RADIUS) grabLocal.setLength(RADIUS);
      }
      shell.worldToLocal(grabLocal);
      raycaster.ray.intersectPlane(plane, dragStart);

      for (let i = 0; i < grabbed.length; i++) {
        const dx = rest[i * 3] - grabLocal.x;
        const dy = rest[i * 3 + 1] - grabLocal.y;
        const dz = rest[i * 3 + 2] - grabLocal.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) / GRAB_RADIUS;
        grabbed[i] = d >= 1 ? 0 : 1 - d * d * (3 - 2 * d);
      }

      dragTarget.set(0, 0, 0);
      dragging = true;
      activePointer = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      toNdc(event);
      raycaster.setFromCamera(pointerNdc, camera);
      if (!raycaster.ray.intersectPlane(plane, planePoint)) return;
      dragTarget.copy(planePoint).sub(dragStart);
      const length = dragTarget.length();
      if (length > 0) {
        dragTarget.multiplyScalar(
          (MAX_DRAG * Math.tanh(length / MAX_DRAG)) / length
        );
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      dragging = false;
    };

    const simulate = (dt: number, time: number) => {
      const h = dt / SUBSTEPS;
      const grabDamping = 1 / (1 + DAMPING * h);
      for (let step = 0; step < SUBSTEPS; step++) {
        for (let i = 0; i < positions.length; i += 3) {
          const rx = rest[i];
          const ry = rest[i + 1];
          const rz = rest[i + 2];
          const w = grabbed[i / 3] * grabAmount;
          const breath = reduceMotion
            ? 1
            : 1 +
              0.005 * Math.sin(time * 1.1 + rx * 3.7 + ry * 4.9 + rz * 6.1);
          const k = (SPRING + GRAB_SPRING * w) * h;
          const px = positions[i];
          const py = positions[i + 1];
          const pz = positions[i + 2];
          const vx =
            (velocities[i] + (rx * breath + dragTarget.x * w - px) * k) *
            grabDamping;
          const vy =
            (velocities[i + 1] + (ry * breath + dragTarget.y * w - py) * k) *
            grabDamping;
          const vz =
            (velocities[i + 2] + (rz * breath + dragTarget.z * w - pz) * k) *
            grabDamping;
          velocities[i] = vx;
          velocities[i + 1] = vy;
          velocities[i + 2] = vz;
          positions[i] = px + vx * h;
          positions[i + 1] = py + vy * h;
          positions[i + 2] = pz + vz * h;
        }
      }
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
    };

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 1 / 30);
      const time = clock.elapsedTime;

      if (dragging) {
        grabAmount += (1 - grabAmount) * (1 - Math.exp(-22 * dt));
      } else {
        grabAmount += (0 - grabAmount) * (1 - Math.exp(-9 * dt));
        dragTarget.multiplyScalar(Math.exp(-6 * dt));
      }

      simulate(dt, time);
      if (!reduceMotion) scene.environmentRotation.y = time * 0.08;
      renderer.render(scene, camera);
    };

    const resize = () => {
      const width = canvas.clientWidth || 128;
      const height = canvas.clientHeight || 128;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      coreMaterial.dispose();
      shellMaterial.dispose();
      geometry.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="jelly" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
