import type * as Three from "three";
import { mirrorOf, studioEnv, type BackdropScene, type Loader, type Strip, type THREE } from "./studio";

// The ice katana: geometry and baked ice textures from scripts/blender/katana.py
// (rebuild with npm run katana). Transmission, clearcoat and reflections
// are what make it read as ice; on the white page it refracts the white behind it.
//
// Model space (metres, as in katana.py): blade along +x from the habaki (x=0) to the tip,
// spine toward +y, flats facing +-z, hilt along -x to the kashira.

const DIR = "/scene/katana/";
const TIP = 0.76;
const KASHIRA = -0.4085; // far end of the knob (X_KASHIRA in katana.py)
const SWORD_LENGTH = TIP - KASHIRA;
const deg = Math.PI / 180;

// White studio: bright overhead, grey floor. The dark strips draw the crisp edge lines
// that make clear ice visible against a white page.
const SKY = { top: [0.95, 0.95, 0.95], horizon: [0.6, 0.65, 0.74], ground: [0.22, 0.25, 0.32] };
const STRIPS: Strip[] = [
  [0, 7, 0x6c7a90, 1], // grey card where the flats mirror the camera: the ice shows, not a white sheet
  [0.3, 1.4, 0xffffff, 3], // bright key line on the hira
  [-0.42, 1.6, 0x1a2230, 1], // dark line on the other slope
  [1.35, 2.2, 0x0c1018, 1], // dark grazing flags: the edge and the mune read as lines
  [-1.4, 2.2, 0x0c1018, 1],
];

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

