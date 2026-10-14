import Image from "next/image";
import Link from "next/link";
import { formatPostDate, getWritingPosts } from "../lib/writing";

const lately = [
  {
    src: "/bloody_paradise.png",
    alt: "Bloody Paradise",
    title: "Bloody Paradise",
    detail: "THE SIN:BLISS - ENHYPEN",
  },
  {
    src: "/yomi_no_tsugai.jpeg",
    alt: "Yomi no Tsugai",
    title: "黄泉のツガイ (Yomi no Tsugai)",
    detail: "Season 1",
  },
  {
    src: "/jjk-season3.png",
    alt: "Jujutsu Kaisen season 3",
    title: "呪術廻戦 (Jujutsu Kaisen)",
    detail: "Season 3",
  },
  {
    src: "/redred.png",
    alt: "REDRED by CORTIS",
    title: "REDRED",
    detail: "CORTIS",
  },
] as const;

export default function Home() {
  const posts = getWritingPosts();

  return (
    <>
      <section className="intro-section">
        <p>
          I&apos;m a software engineer and computer-vision researcher based in
          Japan. I&apos;m currently studying Information Science and Engineering
          at{" "}
          <a href="https://www.ritsumei.ac.jp/" target="_blank" rel="noreferrer">
            Ritsumeikan University
          </a>
          , where I work on diffusion models, open-vocabulary detection, and deep
          learning.
        </p>
        <p>
          I&apos;ve worked at{" "}
          <a href="https://www.pixiv.co.jp/" target="_blank" rel="noreferrer">
            pixiv
          </a>
          ,{" "}
          <a
            href="https://www.cyberagent.co.jp/"
            target="_blank"
            rel="noreferrer"
          >
            CyberAgent
          </a>
          , and{" "}
          <a href="https://plaid.co.jp/" target="_blank" rel="noreferrer">
            PLAID
          </a>
          , building backend systems, infrastructure, and agentic systems with
          exceptional teammates.
        </p>
        <p>
          I mostly write Go and Scala for production, and Python and PyTorch for
          research. I also enjoy building things from first principles, such as{" "}
          <a href="https://github.com/frinfo702/mompiler">mompiler</a>, a small C
          compiler. See my <a href="/resume/kenichiro_goto.pdf">resume</a> for
          more detail. I write about software, machine learning, and learning
          here.
        </p>
      </section>

      <section className="site-section" id="writing">
        <h2 className="page-heading">Writing</h2>
        <p className="page-lede">
          These pieces are written by a human, not AI. Some are written in
          English as part of my own English learning.
        </p>
        <ol className="writing-list">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/writing/${post.slug}`}>
                <strong>{post.title}</strong>
                <small>{post.description}</small>
              </Link>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            </li>
          ))}
        </ol>
      </section>

      <section className="site-section" id="misc">
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
      </section>
    </>
  );
}
