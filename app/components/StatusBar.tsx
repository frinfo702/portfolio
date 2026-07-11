"use client";

/** Bottom strip — CAD status only (no ML metrics). */
export default function StatusBar() {
  return (
    <footer
      className="relative z-30 flex h-7 shrink-0 items-center gap-3 overflow-x-auto border-t border-line bg-black px-3 font-mono text-[11px] text-[#3a3a3a]"
      aria-hidden="true"
    >
      <span>
        viewport <span className="text-[#4a4a4a]">booster</span>
      </span>
      <span className="text-[#1a1a1a]">|</span>
      <span>
        shade <span className="text-[#4a4a4a]">ssaa</span>
      </span>
      <span className="hidden sm:inline">
        units <span className="text-[#4a4a4a]">m</span>
      </span>
      <span className="flex-1" />
      <span>
        fps <span className="text-[#4a4a4a]">live</span>
      </span>
    </footer>
  );
}
