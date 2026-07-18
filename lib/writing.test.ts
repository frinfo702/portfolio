import { writings } from "./writing";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(writings.length > 0, "expected at least one writing piece");
assert(
  writings.every((w) => w.slug && w.title && w.href && w.description),
  "writing pieces must have slug, title, href, description",
);
assert(
  writings.some((w) => w.href === "/docs/"),
  "documentation guide should link to /docs/",
);

console.log(`ok — ${writings.length} writing piece(s)`);
