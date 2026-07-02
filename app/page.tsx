import Image from "next/image";
import NeuralNetworkMini from "./components/NeuralNetworkMini";
import MenuBar from "./components/MenuBar";
import StatusBar from "./components/StatusBar";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <MenuBar />

      {/* Desktop: 50% dither + ambient cyan "data-flow" glow (Mac × ML fusion) */}
      <div className="mac-desktop relative flex flex-1 flex-col items-center px-3 py-6 sm:px-4 sm:py-10">
        <div className="mac-window relative z-10 w-full max-w-2xl">
          {/* Title bar — woven stripes, System 7 active window */}
          <div className="mac-titlebar flex items-center gap-2 px-2 py-1.5">
            <span className="mac-widget mac-widget-close" aria-hidden="true" />
            <span className="mac-widget" aria-hidden="true" />
            <span className="mac-widget" aria-hidden="true" />
            <span className="ml-1 text-[17px] leading-none tracking-wide">
              portfolio — read me
            </span>
          </div>

          {/* Content area — inset bevel, near-white surface */}
          <div className="mac-content flex flex-col">
            {/* Hero: identity + neural-net CRT panel */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-[1fr_240px]">
              <div className="flex flex-col justify-center gap-2.5 p-5 sm:p-6">
                <h1 className="font-retro text-3xl leading-none text-black sm:text-4xl">
                  Kenichiro Goto
                </h1>
                <p className="text-[13px] leading-relaxed text-mac-text-2">
                  Software engineer &amp; machine-learning researcher.
                  Backend &amp; infrastructure by day, deep learning by night.
                </p>
              </div>
              <div className="mac-crt mx-auto flex w-full max-w-[280px] flex-col sm:mx-0 sm:max-w-none">
                <div
                  className="flex items-center justify-between border-b border-black/60 px-2 py-1 font-retro text-[14px] leading-none"
                  style={{ color: "#4cc9d4" }}
                  aria-hidden="true"
                >
                  <span>nn.viz</span>
                  <span className="text-[11px] opacity-70">forward pass</span>
                </div>
                <div className="flex flex-1 items-center justify-center p-2">
                  <NeuralNetworkMini />
                </div>
              </div>
            </div>

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
            description="Major in Computer Science. Computational Intelligence Lab, computer vision research."
          />
        </Section>

        <Section title="Accomplishments">
          <SubSection title="Honors">
            <Entry
              title="Saionji Memorial Scholarship (西園寺記念奨学金)"
              org="Ritsumeikan University"
              href="https://www.ritsumei.ac.jp/"
              period="Jul 2026"
              description={
                <>
                  <span className="font-semibold text-black">$2,000</span>{" "}
                  scholarship for students with excellent grades.
                </>
              }
            />
          </SubSection>
          <SubSection title="Certification">
            <Entry
              title="TOEIC Listening &amp; Reading Test"
              org="ETS"
              href="https://www.ets.org/toeic/"
              period="Apr 2026"
              description="Score: 855"
            />
            <Entry
              title="TOEFL iTP Test"
              org="ETS"
              href="https://www.ets.org/toefl/"
              period="Jun 2026"
              description="Score: 567"
            />
          </SubSection>
          <SubSection title="Publications" />
        </Section>

        <Section title="Skills">
          <SkillGroup label="Domains">
            <SkillItem>Machine Learning</SkillItem>
            <SkillItem>Computer Vision</SkillItem>
            <SkillItem>Software Engineering</SkillItem>
            <SkillItem>Systems architecture</SkillItem>
            <SkillItem>Infrastructure</SkillItem>
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
            <SkillItem>Terraform</SkillItem>
            <SkillItem>Linux　(commands)</SkillItem>
            <SkillItem>vim</SkillItem>
            <SkillItem>helix🧬</SkillItem>
          </SkillGroup>
          <SkillGroup label="Databases">
            <SkillItem>MySQL</SkillItem>
            <SkillItem>PostgreSQL</SkillItem>
            <SkillItem>SQLite</SkillItem>
          </SkillGroup>
        </Section>

        <Section title="Projects">
          <ItemLink href="https://github.com/frinfo702/english-test-generator">
            english-test-generator
          </ItemLink>
        </Section>

        <Section title="Lately">
          <LatelyItem
            src="/yomi_no_tsugai.jpeg"
            alt="Yomi no Tsuga"
            title="Yomi no Tsugai"
            subtitle="Season 1"
          />
          <LatelyItem
            src="/jjk-season3.png"
            alt="Jujutsu Kaisen season 3"
            title="Jujutsu Kaisen"
            subtitle="Season 3"
          />
          <LatelyItem
            src="/redred.png"
            alt="REDRED"
            title="REDRED"
            subtitle="CORTIS"
          />
        </Section>

        <Section title="Contact">
          <ItemLink href="resume/en.pdf">Resume</ItemLink>
          <ItemLink href="https://github.com/frinfo702">GitHub</ItemLink>
          <ItemLink href="mailto:frinfo702@gmail.com">Email</ItemLink>
        </Section>

            <footer className="mt-8 flex flex-col gap-1 border-t border-black/15 pt-3 text-[12px] text-mac-text-3">
              <span>
                &copy; {new Date().getFullYear()} Kenichiro Goto. All rights
                reserved.
              </span>
            </footer>
          </div>
          {/* /content */}
        </div>
        {/* /window */}
      </div>
      {/* /desktop */}
      <StatusBar />
    </div>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="mac-subtitle px-2 py-0.5 text-base leading-none">
        {title}
      </h3>
      {children && <ul className="flex flex-col gap-3 pl-1">{children}</ul>}
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
    <section className="mt-5 first:mt-0">
      <h2 className="mac-subtitle px-2 py-1 text-lg leading-none">{title}</h2>
      <ul className="flex flex-col gap-3 px-3 py-3">{children}</ul>
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
        <span className="text-sm font-semibold text-black">{title}</span>
        <span className="text-xs text-mac-text-3 shrink-0 tabular-nums">
          {period}
        </span>
      </div>
      <a href={href} className="mac-link text-sm w-fit">
        {org}
      </a>
      <p className="text-[13px] text-mac-text-2 leading-6 mt-0.5">
        {description}
      </p>
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
    <li className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 shrink-0 bg-black"
        aria-hidden="true"
      />
      <a href={href} className="mac-link text-sm">
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
    <li className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-mac-text-3">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">{children}</ul>
    </li>
  );
}

function SkillItem({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="mac-chip">{children}</span>
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
      <div className="mac-frame shrink-0">
        <Image
          src={src}
          alt={alt}
          width={40}
          height={40}
          className="h-10 w-10 object-cover"
        />
      </div>
      <div className="flex flex-col text-sm">
        <span className="font-medium text-black">{title}</span>
        <span className="text-xs text-mac-text-3">{subtitle}</span>
      </div>
    </li>
  );
}
