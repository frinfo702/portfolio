import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import RouteFrame from "./components/RouteFrame";

export const metadata: Metadata = {
  title: "Kenichiro Goto",
  description:
    "Kenichiro Goto.",
  icons: {
    icon: "/phase-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RouteFrame>{children}</RouteFrame>
      </body>
    </html>
  );
}
