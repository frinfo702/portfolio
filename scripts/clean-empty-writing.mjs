// output: "export" needs at least one static param for /writing/[slug].
// With no posts, lib/writing.ts generates an unlinked "_" placeholder.
// Remove that build artifact so /writing/_ is a real 404 in production.
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const writingDir = join(process.cwd(), "out", "writing");
const targets = [
  join(writingDir, "_"),
  join(writingDir, "_.html"),
  join(writingDir, "_.txt"),
];

const removed = [];
for (const target of targets) {
  if (!existsSync(target)) continue;
  await rm(target, { recursive: true, force: true });
  removed.push(target);
}

if (removed.length > 0) {
  console.log("Removed empty writing placeholder from out/");
}
