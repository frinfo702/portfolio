import type { Metadata } from "next";
import "highlight.js/styles/github-dark-dimmed.css";
import "katex/dist/katex.min.css";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
