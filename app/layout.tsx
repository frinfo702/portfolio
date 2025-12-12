import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const geist = GeistSans;

export const metadata: Metadata = {
  title: "Ken's website and hub",
  description:
    "personal portfolio Kenichiro Goto who is known as SWE, research stuednt.",
  icons: {
    icon: "favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
