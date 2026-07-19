import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kenichiro Goto — Portfolio",
  description:
    "Personal portfolio of Kenichiro Goto — software engineer & machine learning researcher.",
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
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-black text-text">
        {children}
      </body>
    </html>
  );
}
