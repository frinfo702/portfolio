import type * as Three from "three";

// The ice katana: geometry and baked ice textures from scripts/blender/katana.py
// (rebuild with scripts/blender/build-katana.sh). Transmission, clearcoat and reflections
// are what make it read as ice; on the white page it refracts the white behind it.
//
// Model space (metres, as in katana.py): blade along +x from the habaki (x=0) to the tip,
// spine toward +y, flats facing +-z, hilt along -x to the kashira.

type THREE = typeof Three;
type Loader = { loadAsync(url: string): Promise<{ scene: Three.Group }> };

const DIR = "/scene/katana/";
const TIP = 0.76;
const KASHIRA = -0.345;
export const SWORD_LENGTH = TIP - KASHIRA;
const deg = Math.PI / 180;

// White studio for reflections: bright overhead, grey floor, and long strips parallel to the
// blade placed where its convex hira mirrors them. The dark ones draw the crisp edge lines
// that make clear ice visible against a white page.
function environment(T: THREE, renderer: Three.WebGLRenderer, mirror: Three.Vector3, axis: Three.Vector3) {
  const env = new T.Scene();
  env.add(
    new T.Mesh(
      new T.SphereGeometry(50, 64, 32),
      new T.ShaderMaterial({
        side: T.BackSide,
        vertexShader:
          "varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `varying vec3 vP; void main() {
          float h = vP.y;
          vec3 top = vec3(0.95), hor = vec3(0.6, 0.65, 0.74), gnd = vec3(0.22, 0.25, 0.32);
          vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.6)) : mix(hor, gnd, pow(-h, 0.5));
          gl_FragColor = vec4(c, 1.0); }`,
      }),
    ),
  );
  const strip = (a: number, w: number, color: number, k: number) => {
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
  };
  strip(0, 7, 0x6c7a90, 1); // grey card where the flats mirror the camera: the ice shows, not a white sheet
  strip(0.3, 1.4, 0xffffff, 3); // bright key line on the hira
  strip(-0.42, 1.6, 0x1a2230, 1); // dark line on the other slope
  strip(1.35, 2.2, 0x0c1018, 1); // dark grazing flags: the edge and the mune read as lines
  strip(-1.4, 2.2, 0x0c1018, 1);
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

// Frost glows faintly (emissive masked by the frost channel of the _mat map) and the silhouette
// picks up a cold fresnel rim, the way light pipes through ice and leaks out at its edges.
function iceShader<M extends Three.Material>(m: M, rim: Three.Color, power: number) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uRim = { value: rim };
    s.fragmentShader =
      "uniform vec3 uRim;\n" +
      s.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#ifdef USE_EMISSIVEMAP
          totalEmissiveRadiance *= texture2D(emissiveMap, vEmissiveMapUv).b;
        #endif
        float fres = 1.0 - saturate(abs(dot(normal, normalize(vViewPosition))));
        totalEmissiveRadiance += uRim * pow(fres, ${power.toFixed(1)});`,
      );
  };
  return m;
}

const glintVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position + normal * 0.0005, 1.0);
    vec3 n = normalize(normalMatrix * normal), v = normalize(-mv.xyz);
    float tw = pow(max(0.0, sin(uTime * (0.7 + aSeed * 1.6) + aSeed * 61.0 + dot(v, vec3(31.0, 17.0, 23.0)))), 30.0);
    vA = tw * (0.35 + 0.65 * abs(dot(n, v)));
    gl_PointSize = uSize * (0.5 + aSeed);
    gl_Position = projectionMatrix * mv;
  }
`;

const glintFragment = /* glsl */ `
  varying float vA;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float core = exp(-dot(p, p) * 90.0);
    float star = exp(-abs(p.x) * 46.0) * exp(-abs(p.y) * 7.0) + exp(-abs(p.y) * 46.0) * exp(-abs(p.x) * 7.0);
    gl_FragColor = vec4(vec3(0.9, 0.95, 1.0) * (core + star * 0.7) * vA * 1.6, 1.0);
  }
