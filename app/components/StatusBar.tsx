"use client";

import { useEffect, useState } from "react";

/**
 * A System-7-style status strip that, instead of resource meters, shows a
 * playful "model training" readout — the small ML signature that fuses with
 * the classic Mac theme. Numbers drift slowly; pure decoration (aria-hidden).
 */
const SEED = {
  epoch: 42,
  loss: 0.0317,
  lr: 0.001,
};

export default function StatusBar() {
  const [epoch, setEpoch] = useState(SEED.epoch);
  const [loss, setLoss] = useState(SEED.loss);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const id = setInterval(() => {
      setEpoch((e) => e + 1);
      setLoss((l) => Math.max(0.004, l * (0.985 + Math.random() * 0.03)));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const fmtLoss = (n: number) =>
    n >= 0.01 ? n.toFixed(4) : n.toFixed(5);

  return (
    <div
      className="mac-statusbar flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2 py-1 text-[11px] text-black"
      aria-hidden="true"
    >
      <span>
        epoch{" "}
        <span className="tabular-nums font-semibold">{String(epoch).padStart(3, "0")}</span>
      </span>
      <span>
        loss <span className="tabular-nums font-semibold">{fmtLoss(loss)}</span>
      </span>
      <span>
        lr <span className="tabular-nums font-semibold">1e-3</span>
      </span>
      <span className="hidden sm:inline">
        <span style={{ color: "#0a3fb8" }}>●</span> cpu: pytorch · mps
      </span>
      <span className="ml-auto">
        <span className="font-semibold">1,024MB</span> in use
      </span>
    </div>
  );
}
