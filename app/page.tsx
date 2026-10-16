import Link from "next/link";
import NightScene from "./components/scene/NightScene";
import { getWritingPosts, stampDate } from "../lib/writing";

export default function Home() {
  const posts = getWritingPosts();

  return (
    <>
      <h1 className="visually-hidden">Kenichiro Goto</h1>
      <NightScene />
      <section className="writing" id="writing" aria-labelledby="writing-title">
        <h2 id="writing-title">Writing</h2>
        <ol>
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/writing/${post.slug}`}>
                <time dateTime={post.date}>{stampDate(post.date)}</time>
                <strong>{post.title}</strong>
                <span>{post.description}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
