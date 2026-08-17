import SiteFrame from "./components/SiteFrame";

const skills = [
  {
    label: "Domains",
    items: [
      "Machine Learning",
      "Computer Vision",
      "Software Engineering",
      "Systems Architecture",
      "Infrastructure",
    ],
  },
  { label: "Languages", items: ["Go", "Scala", "Python", "Shell"] },
  {
    label: "Frameworks",
    items: ["Echo", "Play Framework", "PyTorch"],
  },
  { label: "Cloud", items: ["GCP", "AWS"] },
  {
    label: "Tools",
    items: ["Git", "Docker", "Terraform", "Linux", "vim", "helix"],
  },
  { label: "Databases", items: ["MySQL", "PostgreSQL", "SQLite"] },
] as const;

export default function Home() {
  return (
    <SiteFrame active="about">
      <section className="intro-section">
        <p>
          I&apos;m a software engineer and machine-learning researcher based in
          Japan. I build backend and infrastructure systems by day and study
          deep learning and computer vision by night.
        </p>
        <p>
          I&apos;m currently studying Information Science and Engineering at{" "}
          <a href="https://www.ritsumei.ac.jp/" target="_blank" rel="noreferrer">
            Ritsumeikan University
          </a>
          , where I&apos;m part of the Computational Intelligence Lab.
        </p>
        <p>
          Most of my production work is in Go, Scala, and cloud infrastructure.
          My research work uses Python and PyTorch. I care about systems that
          are simple to operate and ideas that are explained clearly.
        </p>
      </section>

      <PortfolioSection title="Experience">
        <Entry
          title="Software Engineer Internship"
          subtitle="Backend and Infrastructure"
          organization="CyberAgent"
          href="https://www.cyberagent.co.jp/"
          period="Aug - Sep 2025"
          description="Worked on backend and infrastructure systems."
        />
        <Entry
          title="Software Engineer Internship"
          subtitle="Backend"
          organization="pixiv Inc."
          href="https://www.pixiv.co.jp/"
          period="Jun 2025 - Present"
          description="Building and operating backend services and infrastructure."
        />
        <Entry
          title="Software Engineer Internship"
          subtitle="Backend"
          organization="Finatext Holdings Ltd."
          href="https://finatext.com/"
          period="Jan - May 2025"
          description="Worked on backend and infrastructure systems."
        />
      </PortfolioSection>

      <PortfolioSection title="Education">
        <Entry
          title="B.E. Information Science and Engineering"
          organization="Ritsumeikan University"
          href="https://www.ritsumei.ac.jp/"
          period="2023 - 2027"
          description="Computational Intelligence Lab, computer vision research."
        />
      </PortfolioSection>

      <PortfolioSection title="Accomplishments">
        <Entry
          title="Saionji Memorial Scholarship"
          organization="Ritsumeikan University"
          href="https://www.ritsumei.ac.jp/"
          period="Jul 2026"
          description="$2,000 scholarship for excellent grades."
        />
        <Entry
          title="TOEIC L&R"
          organization="ETS"
          href="https://www.ets.org/toeic/"
          period="Apr 2026"
          description="Score 855"
        />
        <Entry
          title="TOEFL ITP"
          organization="ETS"
          href="https://www.ets.org/toefl/"
          period="Jun 2026"
          description="Score 567"
        />
      </PortfolioSection>

      <PortfolioSection title="Skills">
        <div className="skill-groups">
          {skills.map((group) => (
            <div className="skill-group" key={group.label}>
              <h3>{group.label}</h3>
              <p>{group.items.join(" · ")}</p>
            </div>
          ))}
        </div>
      </PortfolioSection>

      <PortfolioSection title="Work">
        <ul className="link-list">
          <LinkItem
            href="https://github.com/frinfo702/english-test-generator"
            title="English Test Generator"
            description="Tools for generating English test materials."
            external
          />
          <LinkItem
            href="/resume/kenichiro_goto.pdf"
            title="Resume"
            description="A printable overview of my experience and education."
          />
        </ul>
      </PortfolioSection>
    </SiteFrame>
  );
}

function PortfolioSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="portfolio-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Entry({
  title,
  subtitle,
  organization,
  href,
  period,
  description,
}: {
  title: string;
  subtitle?: string;
  organization: string;
  href: string;
  period: string;
  description: string;
}) {
  return (
    <article className="entry">
      <div className="entry-copy">
        <h3>{title}</h3>
        {subtitle && <p className="entry-subtitle">{subtitle}</p>}
        <p className="entry-description">{description}</p>
        <a href={href} target="_blank" rel="noreferrer">
          {organization}
        </a>
      </div>
      <time>{period}</time>
    </article>
  );
}

function LinkItem({
  href,
  title,
  description,
  external = false,
}: {
  href: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        <span>{title}</span>
        <small>{description}</small>
      </a>
    </li>
  );
}
