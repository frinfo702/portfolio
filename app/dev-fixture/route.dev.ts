// Dev only (a *.dev.ts route, see next.config.ts): reads and sets which content/fixtures/<name>
// lib/writing.ts serves instead of the real posts, and serves the on-screen switch itself
// (GET ?ui) as plain script, so none of it is ever part of a production bundle.
import fs from "node:fs";
import path from "node:path";

const MARKER = path.join(process.cwd(), ".writing-fixture");
const NAMES = ["demo", "worst", "one", "huge"] as const;

function current() {
  try {
    return fs.readFileSync(MARKER, "utf8").trim() || "demo";
  } catch {
    return "demo";
  }
}

export function GET(request: Request) {
  if (!new URL(request.url).searchParams.has("ui")) return Response.json({ name: current() });
  return new Response(switchScript(current()), { headers: { "content-type": "text/javascript" } });
}

// Segmented control fixed at the bottom centre: plain chrome, not part of the design under test.
function switchScript(active: string) {
  const states = [["demo", "Demo data"], ["worst", "Worst case"], ["one", "One"], ["huge", "1,200 posts"]];
  return `(() => {
  const bar = document.createElement("div");
  bar.style.cssText = "position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:100;display:flex;gap:2px;padding:3px;border-radius:999px;background:#e5e5e5;font:12px/1 system-ui,sans-serif;box-shadow:0 1px 3px rgb(0 0 0/.15)";
  for (const [name, label] of ${JSON.stringify(states)}) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    const on = name === ${JSON.stringify(active)};
    b.style.cssText = "border:0;border-radius:999px;padding:6px 10px;cursor:pointer;color:#111;white-space:nowrap;background:" + (on ? "#fff;box-shadow:0 1px 2px rgb(0 0 0/.2)" : "transparent");
    b.onclick = async () => {
      await fetch("/dev-fixture", { method: "POST", body: JSON.stringify({ name }) });
      location.assign("/");
    };
    bar.append(b);
  }
  document.body.append(bar);
})();`;
}

export async function POST(request: Request) {
  const { name } = (await request.json()) as { name: string };
  if (!NAMES.includes(name as (typeof NAMES)[number])) return new Response("unknown fixture", { status: 400 });
  if (name === "demo") fs.rmSync(MARKER, { force: true });
  else fs.writeFileSync(MARKER, name);
  if (name === "huge") writeHuge();
  // Touch the module that lists posts so `next dev` recompiles it and recomputes the post
  // routes (generateStaticParams); otherwise posts only in the new fixture would 404.
  const lib = path.join(process.cwd(), "lib", "writing.ts");
  const now = new Date();
  fs.utimesSync(lib, now, now);
  return Response.json({ name });
}

// 1,200 posts over five years: the realistic upper bound for an unpaginated list.
function writeHuge() {
  const dir = path.join(process.cwd(), "content", "fixtures", "huge");
  if (fs.existsSync(dir)) return;
  fs.mkdirSync(dir, { recursive: true });
  const start = Date.UTC(2022, 0, 1);
  for (let i = 0; i < 1200; i++) {
    const date = new Date(start + i * 1.5 * 86400000).toISOString().slice(0, 10);
    fs.writeFileSync(
      path.join(dir, `post-${String(i).padStart(4, "0")}.md`),
      `---\ntitle: "Weekly notes ${i + 1}: ${["profiling the renderer", "a long afternoon with CUDA graphs and stream-ordered allocation", "notes", "reading group: 3DGS follow-ups"][i % 4]}"\ndescription: "Post ${i + 1}."\ndate: "${date}"\ntags: ["notes"]\n---\n\nBody ${i + 1}.\n`,
    );
  }
}