`;

export async function createKatana(T: THREE, loader: Loader, renderer: Three.WebGLRenderer) {
  const gltf = await loader.loadAsync(DIR + "katana.glb");

  const tl = new T.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (name: string, srgb = false) => {
    const t = tl.load(DIR + name + ".webp");
    t.flipY = false;
    t.anisotropy = aniso;
    t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
    return t;
  };
  const maps = (name: string) => ({ map: tex(name + "_col", true), mat: tex(name + "_mat"), nrm: tex(name + "_nrm") });
  const ice = (name: string, glow: number[], rim: number[], extra: Three.MeshPhysicalMaterialParameters) => {
    const t = maps(name);
    return iceShader(
      new T.MeshPhysicalMaterial({
        map: t.map, roughness: 1, roughnessMap: t.mat, metalness: 0, normalMap: t.nrm,
        transmission: 1, transmissionMap: t.mat, ior: 1.31,
        emissive: new T.Color(...glow), emissiveMap: t.mat,
        clearcoat: 1, clearcoatRoughness: 0.035, ...extra,
      }),
      new T.Color(...rim), 2.6,
    );
  };
  const cloth = (name: string, rim: number[], extra: Three.MeshPhysicalMaterialParameters) => {
    const t = maps(name);
    return iceShader(
      new T.MeshPhysicalMaterial({ map: t.map, roughness: 1, roughnessMap: t.mat, normalMap: t.nrm, ...extra }),
      new T.Color(...rim), 3,
    );
  };
  const coreTex = tex("core_col", true);
  const cordMat = new T.MeshPhysicalMaterial({
    color: 0xdfe6f0, roughness: 0.7, sheen: 1, sheenRoughness: 0.4, sheenColor: new T.Color(0.8, 0.9, 1),
    side: T.DoubleSide,
  });
  const materials: Record<string, Three.MeshPhysicalMaterial | Three.MeshBasicMaterial> = {
    blade: ice("blade", [0.12, 0.16, 0.24], [0.1, 0.2, 0.4], {
      normalScale: new T.Vector2(0.45, 0.45), thickness: 0.014,
      attenuationColor: new T.Color(0.3, 0.58, 1.0), attenuationDistance: 0.012,
    }),
    fittings: ice("fittings", [0.1, 0.13, 0.2], [0.08, 0.16, 0.32], {
      envMapIntensity: 0.6, clearcoat: 0.5, clearcoatRoughness: 0.12, normalScale: new T.Vector2(0.6, 0.6),
      thickness: 0.01, attenuationColor: new T.Color(0.55, 0.75, 1.0), attenuationDistance: 0.02,
    }),
    same: cloth("same", [0.05, 0.1, 0.2], { clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    ito: cloth("ito", [0.05, 0.08, 0.15], {
      envMapIntensity: 0.6, sheen: 0.5, sheenRoughness: 0.45, sheenColor: new T.Color(0.7, 0.82, 1.0),
    }),
    // frozen-in core: wisps, fracture sheets and bubble trails, seen only through the clear blade
    core: new T.MeshBasicMaterial({
      map: coreTex, alphaMap: coreTex, alphaTest: 0.1, alphaToCoverage: true, color: new T.Color(0.86, 0.92, 1.0),
    }),
  };

  const time = { value: 0 };
  const glint = new T.ShaderMaterial({
    uniforms: { uTime: time, uSize: { value: 14 * renderer.getPixelRatio() } },
    vertexShader: glintVertex,
    fragmentShader: glintFragment,
    blending: T.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const addGlints = (mesh: Three.Mesh, count: number) => {
    const p = mesh.geometry.attributes.position;
    const n = mesh.geometry.attributes.normal;
    const pos: number[] = [], nrm: number[] = [], seed: number[] = [];
    for (let k = 0; k < count; k++) {
      const i = Math.floor(Math.random() * p.count);
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      seed.push(Math.random());
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(nrm, 3));
    geo.setAttribute("aSeed", new T.Float32BufferAttribute(seed, 1));
    const pts = new T.Points(geo, glint);
    pts.renderOrder = 4;
    mesh.add(pts);
  };

  // root: centred on the origin, swayed by the caller; sword: the posed model inside it
  const root = new T.Group();
  const sword = new T.Group();
  sword.matrixAutoUpdate = false;
  gltf.scene.rotation.x = Math.PI / 2; // undo glTF's Y-up so the group holds Blender model coords
  sword.add(gltf.scene);
  root.add(sword);
  gltf.scene.traverse((o) => {
    const mesh = o as Three.Mesh;
    if (!mesh.isMesh) return;
    const key = Object.keys(materials).find((k) => mesh.name.startsWith(k));
    if (key) mesh.material = materials[key];
    if (key === "blade") addGlints(mesh, 70);
    if (key === "fittings") addGlints(mesh, 18);
  });

  const key = new T.DirectionalLight(0xffffff, 1.5);
  key.position.set(-2, 3, 3);
  const fill = new T.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(3, -1, 2);
  root.add(new T.AmbientLight(0xdfe6f2, 0.45), key, fill);

  // sageo: wound 1.5 turns down the tsuka, then hanging free from the tsuba and swaying
  const HANG = 0.24;
  const WRAP_R = 0.018;
  const A = new T.Vector3(), B = new T.Vector3(), grip = new T.Vector3(), side = new T.Vector3(), front = new T.Vector3();
  let gripLen = 0;
  const cords = [0, 1].map((i) => {
    const seg = 160;
    const geo = new T.PlaneGeometry(1, 1, seg, 1);
    root.add(new T.Mesh(geo, cordMat));
    return { geo, seg, hang: HANG - i * 0.04, phase: i * Math.PI };
  });
  const p = new T.Vector3(), w = new T.Vector3();
  const cordPoint = (c: (typeof cords)[number], d: number, t: number) => {
    const along = Math.min(d, gripLen);
    const th = (2 * Math.PI * 1.5 * along) / gripLen + c.phase;
    p.copy(A).addScaledVector(grip, along).addScaledVector(side, Math.cos(th) * WRAP_R).addScaledVector(front, Math.sin(th) * WRAP_R);
    if (d <= gripLen) {
      w.copy(grip);
      return;
    }
    const h = d - gripLen, sway = Math.min(h, 0.25) / 0.25;
    p.x += ((c.phase ? 0.02 : -0.012) + Math.sin(t * 0.9 + h * 6 + c.phase) * 0.014) * sway;
    p.z += (0.016 + Math.cos(t * 0.7 + h * 5 + c.phase) * 0.012) * sway;
    p.y -= h;
    const tw = Math.sin(h * 12 - t * 1.6 + c.phase) * 0.6;
    w.set(Math.cos(tw), 0, Math.sin(tw));
  };

  let envMap: Three.Texture | null = null;

  return {
    root,
    // Lay the sword across the view: tip toward the lower left at `angle` (degrees above the
    // horizontal), spine up, rolled about its own axis so the shinogi catches the light.
    // Centred on the origin; the camera looks down -z from +z.
    place(angle: number) {
      const a = angle * deg;
      const x = new T.Vector3(-Math.cos(a), -Math.sin(a), 0);
      const y = new T.Vector3(-Math.sin(a), Math.cos(a), 0);
      const r = new T.Matrix4().makeBasis(x, y, x.clone().cross(y));
      r.premultiply(new T.Matrix4().makeRotationAxis(x, 24 * deg));
      r.premultiply(new T.Matrix4().makeRotationAxis(y, -8 * deg));
      const centre = new T.Vector3((TIP + KASHIRA) / 2, 0.016, 0).applyMatrix4(r);
      sword.matrix.copy(r).setPosition(centre.negate());
      sword.matrixWorldNeedsUpdate = true;

      A.set(-0.336, 0.016, 0).applyMatrix4(sword.matrix);
      B.set(-0.03, 0.016, 0).applyMatrix4(sword.matrix);
      grip.subVectors(B, A);
      gripLen = grip.length();
      grip.normalize();
      side.set(0, 0, 1).cross(grip).normalize();
      front.copy(grip).cross(side).normalize();

      // where the flat of the blade mirrors the camera
      const axis = new T.Vector3(1, 0, 0).transformDirection(sword.matrix);
      const flat = new T.Vector3(0, 0, 1).transformDirection(sword.matrix);
      const view = new T.Vector3(0, 0, -1);
      if (flat.dot(view) > 0) flat.negate();
      envMap?.dispose();
      envMap = environment(T, renderer, view.reflect(flat), axis);
      for (const m of [...Object.values(materials), cordMat]) {
        if (m instanceof T.MeshPhysicalMaterial) m.envMap = envMap;
      }
    },
    update(t: number) {
      time.value = t;
      for (const c of cords) {
        const pos = c.geo.attributes.position;
        const len = gripLen + c.hang;
        for (let k = 0; k < pos.count; k++) {
          cordPoint(c, ((k % (c.seg + 1)) / c.seg) * len, t);
          p.addScaledVector(w, (k <= c.seg ? -1 : 1) * 0.003);
          pos.setXYZ(k, p.x, p.y, p.z);
        }
        pos.needsUpdate = true;
        c.geo.computeVertexNormals();
      }
    },
    dispose() {
      envMap?.dispose();
      for (const m of Object.values(materials)) {
        for (const v of Object.values(m)) if ((v as Three.Texture)?.isTexture) (v as Three.Texture).dispose();
      }
    },
  };
}
