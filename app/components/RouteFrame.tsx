"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const SiteFrame = dynamic(() => import("./SiteFrame"));

export default function RouteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname === "/" ? children : <SiteFrame>{children}</SiteFrame>;
}
