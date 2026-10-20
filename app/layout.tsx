import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import SiteFrame from "./components/SiteFrame";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Kenichiro Goto",
  description:
    "Kenichiro Goto.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0e10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${GeistMono.variable}`}>
      <body>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
