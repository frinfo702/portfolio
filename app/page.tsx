const experiences = [
  {
    period: "2025 Jun - Current",
    role: "Backend Engineer (Internship)",
    company: "pixiv Inc.",
    logo: "/logos/pixiv.png",
    logoAlt: "pixiv logo",
    summary:
      "Built payment-related backend features in the Financial Services team.",
    stack: "Scala3 / Play Framework / MySQL / JavaScript",
  },
  {
    period: "2025 Aug - 2025 Sep",
    role: "Backend Engineer (Internship)",
    company: "CyberAgent, Inc. Abema Division.",
    logo: "/logos/cyberagent.png",
    logoAlt: "CyberAgent logo",
    summary:
      "Implemented a load-testing platform for large-scale live streaming events.",
    stack: "Go / Terraform / GCP / GKE / Kubernetes",
  },
  {
    period: "2025 May - 2025 Jun",
    role: "Software Engineer (Internship)",
    company: "Finatext Holdings Ltd.",
    logo: "/logos/finatext.png",
    logoAlt: "Finatext logo",
    summary:
      "Developed internal tools for data analysis and financial operations.",
    stack: "Go / AWS / MySQL",
  },
  {
    period: "2024 Jul - 2025 Jul",
    role: "Data Annotator (Contract)",
    company: "Outlier",
    logo: "/logos/outlier.svg",
    logoAlt: "Outlier logo",
    summary: "Contributed high-quality data labeling for ML workflows.",
    stack: "Data QA / Annotation",
  },
];

const projects = [
  {
    title: "mompiler",
    description:
      "A small compiler implemented in C, built as a learning project covering lexical analysis, parsing, and code generation.",
    stack: "C / Compiler / Parser / Code Generator",
    links: [
      { label: "GitHub", href: "https://github.com/frinfo702/mompiler" },
    ],
  },
];

export default function Home() {
  return (
    <main className="page">
      <header className="site-header">
        <p className="site-kicker">Kenichiro Goto</p>
        <h1 className="site-title">Portfolio</h1>
        <nav className="site-nav" aria-label="Section navigation">
          <a href="#about">About</a>
          <a href="#experience">Experience</a>
          <a href="#projects">Projects</a>
          <a href="#links">Links</a>
        </nav>
      </header>

      <section id="about" className="section">
        <h2>About</h2>
        <p>
          Backend-focused engineer and undergraduate student in Japan. I work on
          practical systems, research-driven development, and reliable
          infrastructure.
        </p>
      </section>

      <section id="experience" className="section">
        <h2>Experience</h2>
        <ul className="experience-list">
          {experiences.map((experience) => (
            <li key={`${experience.company}-${experience.period}`}>
              <article className="experience-item">
                <div className="logo-box">
                  <img
                    src={experience.logo}
                    alt={experience.logoAlt}
                    width={56}
                    height={56}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="experience-content">
                  <p className="experience-meta">{experience.period}</p>
                  <h3>{experience.role}</h3>
                  <p className="company-name">{experience.company}</p>
                  <p>{experience.summary}</p>
                  <p className="stack">{experience.stack}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section id="projects" className="section">
        <h2>Projects</h2>
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.title} className="project-item">
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <p className="stack">{project.stack}</p>
              <p className="project-links">
                {project.links.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 ? " / " : ""}
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section id="links" className="section">
        <h2>Links</h2>
        <ul className="plain-list">
          <li>
            Email:{" "}
            <a href="mailto:kenichiro3114@gmail.com">kenichiro3114@gmail.com</a>
          </li>
          <li>
            GitHub:{" "}
            <a
              href="https://github.com/frinfo702"
              target="_blank"
              rel="noreferrer"
            >
              github.com/frinfo702
            </a>
          </li>
          <li>
            LinkedIn:{" "}
            <a
              href="https://www.linkedin.com/in/frinfo702/"
              target="_blank"
              rel="noreferrer"
            >
              linkedin.com/in/frinfo702
            </a>
          </li>
          <li>
            Blog:{" "}
            <a
              href="https://blog.frinfo.live/"
              target="_blank"
              rel="noreferrer"
            >
              blog.frinfo.live
            </a>
          </li>
        </ul>
      </section>

      <footer className="site-footer">
        <small>© 2026 Kenichiro Goto</small>
      </footer>
    </main>
  );
}
