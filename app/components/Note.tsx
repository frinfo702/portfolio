"use client";

import { BotAvatar } from "bot-avatars";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const STROKE = 1;
const RADIUS = 8;
const DASH = 10;
const GAP = 6;

export default function Note({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setSize({ w: el.offsetWidth, h: el.offsetHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <aside ref={ref} className="markdown-note">
      {size && <Frame {...size} />}
      <BotAvatar
        className="markdown-note-ghost"
        type="ghost"
        size={40}
        // Calm while idle: no idle flips, small glances. A click still hops.
        jumpEvery={0}
        turn={0.35}
        aria-hidden
      />
      {children}
    </aside>
  );
}

// CSS `dashed` can't set the dash length, so the border is an SVG rect.
// The perimeter is snapped to a whole number of dash periods so the
// pattern closes without a cut-off dash where the path starts.
function Frame({ w, h }: { w: number; h: number }) {
  const width = w - STROKE;
  const height = h - STROKE;
  const perimeter =
    2 * (width + height) - 8 * RADIUS + 2 * Math.PI * RADIUS;
  const periods = Math.max(1, Math.round(perimeter / (DASH + GAP)));

  return (
    <svg className="markdown-note-frame" width={w} height={h} aria-hidden>
      <rect
        x={STROKE / 2}
        y={STROKE / 2}
        width={width}
        height={height}
        rx={RADIUS}
        fill="none"
        stroke="var(--dim)"
        strokeWidth={STROKE}
        strokeDasharray={`${DASH} ${GAP}`}
        pathLength={periods * (DASH + GAP)}
      />
    </svg>
  );
}
