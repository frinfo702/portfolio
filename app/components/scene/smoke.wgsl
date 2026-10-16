import { fbmSimplex3d } from "@vgpu/wgsl-std/noise/simplex";

// progress: 0 = dense smoke at load, 1 = blown clear.
// neon: 0..1 tail-light intensity. light: tail-light bar centre (uv) and half width.
struct Params {
  time: f32,
  progress: f32,
  aspect: f32,
  neon: f32,
  light: vec2f,
  lightHalfWidth: f32,
}
@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time;
  let clear = smoothstep(0.35, 1.0, params.progress);
  // Wind: a steady drift plus a gust that grows with scroll.
  let wind = t * 0.025 + clear * clear * 2.4;

  let p = vec3f(uv.x * params.aspect * 1.4 - wind, uv.y * 1.7, t * 0.03);
  // A gentle warp gives billows; a strong one turns smoke into marbled liquid.
  let warp = fbmSimplex3d(p * 0.7 + vec3f(0.0, 0.0, t * 0.015), 2, 2.0, 0.5);
  let field = fbmSimplex3d(p * 1.3 + vec3f(warp * 0.3, warp * 0.18, 0.0), 5, 2.0, 0.5);
  var density = smoothstep(-0.45, 0.55, field);
  density = density * density * (3.0 - 2.0 * density);
  // A haze floor so the load frame is a room full of smoke, not clouds on black.
  density = mix(0.32, 1.0, density);

  // Heavier at floor level, thin at the very top.
  let ground = smoothstep(0.15, 0.95, uv.y);
  density = density * (0.45 + 0.55 * ground);

  // As it clears, smoke survives only at the edges and along the floor.
  let edges = smoothstep(0.18, 0.55, abs(uv.x - 0.5)) * 0.8 + ground * ground * 0.35;
  let coverage = mix(1.0, edges * 0.55, clear);
  let alpha = clamp(density * coverage * 0.82, 0.0, 0.88);

  // Back light sits behind the car, low in the frame.
  let toLight = (uv - vec2f(0.5, params.light.y - 0.04)) * vec2f(params.aspect * 0.55, 1.0);
  let backlight = exp(-dot(toLight, toLight) * 5.0) * (0.35 + 0.65 * params.progress);
  // Faint light falling from above, so the load frame reads as a lit room, not fog on black.
  let top = uv - vec2f(0.62, -0.1);
  let skylight = exp(-dot(top, top) * 3.0) * 0.35;
  var color = vec3f(0.62 + 0.12 * ground) + vec3f(0.6) * backlight + vec3f(skylight);

  // Red scatter from the tail-light bar.
  let dy = (uv.y - params.light.y) * 5.5;
  let dx = max(abs(uv.x - params.light.x) - params.lightHalfWidth, 0.0) * params.aspect * 3.0;
  let neonGlow = params.neon * exp(-(dx * dx + dy * dy) * 9.0);
  color = mix(color, vec3f(1.0, 0.22, 0.2), neonGlow * 0.55);

  return vec4f(color * alpha, alpha);
}
