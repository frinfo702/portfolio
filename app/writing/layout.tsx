import type { Metadata } from "next";
import "./writing.css";

export const metadata: Metadata = {
  title: "Writing — Kenichiro Goto",
  description: "Guides and long-form writing by Kenichiro Goto.",
};

export default function WritingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="writing-root">{children}</div>;
}
