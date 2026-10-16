import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "katex/dist/katex.min.css";
import "./globals.css";
import SiteFrame from "./components/SiteFrame";

export const metadata: Metadata = {
  title: "Kenichiro Goto | Software Engineer",
  description:
    "Kenichiro Goto: software engineer and computer-vision researcher in Japan. Backend systems, infrastructure, and research on diffusion models and open-vocabulary detection.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
