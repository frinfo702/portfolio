"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

export default function Projects() {
  const [isDark, setIsDark] = useState(true)
  const sectionsRef = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up")
          }
        })
      },
      { threshold: 0.3, rootMargin: "0px 0px -20% 0px" },
    )

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section)
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  const projects = [
    {
      title: "Machine Learning for Climate Prediction",
      description:
        "Deep learning models for predicting regional climate patterns using satellite data and historical weather records.",
      tech: ["Python", "TensorFlow", "Pandas", "Jupyter"],
      year: "2024",
      githubUrl: "https://github.com/username/climate-prediction",
      linkUrl: "https://climate-research.example.com",
    },
    {
      title: "Natural Language Processing for Medical Texts",
      description:
        "Automated extraction and analysis of clinical information from medical literature using transformer models.",
      tech: ["Python", "BERT", "spaCy", "PyTorch"],
      year: "2024",
      githubUrl: "https://github.com/username/medical-nlp",
    },
    {
      title: "Computer Vision for Microscopy Analysis",
      description:
        "Automated cell detection and classification in microscopy images for biological research applications.",
      tech: ["Python", "OpenCV", "YOLO", "Matplotlib"],
      year: "2023",
      linkUrl: "https://microscopy-analysis.example.com",
    },
    {
      title: "Graph Neural Networks for Drug Discovery",
      description:
        "Molecular property prediction using graph-based deep learning for pharmaceutical compound analysis.",
      tech: ["Python", "PyTorch Geometric", "RDKit", "NetworkX"],
      year: "2023",
      githubUrl: "https://github.com/username/drug-discovery-gnn",
      linkUrl: "https://drug-discovery.example.com",
    },
    {
      title: "Time Series Analysis of Financial Markets",
      description: "Statistical modeling and forecasting of market volatility using advanced econometric methods.",
      tech: ["R", "Python", "ARIMA", "GARCH"],
      year: "2023",
    },
    {
      title: "Quantum Computing Simulation Framework",
      description: "Development of quantum circuit simulators for testing quantum algorithms on classical hardware.",
      tech: ["Python", "Qiskit", "NumPy", "Cirq"],
      year: "2022",
      githubUrl: "https://github.com/username/quantum-simulator",
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <main className="min-h-screen max-w-4xl mx-auto px-6 sm:px-8 lg:px-16 flex flex-col">
        {/* Navigation */}
        <nav className="py-8 border-b border-border/50">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-light hover:text-muted-foreground transition-colors">
              Homepage
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/work" className="text-muted-foreground hover:text-foreground transition-colors">
                Work
              </Link>
              <span className="text-foreground">Projects</span>
              <Link href="/links" className="text-muted-foreground hover:text-foreground transition-colors">
                Links
              </Link>
            </div>
          </div>
        </nav>

        {/* Projects Section */}
        <section ref={(el) => (sectionsRef.current[0] = el)} className="flex-1 flex items-center py-16 sm:py-20 opacity-0">
          <div className="space-y-12 sm:space-y-16 w-full">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h1 className="text-4xl sm:text-5xl font-light">Research Projects</h1>
              <div className="text-sm text-muted-foreground font-mono">Academic & Applied Research</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {projects.map((project, index) => (
                <div
                  key={index}
                  className="group p-6 border border-border rounded-lg hover:border-muted-foreground/50 transition-all duration-300 hover:shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium group-hover:text-muted-foreground transition-colors duration-300">
                        {project.title}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        <span>{project.year}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground leading-relaxed text-sm">{project.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 text-xs border border-border rounded text-muted-foreground group-hover:border-muted-foreground/50 transition-colors duration-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {(project.githubUrl || project.linkUrl) && (
                    <div className="flex items-center gap-3 pt-2">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 text-xs border border-border rounded hover:border-muted-foreground/50 hover:bg-muted/20 transition-all duration-300"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                          GitHub
                        </a>
                      )}
                      {project.linkUrl && (
                        <a
                          href={project.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 text-xs border border-border rounded hover:border-muted-foreground/50 hover:bg-muted/20 transition-all duration-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          Link
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="py-12 sm:py-16 border-t border-border">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">© 2025 Kenichiro Goto. All rights reserved.</div>
              <div className="text-xs text-muted-foreground">Built with v0.dev by Kenichiro Goto</div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="group p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <svg
                    className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414 0zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              <button className="group p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300">
                <svg
                  className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"></div>
    </div>
  )
}
