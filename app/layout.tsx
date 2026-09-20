import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import SiteFrame from "./components/SiteFrame";

export const metadata: Metadata = {
  title: "Kenichiro Goto | Software Engineer",
  description:
    "Personal portfolio of Kenichiro Goto, a software engineer and machine-learning researcher.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
