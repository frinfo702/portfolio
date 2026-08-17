import type { Metadata } from "next";
import Image from "next/image";
import SiteFrame from "../components/SiteFrame";

export const metadata: Metadata = {
  title: "Misc | Kenichiro Goto",
  description: "Miscellany from Kenichiro Goto.",
};

const lately = [
  {
    src: "/yomi_no_tsugai.jpeg",
    alt: "Yomi no Tsugai",
    title: "Yomi no Tsugai",
    detail: "Season 1",
  },
  {
    src: "/jjk-season3.png",
    alt: "Jujutsu Kaisen season 3",
    title: "Jujutsu Kaisen",
    detail: "Season 3",
  },
  {
    src: "/redred.png",
    alt: "REDRED by CORTIS",
    title: "REDRED",
    detail: "CORTIS",
  },
] as const;

export default function MiscPage() {
  return (
    <SiteFrame active="misc">
      <h2 className="page-heading">Miscellany</h2>
      <p className="page-lede">Things I have been enjoying lately.</p>
      <ul className="lately-list misc-list">
        {lately.map((item) => (
          <li key={item.title}>
            <Image
              src={item.src}
              alt={item.alt}
              width={40}
              height={40}
              className="lately-cover"
            />
            <span>{item.title}</span>
            <span className="lately-detail">{item.detail}</span>
          </li>
        ))}
      </ul>
    </SiteFrame>
  );
}
