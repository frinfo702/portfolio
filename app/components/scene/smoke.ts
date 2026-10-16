import { clock, effect, frameLoop, init, surface } from "vgpu";
import smokeShader from "./smoke.wgsl";

export type SmokeState = {
  progress: number;
  neon: number;
  /** Tail-light bar centre in canvas uv, and its half width. */
  light: [number, number];
  lightHalfWidth: number;
  visible: boolean;
};

/**
 * Renders the smoke layer into `canvas`, reading `state` every frame.
 * Rejects when WebGPU is unavailable; resolves to a teardown function.
 */
export async function startSmoke(
  canvas: HTMLCanvasElement,
  state: SmokeState,
): Promise<() => void> {
  const gpu = await init();
  // Smoke is soft, so a low backing resolution is invisible and saves fill rate on phones.
  const canvasSurface = surface(gpu, canvas, { dpr: 0.75, clearColor: [0, 0, 0, 0] });
  const time = clock(gpu);
  const params = () => ({
    time: time.time,
    progress: state.progress,
    aspect: canvasSurface.size[0] / canvasSurface.size[1],
    neon: state.neon,
    light: state.light,
    lightHalfWidth: state.lightHalfWidth,
  });
  const smoke = effect(gpu, smokeShader, { label: "smoke", set: { params: params() } });

  const loop = frameLoop(gpu, (frame) => {
    if (!state.visible) return;
    smoke.set({ params: params() });
    frame.pass(canvasSurface, smoke);
  });

  return () => {
    loop.stop();
    gpu.dispose();
  };
}
