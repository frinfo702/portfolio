import Link from "next/link";
import { getWritingPosts } from "../lib/writing";

const updated = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Tokyo",
}).format(new Date());

export default function Home() {
  const posts = getWritingPosts();
  const years = Map.groupBy(posts, (post) => post.date.slice(0, 4));

  return (
    <>
      <header className="home-header">
        <h1>Kenichiro Goto</h1>
        <p>Updated {updated}</p>
      </header>

      <section className="intro-section">
        <p>
          I&apos;m a software engineer in Japan, studying Information Science and
          Engineering at{" "}
          <a href="https://www.ritsumei.ac.jp/" target="_blank" rel="noreferrer">
            Ritsumeikan University
          </a>
          .
        </p>
        <p>
          My research is on 3D scene understanding: recognizing objects and the
          spatial relationships between them, with 3D Gaussian Splatting and
          vision-language models.
        </p>
        <p>
          I&apos;ve worked at{" "}
          <a href="https://plaid.co.jp/" target="_blank" rel="noreferrer">
            PLAID
          </a>
          ,{" "}
          <a href="https://www.pixiv.co.jp/" target="_blank" rel="noreferrer">
            pixiv
          </a>
          , and{" "}
          <a href="https://www.cyberagent.co.jp/" target="_blank" rel="noreferrer">
            CyberAgent
          </a>
          , mostly on backend systems and infrastructure.
        </p>
        <p>
          On the side, I build tools for my own workflow, such as{" "}
          <a href="https://github.com/frinfo702/raptor" target="_blank" rel="noreferrer">
            raptor
          </a>
          , a terminal multiplexer built on Ghostty, and{" "}
          <a href="https://github.com/frinfo702/mompiler" target="_blank" rel="noreferrer">
            mompiler
          </a>
          , a small C compiler.
        </p>
        <p>
          You can find me on{" "}
          <a href="https://github.com/frinfo702" target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          and{" "}
          <a href="https://www.linkedin.com/in/frinfo702/" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          , read my <a href="/resume/kenichiro_goto.pdf">resume</a>, or reach me
          via <a href="mailto:me@kenichirog.com">email</a>.
        </p>
      </section>

      <section className="writing" id="writing">
        <h2>Writing</h2>
        {[...years].map(([year, items]) => (
          <div className="writing-year" key={year}>
            <span className="writing-year-label">{year}</span>
            <ol>
              {items.map((post) => (
                <li key={post.slug}>
                  <Link href={`/writing/${post.slug}`}>{post.title}</Link>
                  <time dateTime={post.date}>
                    {post.date.slice(8, 10)}/{post.date.slice(5, 7)}
                  </time>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
    </>
  );
}
