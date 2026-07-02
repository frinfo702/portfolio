"use client";

import { useEffect, useState } from "react";

/**
 * Classic Mac menu bar (System 7 style) with a live clock on the right.
 * Decorative menu items — kept as plain text, not interactive — so they read
 * naturally to screen readers without aria-label noise.
 */
export default function MenuBar() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000 * 20);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mac-menubar flex items-center justify-between px-2 py-1">
      <nav className="flex items-center gap-0" aria-label="Menu bar">
        <span className="mac-menubar-item font-semibold"> portfolio </span>
        <span className="mac-menubar-item">File</span>
        <span className="mac-menubar-item">Edit</span>
        <span className="mac-menubar-item">View</span>
        <span className="mac-menubar-item">Go</span>
        <span className="mac-menubar-item">Help</span>
      </nav>
      <span
        className="mac-menubar-item tabular-nums"
        aria-label="Current time"
      >
        {time || "--:--"}
        {time ? " PM" : ""}
      </span>
    </div>
  );
}
