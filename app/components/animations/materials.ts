// Procedural materials for module fills, rendered with WebGL into one shared
// offscreen canvas and then copied into a 2D canvas with drawImage:
// ice for frozen weights, slow-moving heat for weights being trained.

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

const ICE = `${COMMON}
void main() {
  vec2 px = vUv * uRes;
  vec2 p = px / 34.0;
  float warp = fbm(p * 0.8);
  float crack = 1.0 - smoothstep(0.0, 0.05, cells(p + warp * 0.7));
  float hair = 1.0 - smoothstep(0.0, 0.025, cells(p * 2.6 + 4.0 + warp));
  float frost = fbm(px / 9.0);
  vec2 q = min(vUv, 1.0 - vUv) * uRes;
  float rim = 1.0 - smoothstep(0.0, 22.0, min(q.x, q.y));

  vec3 deep = vec3(0.07, 0.11, 0.15);
  vec3 body = vec3(0.33, 0.45, 0.55);
  vec3 white = vec3(0.84, 0.91, 0.96);
  vec3 col = mix(deep, body, 0.2 + 0.45 * fbm(p * 0.5 + 3.0));
  col = mix(col, white, crack * 0.6 + hair * 0.22);
  col = mix(col, white, rim * frost * 0.55);
  // a slow glint crossing the surface
  float s = fract(uTime * 0.09) * 2.6 - 0.8;
  float glint = exp(-pow((vUv.x * 0.8 + vUv.y * 0.6 - s) * 7.0, 2.0));
  col += glint * (0.12 + 0.25 * crack) * vec3(0.85, 0.93, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;

const HEAT = `${COMMON}
void main() {
  vec2 px = vUv * uRes;
  vec2 p = px / 46.0;
  float t = uTime;
  vec2 flow = vec2(fbm(p + vec2(0.0, -t * 0.35)), fbm(p * 1.3 + vec2(5.2, -t * 0.5)));
  float n = fbm(p * 1.7 + flow * 1.8 + vec2(0.0, -t * 0.8));
  float heat = smoothstep(0.2, 0.8, n);
  float k = 0.65 + 0.35 * uIntensity;

  vec3 dark = vec3(0.2, 0.13, 0.08);
  vec3 amber = vec3(0.8, 0.52, 0.25);
  vec3 hot = vec3(0.97, 0.84, 0.6);
  vec3 col = mix(dark, amber, heat * k);
  col = mix(col, hot, pow(heat, 2.5) * (0.35 + 0.65 * uIntensity));
  // faint grain so it does not look like a gradient
  col += (hash2(floor(px)).x - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`;

type Program = {
  program: WebGLProgram;
  res: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
  seed: WebGLUniformLocation | null;
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
  options: { time: number; intensity?: number; seed?: number; scale?: number },
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
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // the viewport sits at the bottom-left of the GL canvas
  ctx.drawImage(canvas, 0, SIZE - ph, pw, ph, rect.x, rect.y, rect.w, rect.h);
  return true;
}
