"use client";

import { useEffect, useState } from "react";

const TREE = [
  { id: "identity", label: "identity" },
  { id: "experience", label: "experience" },
  { id: "education", label: "education" },
  { id: "accomplishments", label: "honors" },
  { id: "skills", label: "skills" },
  { id: "projects", label: "projects" },
  { id: "lately", label: "lately" },
  { id: "contact", label: "contact" },
] as const;

const EXTERNAL = [
  { href: "resume/en.pdf", label: "resume.pdf" },
  { href: "https://github.com/frinfo702", label: "github" },
  { href: "mailto:frinfo702@gmail.com", label: "email" },
] as const;

export default function SideNav() {
  const [active, setActive] = useState<string>("identity");

  useEffect(() => {
    const els = TREE.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -55% 0px", threshold: [0, 0.2, 0.45, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      className="flex h-full flex-col border-b border-line bg-black/90 lg:min-h-[calc(100vh-3.5rem)] lg:border-b-0"
      aria-label="Outliner"
    >
      <div className="sx-panel-label hidden lg:block">Outliner</div>

      <div className="flex flex-row flex-wrap gap-0 px-1 py-1.5 lg:flex-col lg:px-0 lg:py-0">
        <div className="hidden px-3 pb-1 pt-0.5 font-mono text-[12px] text-[#a0a0a0] lg:block">
          <span className="text-[#444]">▾</span> portfolio
          <span className="ml-1 text-[10px] text-[#555]">asm</span>
        </div>

        {TREE.map((s) => {
          const on = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={
                on
                  ? "px-3 py-1.5 font-mono text-[12px] text-[#f0f0f0] lg:bg-[#0c0c0c] lg:shadow-[inset_2px_0_0_#9a9a9a]"
                  : "px-3 py-1.5 font-mono text-[12px] text-[#7a7a7a] transition-colors hover:text-[#c8c8c8]"
              }
            >
              <span className="lg:pl-3">
                <span className="mr-1.5 hidden text-[#555] lg:inline">·</span>
                {s.label}
              </span>
            </a>
          );
        })}
      </div>

      <div className="mt-auto border-t border-line">
        <div className="sx-panel-label hidden lg:block">Links</div>
        <div className="flex flex-row flex-wrap lg:flex-col">
          {EXTERNAL.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 font-mono text-[12px] text-[#6a6a6a] transition-colors hover:text-[#c8c8c8]"
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
