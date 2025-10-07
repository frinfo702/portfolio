import { rmSync, statSync } from "node:fs"
import { resolve } from "node:path"

const distDir = resolve(process.cwd(), ".next")

try {
  const stats = statSync(distDir)
  if (stats.isDirectory()) {
    rmSync(distDir, { recursive: true, force: true })
    console.info(`[prepare-next] removed stale ${distDir}`)
  }
} catch (error) {
  if (error && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
    // Nothing to clean; ignore
  } else {
    console.warn(`[prepare-next] unable to clean ${distDir}:`, error.message)
  }
}
