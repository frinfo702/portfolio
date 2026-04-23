import Image from "next/image";
import arirangImage from "../public/arirang.webp";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-black font-sans text-[#e5e5e5]">
      <main className="flex flex-col w-full max-w-xl px-6 py-20 sm:px-8">
        <header className="flex items-center justify-between mb-16">
          <h1 className="text-base font-semibold text-white">Kenichiro Goto</h1>
        </header>

        <section className="flex flex-col gap-6 text-[15px] leading-7 text-[#a3a3a3]">
          <p>
            I build things at the intersection of infrastructure and AI.
            Currently exploring the frontiers of cloud-based coding agents.
            Previously led core work at{" "}
            <DottedLink href="https://www.cyberagent.co.jp/">
              CyberAgent
            </DottedLink>{" "}
            and <DottedLink href="https://www.pixiv.co.jp/">pixiv</DottedLink>.
          </p>
          <p>
            At the end of the day, I&apos;m still that kid who grew up playing
            with my parents&apos; Macintosh and ripping CDs for my friends.
          </p>
        </section>

        <Section title="Projects">
          <ItemLink href="https://github.com/frinfo702/codex">codex</ItemLink>
          <ItemLink href="https://github.com/frinfo702/cloud-compute-sandbox">
            cloud-compute-sandbox
          </ItemLink>
          <ItemLink href="https://github.com/frinfo702/myquartz">
            myquartz
          </ItemLink>
        </Section>

        <Section title="Recently Played">
          <div className="flex items-center gap-3">
            <Image
              src="/BTS_-_Arirang_(cover).png"
              alt="BTS"
              width={40}
              height={40}
              className="w-10 h-10 rounded object-cover shrink-0"
            />
            <div className="flex flex-col text-sm">
              <span className="text-[#e5e5e5]">2.0</span>
              <span className="text-[#737373]">BTS</span>
            </div>
          </div>
        </Section>

        <section className="mt-10 text-[15px] leading-7 text-[#a3a3a3]">
          <p>
            You can find my{" "}
            <DottedLink href="https://myquartz.frinfo.live/">notes</DottedLink>,{" "}
            <DottedLink href="https://myquartz.frinfo.live/assets/resume/en.pdf">
              resume
            </DottedLink>
            , <DottedLink href="https://github.com/frinfo702">code</DottedLink>,
            or{" "}
            <DottedLink href="https://linkedin.com/in/frinfo702">
              follow me online
            </DottedLink>
            . I also angel invest in startups, so please{" "}
            <DottedLink href="https://linkedin.com/in/frinfo702">
              reach out
            </DottedLink>{" "}
            if interested.
          </p>
        </section>

        <footer className="mt-20 flex items-center justify-between text-sm text-[#525252]">
          <span>
            Kenichiro Goto <span className="text-[#737373]">@frinfo702</span>
          </span>
          <a
            href="https://github.com/frinfo702"
            className="hover:text-[#a3a3a3] transition-colors"
          >
            GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-white mb-3">{title}</h2>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

function ItemLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <span className="text-[#525252] mr-1.5">·</span>
      <a
        href={href}
        className="text-[15px] text-[#a3a3a3] border-b border-dotted border-[#525252] hover:text-white hover:border-[#a3a3a3] transition-colors"
      >
        {children}
      </a>
    </li>
  );
}

function DottedLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-[#a3a3a3] border-b border-dotted border-[#525252] hover:text-white hover:border-[#a3a3a3] transition-colors"
    >
      {children}
    </a>
  );
}
