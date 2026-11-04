import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Static export for the build. Under `next dev` it is left off, so the dev-only fixture switch
  // route (app/dev-fixture/route.dev.ts; *.dev.ts files exist only in dev) can run.
  ...(dev ? { pageExtensions: ["tsx", "ts", "jsx", "js", "dev.ts"] } : { output: "export" as const }),
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
