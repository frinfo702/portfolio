import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from "../lib/og";

export const dynamic = "force-static";

export const alt =
  "Kenichiro Goto — software engineer and computer vision researcher";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    label: "Software engineer · Computer vision",
    title: "Kenichiro Goto",
    footer:
      "3D scene understanding, 3D Gaussian Splatting, and vision-language models.",
  });
}
