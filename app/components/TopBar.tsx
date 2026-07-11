"use client";

import { useEffect, useState } from "react";

/** Application chrome — file path + mode + clock. */
export default function TopBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(
        d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "UTC",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-30 flex h-8 shrink-0 items-center justify-between gap-3 border-b border-line bg-black px-3 font-mono text-[12px]">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden text-[#5a5a5a]">
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ok"
          aria-hidden="true"
        />
        <span className="truncate text-[#9a9a9a]">
          goto.sys
          <span className="text-[#333]"> / </span>
          portfolio.asm
        </span>
      </div>
      <div className="hidden items-center gap-3 text-[#666] sm:flex">
        <span>
          view <span className="text-[#9a9a9a]">shaded</span>
        </span>
        <span className="text-[#333]">|</span>
        <span>
          units <span className="text-[#9a9a9a]">m</span>
        </span>
      </div>
      <time
        className="shrink-0 tabular-nums text-[#8a8a8a]"
        dateTime={time || undefined}
      >
        {time ? `${time} UTC` : "—"}
      </time>
    </header>
  );
}
