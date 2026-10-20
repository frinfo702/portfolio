// The toy image used across the VLM figures: sky, sun, two hills.
export function paintLandscape(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, 64);
  sky.addColorStop(0, "#1e3a8a");
  sky.addColorStop(0.5, "#7c3aed");
  sky.addColorStop(0.8, "#f472b6");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(44, 22, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f766e";
  ctx.beginPath();
  ctx.moveTo(0, 46);
  ctx.lineTo(17, 27);
  ctx.lineTo(32, 44);
  ctx.lineTo(47, 33);
  ctx.lineTo(64, 48);
  ctx.lineTo(64, 64);
  ctx.lineTo(0, 64);
  ctx.fill();

  ctx.fillStyle = "#064e3b";
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.quadraticCurveTo(32, 48, 64, 56);
  ctx.lineTo(64, 64);
  ctx.lineTo(0, 64);
  ctx.fill();
}

const cache = new Map<number, HTMLCanvasElement>();

// The landscape rasterized at `size` × `size` pixels.
export function landscape(size: number) {
  const hit = cache.get(size);
  if (hit) return hit;
  const big = document.createElement("canvas");
  big.width = 64;
  big.height = 64;
  paintLandscape(big.getContext("2d")!);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d", { willReadFrequently: true })!.drawImage(big, 0, 0, size, size);
  cache.set(size, canvas);
  return canvas;
}

// Mean RGB of each patch when the landscape is cut into grid × grid patches.
export function patchMeans(grid: number) {
  const size = grid * 8;
  const data = landscape(size).getContext("2d")!.getImageData(0, 0, size, size).data;
  return Array.from({ length: grid * grid }, (_, i) => {
    const sum = [0, 0, 0];
    for (let k = 0; k < 64; k += 1) {
      const x = (i % grid) * 8 + (k % 8);
      const y = Math.floor(i / grid) * 8 + Math.floor(k / 8);
      const o = (y * size + x) * 4;
      sum[0] += data[o];
      sum[1] += data[o + 1];
      sum[2] += data[o + 2];
    }
    return sum.map((v) => v / 64);
  });
}