export async function createKatana(T: THREE, loader: Loader, renderer: Three.WebGLRenderer): Promise<BackdropScene> {
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
  // the cord: flat ribbons of ice, like the ones streaming from the kashira in the reference
  const cordMat = new T.MeshPhysicalMaterial({
    color: 0xcfe2fb, roughness: 0.22, transmission: 0.55, thickness: 0.002, ior: 1.31,
    clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.6, sheenColor: new T.Color(0.85, 0.93, 1), side: T.DoubleSide,
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

  // Cord tied at the kashira's eyelet: two long, soft ribbons that simply hang. Each is a chain
  // of points (Verlet integration with length constraints, pinned at the eyelet) under gravity
  // and a faint breeze, stepped in world space, so they drape, lag behind the sword's drift and
  // settle; nothing is scripted to swing. The flat strip is laid along the chain, facing the camera.
  const NODES = 90;
  const GRAVITY = 2.4; // m/s², low: light silk in still air, not a rope
  const DAMP = 0.965;
  const eye = new T.Vector3(), out = new T.Vector3();
  const cords = [0, 1].map((i) => {
    const geo = new T.PlaneGeometry(1, 1, NODES - 1, 1);
    const mesh = new T.Mesh(geo, cordMat);
    mesh.frustumCulled = false; // vertices move every frame
    root.add(mesh);
    const len = 1.25 - i * 0.3;
    return {
      geo,
      seg: len / (NODES - 1),
      phase: i * 2.1,
      lean: i ? 0.1 : -0.07, // the two settle a little apart instead of one on top of the other
      pos: Array.from({ length: NODES }, () => new T.Vector3()),
      prev: Array.from({ length: NODES }, () => new T.Vector3()),
      ready: false,
    };
  });
  const toLocal = new T.Matrix4();
  const anchor = new T.Vector3(), v = new T.Vector3(), tan = new T.Vector3(), w = new T.Vector3(), q = new T.Vector3();
  const VIEW = new T.Vector3(0, 0, 1);
  let lastT = -1;

  const simulate = (t: number) => {
    const dt = lastT < 0 ? 1 / 30 : Math.min(Math.max(t - lastT, 0), 1 / 20);
    lastT = t;
    root.updateMatrixWorld(true);
    anchor.copy(eye).applyMatrix4(root.matrixWorld);
    for (const c of cords) {
      if (!c.ready) {
        // start hanging straight down, a little out from the knob
        for (let k = 0; k < NODES; k++) {
          c.pos[k].copy(anchor).addScaledVector(out, Math.min(k, 2) * c.seg).y -= Math.max(0, k - 2) * c.seg;
          c.prev[k].copy(c.pos[k]);
        }
        c.ready = true;
      }
      const sub = 2, h = dt / sub;
      for (let s2 = 0; s2 < sub; s2++) {
        for (let k = 1; k < NODES; k++) {
          const p = c.pos[k], o = c.prev[k];
          v.subVectors(p, o).multiplyScalar(DAMP);
          o.copy(p);
          // faint breeze: slow, varying along the length (so the ribbon bends softly instead of
          // hanging dead straight), stronger toward the free end
          const f = k / NODES;
          // a faint draught, not a wind: a few percent of gravity
          const bx = (c.lean + Math.sin(t * 0.22 + c.phase + f * 4.2) * 0.16) * f;
          const bz = Math.cos(t * 0.18 + c.phase * 1.7 + f * 3.4) * 0.09 * f;
          p.add(v);
          p.x += bx * h * h;
          p.z += bz * h * h;
          p.y -= GRAVITY * h * h;
        }
        c.pos[0].copy(anchor);
        for (let it = 0; it < 14; it++) {
          for (let k = 0; k < NODES - 1; k++) {
            const a = c.pos[k], b = c.pos[k + 1];
            v.subVectors(b, a);
            const d = v.length() || 1e-6;
            const corr = (d - c.seg) / d;
            if (k === 0) b.addScaledVector(v, -corr);
            else {
              a.addScaledVector(v, corr * 0.5);
              b.addScaledVector(v, -corr * 0.5);
            }
          }
        }
      }
      // lay the strip along the chain, in root-local coordinates
      toLocal.copy(root.matrixWorld).invert();
      const attr = c.geo.attributes.position;
      for (let k = 0; k < NODES; k++) {
        tan.subVectors(c.pos[Math.min(k + 1, NODES - 1)], c.pos[Math.max(k - 1, 0)]).normalize();
        w.crossVectors(tan, VIEW).normalize();
        // Slow twists along the length that drift with time: where the silk turns edge-on it
        // narrows, then opens again, which is what makes it read as soft rather than a flat card.
        w.applyAxisAngle(tan, Math.sin(k * 0.07 + c.phase + t * 0.05) * 1.1 + Math.sin(k * 0.17 + c.phase * 2) * 0.4);
        const half = 0.0011 + 0.0105 * Math.min(1, k / 6);   // thin where it is tied, then the ribbon
        for (const side of [-1, 1]) {
          q.copy(c.pos[k]).addScaledVector(w, side * half).applyMatrix4(toLocal);
          attr.setXYZ(side < 0 ? k : k + NODES, q.x, q.y, q.z);
        }
      }
      attr.needsUpdate = true;
      c.geo.computeVertexNormals();
    }
  };

  let envMap: Three.Texture | null = null;

  // Lay the sword across the view: tip toward the lower left at `angle` (degrees above the
  // horizontal), spine up, rolled about its own axis so the shinogi catches the light.
  // Centred on the origin; the camera looks down -z from +z.
  const place = (angle: number) => {
    const a = angle * deg;
    const x = new T.Vector3(-Math.cos(a), -Math.sin(a), 0);
    const y = new T.Vector3(-Math.sin(a), Math.cos(a), 0);
    const r = new T.Matrix4().makeBasis(x, y, x.clone().cross(y));
    r.premultiply(new T.Matrix4().makeRotationAxis(x, 24 * deg));
    r.premultiply(new T.Matrix4().makeRotationAxis(y, -8 * deg));
    const centre = new T.Vector3((TIP + KASHIRA) / 2, 0.016, 0).applyMatrix4(r);
    sword.matrix.copy(r).setPosition(centre.negate());
    sword.matrixWorldNeedsUpdate = true;

    eye.set(KASHIRA, 0.016, 0).applyMatrix4(sword.matrix);
    out.set(-1, 0, 0).transformDirection(sword.matrix);
    for (const c of cords) c.ready = false; // re-hang from the new pose

    const axis = new T.Vector3(1, 0, 0).transformDirection(sword.matrix);
    const flat = new T.Vector3(0, 0, 1).transformDirection(sword.matrix);
    envMap?.dispose();
    envMap = studioEnv(T, renderer, mirrorOf(T, flat), axis, SKY, STRIPS);
    for (const m of [...Object.values(materials), cordMat]) {
      if (m instanceof T.MeshPhysicalMaterial) m.envMap = envMap;
    }
  };

  let angle = 0;
  return {
    root,
    // Landscape: a shallow diagonal fitted to the width. Portrait: steeper, so it is not tiny.
    frame(aspect: number) {
      const want = aspect < 1 ? 58 : 28;
      if (want !== angle) place((angle = want));
      const a = angle * deg;
      return { w: SWORD_LENGTH * Math.cos(a), h: SWORD_LENGTH * Math.sin(a) };
    },
    update(t: number) {
      time.value = t;
      simulate(t);
    },
    dispose() {
      envMap?.dispose();
      for (const m of Object.values(materials)) {
        for (const v of Object.values(m)) if ((v as Three.Texture)?.isTexture) (v as Three.Texture).dispose();
      }
    },
  };
}
