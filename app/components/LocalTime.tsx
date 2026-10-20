"use client";

import { useEffect, useState } from "react";

const format = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Tokyo",
});

// Live clock in Japan, with a small face that dozes off at night.
export default function LocalTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return <p className="local-time">&nbsp;</p>;
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Tokyo" }).format(now));
  const asleep = hour < 7 || hour >= 23;

  return (
    <p className="local-time">
      {format.format(now).replace(" ", "").toLowerCase()} in Japan
      <span className="local-face" aria-hidden="true" data-asleep={asleep}>
        {asleep ? "(-.-)" : "(·.·)"}
      </span>
    </p>
  );
}
