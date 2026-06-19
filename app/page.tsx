import Image from "next/image";
import FluidField from "./components/FluidField";

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center bg-black font-sans text-[#e5e5e5]">
      <FluidField />
      <main className="relative z-10 flex flex-col w-full max-w-xl px-6 py-20 sm:px-8">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-base font-semibold text-white">
            Kenichiro Goto&apos;s Portfolio
          </h1>
        </header>

        <Section title="Experience">
          <Entry
            title="Software Engineer Internship — Backend & Infrastructure"
            org="CyberAgent"
            href="https://www.cyberagent.co.jp/"
            period="Aug 2025 — Sep 2025"
            description="Worked on backend and infrastructure systems."
          />
          <Entry
            title="Software Engineer Internship — Backend"
            org="pixiv Inc."
            href="https://www.pixiv.co.jp/"
            period="Jun 2025 — Current"
            description="Worked on backend and infrastructure systems."
          />
          <Entry
            title="Software Engineer Internship — Backend"
            org="Finatext Holdings Ltd."
            href="https://finatext.com/"
            period="Jan 2025 — May 2025"
            description="Worked on backend and infrastructure systems."
          />
        </Section>

        <Section title="Education">
          <Entry
            title="B.E. in Information Science and Engineering"
            org="Ritsumeikan University"
            href="https://www.ritsumei.ac.jp/"
            period="Apr 2023 — Mar 2027"
            description="Computational Intelligence Lab, computer vision research."
          />
        </Section>

        <Section title="Achievements">
          <Entry
            title="Saionji Memorial Scholarship (西園寺記念奨学金)"
            org="Ritsumeikan University"
            href="https://www.ritsumei.ac.jp/"
            period="Jul 2026"
            description={
              <>
                <span className="font-semibold text-white">$2,000</span>{" "}
                scholarship for students with excellent grades.
              </>
            }
          />
        </Section>

        <Section title="Projects">
          <ItemLink href="https://github.com/frinfo702/english-test-generator">
            english-test-generator
          </ItemLink>
        </Section>

        <Section title="Skills">
          <SkillGroup label="Domains">
            <SkillItem>Deep learning</SkillItem>
            <SkillItem>Systems architecture &amp; infrastructure</SkillItem>
          </SkillGroup>
          <SkillGroup label="Programming Languages">
            <SkillItem>Go</SkillItem>
            <SkillItem>Scala</SkillItem>
            <SkillItem>Python</SkillItem>
            <SkillItem>Shell</SkillItem>
          </SkillGroup>
          <SkillGroup label="Frameworks">
            <SkillItem>Echo</SkillItem>
            <SkillItem>Play Framework</SkillItem>
            <SkillItem>PyTorch</SkillItem>
          </SkillGroup>
          <SkillGroup label="Cloud">
            <SkillItem>GCP</SkillItem>
            <SkillItem>AWS</SkillItem>
          </SkillGroup>
          <SkillGroup label="Tools">
            <SkillItem>Git</SkillItem>
            <SkillItem>Docker</SkillItem>
            <SkillItem>Linux　(commands)</SkillItem>
          </SkillGroup>
          <SkillGroup label="Databases">
            <SkillItem>MySQL</SkillItem>
            <SkillItem>PostgreSQL</SkillItem>
            <SkillItem>SQLite</SkillItem>
          </SkillGroup>
          <SkillGroup label="Languages">
            <SkillItem>TOEIC Listening &amp; Reading Test 855</SkillItem>
            <SkillItem>TOEFL iTP Test 567</SkillItem>
          </SkillGroup>
          <SkillGroup label="tools">
            <SkillItem>vim❤️‍🔥</SkillItem>
          </SkillGroup>
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

        <Section title="Contact">
          <ItemLink href="resume/en.pdf">Resume</ItemLink>
          <ItemLink href="https://github.com/frinfo702">GitHub</ItemLink>
          <ItemLink href="mailto:frinfo702@gmail.com">Email</ItemLink>
        </Section>

        <footer className="mt-20 flex flex-col gap-1 text-sm text-[#525252]">
          <span className="text-[#525252]">
            &copy; {new Date().getFullYear()} Kenichiro Goto. All rights
            reserved.
          </span>
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
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <ul className="flex flex-col gap-4">{children}</ul>
    </section>
  );
}

function Entry({
  title,
  org,
  href,
  period,
  description,
}: {
  title: string;
  org: string;
  href: string;
  period: string;
  description: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-white font-medium">{title}</span>
        <span className="text-xs text-[#737373] shrink-0">{period}</span>
      </div>
      <a
        href={href}
        className="text-sm text-[#a3a3a3] border-b border-dotted border-[#525252] hover:text-white hover:border-[#a3a3a3] transition-colors w-fit"
      >
        {org}
      </a>
      <p className="text-sm text-[#a3a3a3] leading-6 mt-0.5">{description}</p>
    </li>
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

function SkillGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#737373]">{label}</span>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">{children}</ul>
    </li>
  );
}

function SkillItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-sm text-[#a3a3a3] flex gap-1">
      <span className="text-[#525252]">·</span>
      <span>{children}</span>
    </li>
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
