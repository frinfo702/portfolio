import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

type OgFont = {
  name: string;
  data: Buffer;
  style: "normal";
  weight: 400;
};

let fontsPromise: Promise<OgFont[]> | null = null;

function loadFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    const fontDir = join(
      process.cwd(),
      "node_modules/geist/dist/fonts",
    );

    fontsPromise = Promise.all([
      readFile(join(fontDir, "geist-sans/Geist-Regular.ttf")),
      readFile(join(fontDir, "geist-mono/GeistMono-Regular.ttf")),
    ]).then(([sans, mono]) => [
      { name: "Geist", data: sans, style: "normal", weight: 400 },
      { name: "Geist Mono", data: mono, style: "normal", weight: 400 },
    ]);
  }

  return fontsPromise;
}

export async function renderOgImage({
  label,
  title,
  footer,
}: {
  label: string;
  title: string;
  footer: string;
}) {
  const fonts = await loadFonts();
  const titleSize = title.length > 48 ? 56 : title.length > 28 ? 68 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 72px 56px",
          backgroundColor: "#ffffff",
          color: "#0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 26,
              letterSpacing: 4,
            }}
          >
            KENICHIRO GOTO
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist Mono",
              fontSize: 20,
              letterSpacing: 3,
              color: "#6b7075",
            }}
          >
            PORTFOLIO
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              marginBottom: 24,
              fontFamily: "Geist Mono",
              fontSize: 20,
              letterSpacing: 4,
              color: "#6b7075",
            }}
          >
            {label.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 1000,
              fontFamily: "Geist",
              fontSize: titleSize,
              letterSpacing: -2,
              lineHeight: 1.12,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
            paddingTop: 24,
            borderTop: "1px solid #e6e8eb",
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: 760,
              fontFamily: "Geist",
              fontSize: 24,
              lineHeight: 1.4,
              color: "#1c1d1f",
            }}
          >
            {footer}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist Mono",
              fontSize: 20,
              color: "#9a9fa5",
            }}
          >
            KENICHIROG.COM
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
    },
  );
}
