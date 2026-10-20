// Procedural materials for module fills, rendered with WebGL into one shared
// offscreen canvas and then copied into a 2D canvas with drawImage:
// ice for frozen weights, magma for weights being trained.

export type Material = "ice" | "heat";

const SIZE = 1024;

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const COMMON = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntensity;
uniform float uSeed;
uniform float uCover;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p + uSeed) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash2(i).x;
  float b = hash2(i + vec2(1.0, 0.0)).x;
  float c = hash2(i + vec2(0.0, 1.0)).x;
  float d = hash2(i + vec2(1.0, 1.0)).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

// Distance to the nearest Voronoi cell border: thin values are cracks.
float cells(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = g + hash2(n + g) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  return sqrt(d2) - sqrt(d1);
}
`;

// A clear ice block: mostly transparent, so whatever is behind shows
// through, with a bevelled rim that catches the light, a cloudy core, and
// sharp specular highlights from a light at the top left.
//
// Frost grows over it the way the freezing-cube etude does it: a per-pixel
// "freeze time" map (here: distance from the edge plus noise) is compared
// with uCover, so frost creeps in from the edges with a ragged front as
// uCover rises from 0 to 1. The frost itself is ridged noise (fern-like
// crystals) lit as a bump map.
const ICE = `${COMMON}
const float BEVEL = 9.0;

// Inside distance to the edge of a rounded rectangle filling the canvas.
float inside(vec2 px) {
  vec2 hs = uRes * 0.5;
  float r = 7.0;
  vec2 q = abs(px - hs) - (hs - r);
  return -(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r);
}

float ridge(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(noise(p) * 2.0 - 1.0);
    v += a * n * n;
    p = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float fern(vec2 px) {
  vec2 w = vec2(fbm(px / 30.0 + uSeed), fbm(px / 30.0 + 4.0 + uSeed));
  return ridge(px / 13.0 + w * 2.6);
}

// Surface height: a bevel up from the edge plus a gently melted top.
float height(vec2 px) {
  float d = inside(px);
  float bevel = 1.0 - pow(1.0 - clamp(d / BEVEL, 0.0, 1.0), 2.0);
  return bevel * 3.0 + fbm(px / 38.0 + uSeed) * 1.6;
}

void main() {
  vec2 px = vUv * uRes;
  float d = inside(px);
  if (d < 0.0) { gl_FragColor = vec4(0.0); return; }

  vec2 e = vec2(0.75, 0.0);
  vec2 grad = vec2(height(px + e.xy) - height(px - e.xy), height(px + e.yx) - height(px - e.yx)) / (2.0 * e.x);
  vec3 n = normalize(vec3(-grad * 1.4, 1.0));
  vec3 light = normalize(vec3(-0.55, 0.65, 0.7));
  vec3 h = normalize(light + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, h), 0.0), 90.0);
  float sheen = pow(max(dot(n, h), 0.0), 9.0);
  float fresnel = pow(1.0 - n.z, 1.6);

  float rim = 1.0 - smoothstep(0.0, BEVEL * 1.6, d);
  float edgeLine = exp(-pow((d - 1.6) / 0.9, 2.0));
  float innerEdge = exp(-pow((d - BEVEL) / 1.8, 2.0));
  float core = smoothstep(BEVEL, BEVEL * 3.5, d) * smoothstep(0.35, 0.8, fbm(px / 26.0 + uSeed * 3.0));
  float veins = (1.0 - smoothstep(0.0, 0.035, cells(px / 70.0 + uSeed))) * smoothstep(BEVEL, BEVEL * 2.0, d);

  vec3 tint = vec3(0.56, 0.74, 0.88);
  vec3 col = tint * (0.45 + 0.4 * vUv.y);
  col = mix(col, vec3(0.86, 0.93, 0.99), rim * 0.6 + core * 0.35 + veins * 0.1);
  col -= innerEdge * 0.12;
  col += (spec * 1.4 + sheen * 0.22) * vec3(1.0, 1.0, 0.98);
  col += edgeLine * 0.55;

  float alpha = 0.16 + rim * 0.55 + fresnel * 0.5 + core * 0.3 + veins * 0.2
    + spec + sheen * 0.15 + edgeLine * 0.6;

  // frost: where it has reached, how thick it is, and its growing front
  float toCenter = clamp(d / (min(uRes.x, uRes.y) * 0.5), 0.0, 1.0);
  float seed = 1.0 - toCenter * 0.85 + (fbm(px / 18.0 + uSeed * 5.0) - 0.5) * 0.5;
  float level = seed + uCover * 1.3 - 1.05;
  float frozen = smoothstep(-0.03, 0.03, level);
  float front = exp(-pow(level / 0.02, 2.0)) * step(uCover, 0.995);
  float f = fern(px);
  float frost = smoothstep(0.42, 0.8, f) * frozen * (0.3 + 0.7 * clamp(seed, 0.0, 1.0));
  vec2 g = vec2(fern(px + e.xy) - fern(px - e.xy), fern(px + e.yx) - fern(px - e.yx)) / (2.0 * e.x);
  vec3 fn = normalize(vec3(-g * 5.0, 1.0));
  float fspec = pow(max(dot(fn, h), 0.0), 36.0) * frost;

  col = mix(col, vec3(0.9, 0.95, 1.0), frost * 0.7);
  col += fspec * 0.9 + front * vec3(0.75, 0.92, 1.0) * 0.9;
  alpha = max(alpha, frost * 0.8) + fspec * 0.5;

  // while freezing over something warm, the new ice is darker and thicker
  float backing = frozen * clamp(1.0 - uCover, 0.0, 1.0);
  col = mix(col, vec3(0.1, 0.14, 0.18), backing * 0.5 * (1.0 - frost));
  alpha = max(alpha, backing * 0.85);

  alpha = alpha * frozen + front * 0.8;
  gl_FragColor = vec4(min(col, 1.0), clamp(alpha, 0.0, 0.97));
}`;

// Magma: plates of dark cooled crust drifting slowly, with molten cracks
// between them. uIntensity widens and brightens the cracks, so a gradient
// arriving or a weight update reads as the rock heating up.
const HEAT = `${COMMON}
vec3 lava(float h) {
  vec3 col = mix(vec3(0.35, 0.04, 0.02), vec3(0.93, 0.33, 0.06), smoothstep(0.0, 0.55, h));
  return mix(col, vec3(1.0, 0.86, 0.5), smoothstep(0.6, 1.0, h));
}

