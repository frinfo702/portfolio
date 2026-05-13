import Image from "next/image";
import ParticleField from "./components/ParticleField";

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center bg-black font-sans text-[#e5e5e5]">
      <ParticleField />
      <main className="relative z-10 flex flex-col w-full max-w-xl px-6 py-20 sm:px-8">
        <header className="flex items-center justify-between mb-16">
          <h1 className="text-base font-semibold text-white">Kenichiro Goto</h1>
        </header>

        <section className="flex flex-col gap-6 text-[15px] leading-7 text-[#a3a3a3]">
          <p>
            I&apos;m a final-year Information Science and Engineering student at
            Ritsumeikan University, where I work in the Nishikawa Laboratory on
            generative AI research. Alongside my studies, I&apos;ve worked on
            backend and infrastructure systems at{" "}
            <DottedLink href="https://www.cyberagent.co.jp/">
              CyberAgent
            </DottedLink>{" "}
            and <DottedLink href="https://www.pixiv.co.jp/">pixiv</DottedLink>.
          </p>
          <p>
            My interests span deep learning, distributed systems, and building
            software that works reliably at scale. Recently, I&apos;ve been
            especially interested in coding agents, practical machine learning
            systems, and the infrastructure behind them. I scored 855 on the
            TOEIC L&amp;R as well.
          </p>
        </section>

        <Section title="Projects">
          <ItemLink href="https://github.com/frinfo702/codex">codex</ItemLink>
          <ItemLink href="https://github.com/frinfo702/english-test-generator">
            english-test-generator
          </ItemLink>
          <ItemLink href="https://github.com/frinfo702/myquartz">
            myquartz
          </ItemLink>
        </Section>

        <Section title="Lately">
          <LatelyItem
            src="/BTS_-_Arirang_(cover).png"
            alt="BTS - 2.0"
            title="2.0"
            subtitle="BTS"
          />
          <LatelyItem
            src="/jjk-season3.png"
            alt="Jujutsu Kaisen season 3"
            title="Jujutsu Kaisen"
            subtitle="Season 3"
          />
        </Section>

        <section className="mt-10 text-[15px] leading-7 text-[#a3a3a3]">
          <p>
            You can find me online, view my{" "}
            <DottedLink href="resume/en.pdf">resume</DottedLink>, browse my{" "}
            <DottedLink href="https://github.com/frinfo702">GitHub</DottedLink>,
            or send me an{" "}
            <DottedLink href="mailto:frinfo702@gmail.com">email</DottedLink>.
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

function LatelyItem({
  src,
  alt,
  title,
  subtitle,
}: {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="h-10 w-10 rounded object-cover shrink-0"
      />
      <div className="flex flex-col text-sm">
        <span className="text-[#e5e5e5]">{title}</span>
        <span className="text-[#737373]">{subtitle}</span>
      </div>
    </li>
  );
}
