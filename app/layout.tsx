import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "katex/dist/katex.min.css";
import "./globals.css";
import KatanaBackdrop from "./components/KatanaBackdrop";
import SiteFrame from "./components/SiteFrame";
import ThemeToggle from "./components/ThemeToggle";
import { themeInitScript } from "./components/theme";
import { siteDescription, siteName, siteUrl } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl.toString() }],
  creator: siteName,
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e10" },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      // the init script may set data-theme before React hydrates
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <KatanaBackdrop />
        <ThemeToggle />
        <SiteFrame>{children}</SiteFrame>
        {/* dev only: the Demo / Worst case switch, served by app/dev-fixture/route.dev.ts */}
        {process.env.NODE_ENV === "development" && <script src="/dev-fixture?ui" defer />}
      </body>
    </html>
  );
}
