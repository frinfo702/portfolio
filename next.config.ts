import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { wgslTurbopackRule } from "@vgpu/wgsl/next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // `next build` runs Turbopack, `npm run dev` runs webpack: both need the WGSL loader.
  turbopack: {
    root: projectRoot,
    rules: {
      "*.wgsl": wgslTurbopackRule({ minify: true }),
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.wgsl$/,
      loader: "@vgpu/wgsl/loader-webpack",
      options: { minify: true },
    });
    return config;
  },
};

export default nextConfig;
