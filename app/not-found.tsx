import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="not-found-code">404</p>
      <h1>This page doesn&apos;t exist.</h1>
      <p>The link may be old, or the page may have moved.</p>
      <Link className="article-back" href="/">
        Back home
      </Link>
    </section>
  );
}