void main() {
  vec2 px = vUv * uRes;
  float t = uTime;
  float k = 0.55 + 0.45 * uIntensity;
  vec2 p = px / 24.0;
  vec2 flow = vec2(fbm(p * 0.55 + vec2(t * 0.04, 0.0)), fbm(p * 0.55 + vec2(3.1, -t * 0.035)));
  vec2 q = p + (flow - 0.5) * 1.5 + vec2(t * 0.03, -t * 0.05);

  float e = cells(q + uSeed);
  float fine = cells(q * 2.4 + 5.0 + uSeed);
  float crack = 1.0 - smoothstep(0.0, 0.035 + 0.075 * k, e);
  float hairline = (1.0 - smoothstep(0.0, 0.025, fine)) * smoothstep(0.12, 0.3, e);
  float glow = exp(-e * (11.0 - 5.0 * k));
  float pulse = 0.75 + 0.25 * sin(t * 1.8 + fbm(q * 1.3) * 6.2832);

  // crust: rough basalt, a little lighter in the middle of each plate
  float rough = fbm(px / 5.0 + uSeed);
  vec3 crust = mix(vec3(0.045, 0.032, 0.028), vec3(0.15, 0.11, 0.09), rough);
  crust *= 0.75 + 0.5 * smoothstep(0.05, 0.5, e);

  float heat = clamp(crack * pulse + hairline * 0.35 * k, 0.0, 1.0);
  vec3 col = crust + glow * vec3(0.85, 0.24, 0.04) * 0.5 * k;
  col = mix(col, lava(heat * (0.75 + 0.25 * k)), heat);
  // embers drifting up out of the cracks
  vec2 cell = floor(vec2(px.x / 7.0, px.y / 7.0 - t * 1.4));
  vec2 r = hash2(cell + 11.0);
  float ember = step(0.985, r.x) * smoothstep(0.5, 0.0, length(fract(vec2(px.x / 7.0, px.y / 7.0 - t * 1.4)) - 0.5));
  col += ember * vec3(1.0, 0.6, 0.2) * k;
  gl_FragColor = vec4(min(col, 1.0), 1.0);
}`;

type Program = {
  program: WebGLProgram;
  res: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
  seed: WebGLUniformLocation | null;
  cover: WebGLUniformLocation | null;
};

let state: { canvas: HTMLCanvasElement; gl: WebGLRenderingContext; programs: Record<Material, Program> } | null | false = null;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function link(gl: WebGLRenderingContext, fragment: string): Program {
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  return {
    program,
    res: gl.getUniformLocation(program, "uRes"),
    time: gl.getUniformLocation(program, "uTime"),
    intensity: gl.getUniformLocation(program, "uIntensity"),
    seed: gl.getUniformLocation(program, "uSeed"),
    cover: gl.getUniformLocation(program, "uCover"),
  };
}

function setup() {
  if (state !== null) return state;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error("no webgl");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    state = { canvas, gl, programs: { ice: link(gl, ICE), heat: link(gl, HEAT) } };
  } catch {
    state = false;
  }
  return state;
}

// Paints `kind` into the rectangle (x, y, w, h) of a 2D context. `scale` is
// how many device pixels one unit covers. Returns false without WebGL, so the
// caller can fall back to a flat fill.
export function paintMaterial(
  ctx: CanvasRenderingContext2D,
  kind: Material,
  rect: { x: number; y: number; w: number; h: number },
  // cover: how far frost has spread over ice, 0..1 (ice only).
  options: { time: number; intensity?: number; seed?: number; scale?: number; cover?: number },
) {
  const s = setup();
  if (!s) return false;
  const { gl, canvas, programs } = s;
  const scale = options.scale ?? 1;
  const pw = Math.max(1, Math.min(SIZE, Math.round(rect.w * scale)));
  const ph = Math.max(1, Math.min(SIZE, Math.round(rect.h * scale)));
  const program = programs[kind];
  gl.viewport(0, 0, pw, ph);
  gl.useProgram(program.program);
  // uRes is in board units so patterns keep their size at any resolution.
  gl.uniform2f(program.res, rect.w, rect.h);
  gl.uniform1f(program.time, options.time);
  gl.uniform1f(program.intensity, options.intensity ?? 0.5);
  gl.uniform1f(program.seed, options.seed ?? 0);
  gl.uniform1f(program.cover, options.cover ?? 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // the viewport sits at the bottom-left of the GL canvas
  ctx.drawImage(canvas, 0, SIZE - ph, pw, ph, rect.x, rect.y, rect.w, rect.h);
  return true;
}
