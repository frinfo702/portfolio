// bot-avatars hard-codes how far the pointer is followed (3 avatar widths).
// Widen it; fails loudly if an upgrade changes the minified source.
import { readFileSync, writeFileSync } from "node:fs";

const RANGE = 10;
const files = {
  "node_modules/bot-avatars/dist/index.es.js": /const Fn = \d+, so = /,
  "node_modules/bot-avatars/dist/index.cjs": /const Ln=\d+,so=zn=>\{/,
};

for (const [file, pattern] of Object.entries(files)) {
  const src = readFileSync(file, "utf8");
  if (!pattern.test(src)) throw new Error(`bot-avatars patch: pattern not found in ${file}`);
  writeFileSync(file, src.replace(pattern, (m) => m.replace(/\d+/, RANGE)));
}
