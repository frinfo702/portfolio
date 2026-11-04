import type * as Three from "three";
import { mirrorOf, studioEnv, type BackdropScene, type Loader, type Strip, type THREE } from "./studio";

// The dark-theme backdrop: a long and a medium black blade with white-wrapped hilts, crossed and
// floating, both hilts up. Modelled and baked un-posed in scripts/blender/blades.py (rebuild
// with npm run blades); the crossed pose is set here, per screen shape.
// Dark metal on a dark page is seen almost only through what it reflects, so the reflection
// studio does the work: polished bevels and spine chamfers catch bright strips, the brushed
// flats pick up a dim card, and a lacquer-like clearcoat adds depth.

const DIR = "/scene/blades/";

const SKY = { top: [0.022, 0.024, 0.03], horizon: [0.008, 0.008, 0.01], ground: [0.002, 0.002, 0.003] };
const STRIPS: Strip[] = [
  [0, 12, 0x8090a8, 0.14], // dim card: the flats read as dark gunmetal, so the slot reads as a hole
  // Bevels (tilted ~12°, more near the tip) catch these as bright edge lines. Kept ~3° wide:
  // thinner strips alias in the prefiltered map and the curved bevel at the tip turns dashed.
  [0.36, 1.8, 0xffffff, 3.5], [0.5, 1.8, 0xffffff, 4], [0.64, 1.8, 0xffffff, 2.5],
  [-0.36, 1.8, 0xffffff, 3], [-0.5, 1.8, 0xffffff, 3.5], [-0.64, 1.8, 0xffffff, 2],
  [1.55, 2, 0xdfe6ff, 3], // spine chamfers (~45°)
  [-1.55, 2, 0xdfe6ff, 3],
];

const deg = Math.PI / 180;

// Per sword: blade length (model metres, as in blades.py), roll about its own axis, depth.
// Per screen shape: the angle of each blade below the horizontal (hilt up, pointing down and
// across) and the fraction of its length at which the two cross.
const SWORDS = { long: { L: 1.0, roll: 18, z: 0 }, short: { L: 0.64, roll: -18, z: -0.06 } } as const;
const POSES = {
  wide: { long: [-32, 0.53], short: [-148, 0.47] },
  tall: { long: [-64, 0.5], short: [-116, 0.5] },
} as const;

export async function createBlades(T: THREE, loader: Loader, renderer: Three.WebGLRenderer): Promise<BackdropScene> {
  const gltf = await loader.loadAsync(DIR + "blades.glb");

  const tl = new T.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const cache = new Map<string, Three.Texture>();
  const tex = (name: string, srgb = false) => {
    let t = cache.get(name);
    if (!t) {
      t = tl.load(DIR + name + ".webp");
      t.flipY = false;
      t.anisotropy = aniso;
      t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
      cache.set(name, t);
    }
    return t;
  };
  const maps = (name: string) => ({ map: tex(name + "_col", true), mat: tex(name + "_mat"), nrm: tex(name + "_nrm") });

  const metal = (name: string, extra: Three.MeshPhysicalMaterialParameters = {}) => {
    const t = maps(name);
    return new T.MeshPhysicalMaterial({
      // the baked roughness halved and the colour darkened: crisp highlights, near-black flats
      map: t.map, color: new T.Color(0.45, 0.45, 0.45), metalness: 1, metalnessMap: t.mat, roughness: 0.5, roughnessMap: t.mat,
      normalMap: t.nrm, normalScale: new T.Vector2(0.5, 0.5),
      clearcoat: 0.6, clearcoatRoughness: 0.05, ...extra,
    });
  };

  const meshes: Record<string, Three.Mesh> = {};
  gltf.scene.traverse((o) => {
    if ((o as Three.Mesh).isMesh) meshes[o.name] = o as Three.Mesh;
  });

  // One group per sword holding Blender model coords; each sword's metal gets its own
  // reflection studio, lined up with its blade.
  const pair = new T.Group();
  const swords = (["long", "short"] as const).map((name) => {
    const group = new T.Group();
    group.matrixAutoUpdate = false;
    const model = new T.Group();
    model.rotation.x = Math.PI / 2; // undo glTF's Y-up
    group.add(model);
    pair.add(group);
    const wrap = maps("wrap");
    const core = maps("core");
    const mats = {
      blade: metal(name + "_blade", { anisotropy: 0.6 }), // brushed along the blade (UV u runs along it)
      fit: metal("fit", { clearcoat: 0.3 }),
      wrap: new T.MeshPhysicalMaterial({
        map: wrap.map, roughness: 1, roughnessMap: wrap.mat, normalMap: wrap.nrm,
        sheen: 0.6, sheenRoughness: 0.5, sheenColor: new T.Color(0.9, 0.92, 1), envMapIntensity: 0.3,
      }),
      core: new T.MeshStandardMaterial({ map: core.map, roughness: 1, roughnessMap: core.mat, normalMap: core.nrm }),
    };
    for (const kind of ["blade", "fit", "wrap", "core"] as const) {
      const mesh = meshes[name + "_" + kind];
      mesh.material = mats[kind];
      model.add(mesh);
    }
    return { name, group, mats, env: null as Three.Texture | null };
  });

  // Hilt up, the blade pointing down and across at `angle`, edge facing down and outward,
  // rolled about its own axis; the point at fraction `f` along the blade sits on the crossing.
  const place = (shape: keyof typeof POSES) => {
    for (const s of swords) {
      const { L, roll, z } = SWORDS[s.name];
      const [angle, f] = POSES[shape][s.name];
      const d = new T.Vector3(Math.cos(angle * deg), Math.sin(angle * deg), 0);
      const edge = new T.Vector3(-d.y, d.x, 0);
      if (edge.y > 0) edge.negate();
      const spine = edge.clone().negate();
      const m = new T.Matrix4().makeBasis(d, spine, d.clone().cross(spine));
      m.premultiply(new T.Matrix4().makeRotationAxis(d, roll * deg));
      const cross = new T.Vector3(f * L, 0, 0).applyMatrix4(m);
      m.setPosition(-cross.x, -cross.y, z - cross.z);
      s.group.matrix.copy(m);
      s.group.matrixWorldNeedsUpdate = true;

      s.env?.dispose();
      const flat = new T.Vector3(0, 0, 1).transformDirection(m);
      s.env = studioEnv(T, renderer, mirrorOf(T, flat), d, SKY, STRIPS);
      s.mats.blade.envMap = s.mats.fit.envMap = s.mats.wrap.envMap = s.env;
    }
    // centre the crossed pair on the origin
    pair.position.set(0, 0, 0);
    pair.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(pair);
    pair.position.sub(box.getCenter(new T.Vector3()));
    return box.getSize(new T.Vector3());
  };

  const root = new T.Group();
  const key = new T.DirectionalLight(0xffffff, 2.0);
  key.position.set(-2, 3, 3);
  const rim = new T.DirectionalLight(0xc8d4ff, 1.2);
  rim.position.set(3, 1, -2);
  root.add(pair, new T.AmbientLight(0xffffff, 0.9), key, rim); // ambient only lights the cloth

  let shape: keyof typeof POSES | null = null;
  let size = new T.Vector3();
  return {
    root,
    frame(aspect: number) {
      const want = aspect < 1 ? "tall" : "wide";
      if (want !== shape) size = place((shape = want));
      return { w: size.x, h: size.y };
    },
    update: () => {},
    dispose() {
      for (const t of cache.values()) t.dispose();
      for (const s of swords) s.env?.dispose();
    },
  };
}
