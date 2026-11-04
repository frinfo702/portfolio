import type * as Three from "three";

// Shared by the backdrop scenes (iceKatana.ts, darkBlades.ts).

export type THREE = typeof Three;
export type Loader = { loadAsync(url: string): Promise<{ scene: Three.Group }> };

// What KatanaBackdrop needs from a scene: its root, the size it spans on screen for a
// viewport aspect (world units, centred on the origin), a per-frame tick and cleanup.
export type BackdropScene = {
  root: Three.Object3D;
  frame(aspect: number): { w: number; h: number };
  update(t: number): void;
  dispose(): void;
};

// [angle about the blade axis from the mirror direction (rad), width, colour, intensity]
export type Strip = [number, number, number, number];

// Reflection studio for a blade: a sky gradient plus long strips parallel to the blade,
// placed at angles from the direction in which the flat mirrors the camera. A facet tilted
// by t about the blade axis mirrors the strip at about 2t, so each strip draws a line on
// the facets with that tilt (bevels, chamfers, the convex hira).
export function studioEnv(
  T: THREE,
  renderer: Three.WebGLRenderer,
  mirror: Three.Vector3,
  axis: Three.Vector3,
  sky: { top: number[]; horizon: number[]; ground: number[] },
  strips: Strip[],
) {
  const env = new T.Scene();
  const v3 = (c: number[]) => `vec3(${c.map((x) => x.toFixed(4)).join(", ")})`;
  env.add(
    new T.Mesh(
      new T.SphereGeometry(50, 64, 32),
      new T.ShaderMaterial({
        side: T.BackSide,
        vertexShader:
          "varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `varying vec3 vP; void main() {
          float h = vP.y;
          vec3 top = ${v3(sky.top)}, hor = ${v3(sky.horizon)}, gnd = ${v3(sky.ground)};
          vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.6)) : mix(hor, gnd, pow(-h, 0.5));
          gl_FragColor = vec4(c, 1.0); }`,
      }),
    ),
  );
  for (const [a, w, color, k] of strips) {
    const dir = mirror.clone().applyAxisAngle(axis, a);
    const m = new T.Mesh(
      new T.PlaneGeometry(w, 80),
      new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide }),
    );
    const z = dir.clone().negate();
    const y = axis.clone().addScaledVector(z, -axis.dot(z)).normalize();
    m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(y.clone().cross(z), y, z));
    m.position.copy(dir).multiplyScalar(30);
    env.add(m);
  }
  const pm = new T.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0, 0.1, 100).texture;
  pm.dispose();
  env.traverse((o) => {
    const mesh = o as Three.Mesh;
    mesh.geometry?.dispose();
    (mesh.material as Three.Material | undefined)?.dispose();
  });
  return tex;
}

// Direction in which the flat of a blade (unit `flat` normal, either side) mirrors a camera
// looking down -z.
export function mirrorOf(T: THREE, flat: Three.Vector3) {
  const view = new T.Vector3(0, 0, -1);
  const n = flat.dot(view) > 0 ? flat.clone().negate() : flat.clone();
  return view.reflect(n);
}
