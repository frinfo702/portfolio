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

type DotTarget = { y: number; path: MotionPath | null };

export default function BounceNav() {
  const pathname = usePathname();
  const activeIndex = Math.max(0, activeIndexFor(pathname));
  const reduceMotion = useReducedMotion();

  const navRef = useRef<HTMLElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const prevY = useRef<number | null>(null);
  const [dot, setDot] = useState<DotTarget | null>(null);

  useEffect(() => {
    const item = itemRefs.current[activeIndex];
    const marker = dotRef.current;
    if (!item || !marker) return;

    const y = item.offsetTop + item.offsetHeight / 2 - marker.offsetWidth / 2;
    const fromY = prevY.current;
    prevY.current = y;

    if (fromY === null || fromY === y || reduceMotion) {
      setDot({ y, path: null });
      return;
    }

    const delta = y - fromY;
    setDot({
      y,
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
        animate={{ y: dot?.y ?? 0, opacity: dot ? 1 : 0 }}
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
            <span className="nav-dot" aria-hidden="true" />
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
