"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type MotionPath } from "motion/react";
import { arc } from "motion";

const PAGES = [
  { href: "/", label: "About" },
  { href: "/writing", label: "Writing" },
  { href: "/misc", label: "Misc" },
] as const;

function activeIndexFor(pathname: string) {
  return PAGES.findIndex((page) =>
    page.href === "/" ? pathname === "/" : pathname.startsWith(page.href)
  );
}

type DotTarget = { x: number; path: MotionPath | null };

export default function BounceNav() {
  const pathname = usePathname();
  const activeIndex = Math.max(0, activeIndexFor(pathname));
  const reduceMotion = useReducedMotion();

  const navRef = useRef<HTMLElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const prevX = useRef<number | null>(null);
  const [dot, setDot] = useState<DotTarget | null>(null);

  useEffect(() => {
    const item = itemRefs.current[activeIndex];
    const marker = dotRef.current;
    if (!item || !marker) return;

    const x = item.offsetLeft + item.offsetWidth / 2 - marker.offsetWidth / 2;
    const fromX = prevX.current;
    prevX.current = x;

    if (fromX === null || fromX === x || reduceMotion) {
      setDot({ x, path: null });
      return;
    }

    const delta = x - fromX;
    setDot({
      x,
      path: arc({
        strength: Math.min(0.8, 14 / Math.abs(delta)),
        direction: delta > 0 ? "ccw" : "cw",
      }),
    });
  }, [activeIndex, reduceMotion]);

  return (
    <nav ref={navRef} className="site-nav" aria-label="Primary navigation">
      <motion.span
        ref={dotRef}
        className="nav-bounce-dot"
        aria-hidden="true"
        initial={false}
        animate={{ x: dot?.x ?? 0, opacity: dot ? 1 : 0 }}
        transition={
          dot?.path
            ? { duration: 0.35, ease: "easeOut", path: dot.path }
            : { duration: 0 }
        }
      />
      {PAGES.map((page, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={page.href}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            href={page.href}
            className={active ? "nav-link active" : "nav-link"}
            aria-current={active ? "page" : undefined}
          >
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
