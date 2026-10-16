import Image from "next/image";
import Link from "next/link";
import { SOCIAL_LINKS } from "../lib/external-links";
import { getWritingPosts, logIndex, stampDate } from "../lib/writing";

const telemetry = [
  ["Location", "Japan"],
  ["Affiliation", "Ritsumeikan University"],
  ["Field", "Computer vision"],
  ["Stack", "Go · Scala · Python · PyTorch"],
] as const;

const lately = [
  {
    src: "/bloody_paradise.png",
    title: "Bloody Paradise",
    detail: "THE SIN:BLISS - ENHYPEN",
  },
  {
    src: "/yomi_no_tsugai.jpeg",
    title: "黄泉のツガイ (Yomi no Tsugai)",
    detail: "Season 1",
  },
  {
    src: "/jjk-season3.png",
    title: "呪術廻戦 (Jujutsu Kaisen)",
    detail: "Season 3",
  },
  {
    src: "/redred.png",
    title: "REDRED",
    detail: "CORTIS",
  },
] as const;

export default function Home() {
  const posts = getWritingPosts();

  return (
    <>
      <section className="hero" aria-labelledby="hero-name">
        <div className="hero-neon" aria-hidden="true" />
        <WheelSchematic />
        <div className="hero-copy">
          <p className="kicker">Software engineer / Computer-vision researcher</p>
          <h1 id="hero-name">
            <span>Kenichiro</span> <span>Goto</span>
          </h1>
          <dl className="telemetry">
            {telemetry.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <TelemetryStream entries={posts.length} />
        <div className="ruler" aria-hidden="true" />
      </section>

      <Module index="01" title="Profile" id="profile">
        <div className="prose">
          <p>
            I write software for production and study computer vision for
            research. I&apos;m studying Information Science and Engineering at{" "}
            <a href="https://www.ritsumei.ac.jp/" target="_blank" rel="noreferrer">
              Ritsumeikan University
            </a>
            , where my work covers diffusion models, open-vocabulary detection,
            and deep learning.
          </p>
          <p>
            I like building things from first principles, and I write here
            about software, machine learning, and learning itself.
          </p>
        </div>
      </Module>

      <Module index="02" title="Record" id="record">
        <dl className="spec">
          <div>
            <dt>Industry</dt>
            <dd>
              <ul className="spec-orgs">
                <li>
                  <a href="https://www.pixiv.co.jp/" target="_blank" rel="noreferrer">
                    pixiv
                  </a>
                </li>
                <li>
                  <a href="https://www.cyberagent.co.jp/" target="_blank" rel="noreferrer">
                    CyberAgent
                  </a>
                </li>
                <li>
                  <a href="https://plaid.co.jp/" target="_blank" rel="noreferrer">
                    PLAID
                  </a>
                </li>
              </ul>
              <p>
                Backend systems, infrastructure, and agentic systems, built with
                exceptional teammates.
              </p>
            </dd>
          </div>
          <div>
            <dt>Research</dt>
            <dd>
              <p>
                Information Science and Engineering, Ritsumeikan University.
                Diffusion models, open-vocabulary detection, deep learning.
              </p>
            </dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>
              <p>
                <span className="spec-tag">Production</span> Go, Scala
              </p>
              <p>
                <span className="spec-tag">Research</span> Python, PyTorch
              </p>
            </dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>
              <p>
                <a href="https://github.com/frinfo702/mompiler">mompiler</a>: a
                small C compiler, written from first principles.
              </p>
            </dd>
          </div>
          <div>
            <dt>Resume</dt>
            <dd>
              <p>
                <a href="/resume/kenichiro_goto.pdf">kenichiro_goto.pdf</a>
              </p>
            </dd>
          </div>
        </dl>
      </Module>

      <Module index="03" title="Log" id="writing">
        <p className="module-lede">
          Written by a human, not AI. Some entries are in English as part of my
          own English learning.
        </p>
        <ol className="log-list">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <Link href={`/writing/${post.slug}`}>
                <span className="log-index">{logIndex(posts.length - i)}</span>
                <span className="log-body">
                  <strong>{post.title}</strong>
                  <small>{post.description}</small>
                </span>
                <time dateTime={post.date}>{stampDate(post.date)}</time>
              </Link>
            </li>
          ))}
        </ol>
      </Module>

      <Module index="04" title="Signal" id="misc">
        <p className="module-lede">Currently in rotation.</p>
        <ul className="signal-list">
          {lately.map((item) => (
            <li key={item.title}>
              <Image src={item.src} alt="" width={48} height={48} />
              <span>{item.title}</span>
              <small>{item.detail}</small>
            </li>
          ))}
        </ul>
      </Module>

      <Module index="05" title="Contact" id="contact">
        <ul className="contact-list">
          {SOCIAL_LINKS.map((link) => {
            const external = link.href.startsWith("http");
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  <span>{link.label}</span>
                  <small>{link.href.replace(/^(https:\/\/(www\.)?|mailto:)/, "")}</small>
                </a>
              </li>
            );
          })}
        </ul>
      </Module>
    </>
  );
}

function Module({
  index,
  title,
  id,
  children,
}: {
  index: string;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section className="module" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>
        <span>{index}</span>
        {title}
      </h2>
      <div className="module-body">{children}</div>
    </section>
  );
}

function TelemetryStream({ entries }: { entries: number }) {
  const lines = [
    "SYS // ONLINE",
    "UNIT // K.GOTO",
    "LOC // JAPAN",
    "MODE // ENGINEERING",
    "MODE // RESEARCH",
    "PROD // GO + SCALA",
    "RSCH // PYTHON + PYTORCH",
    "CV // DIFFUSION",
    "CV // OPEN-VOCAB DETECTION",
    `LOG // ${String(entries).padStart(2, "0")} ENTRIES`,
    "BUILD // MOMPILER",
    "STATUS // ACTIVE",
  ];
  return (
    <div className="telemetry-stream" aria-hidden="true">
      <div>
        {[...lines, ...lines].map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>
    </div>
  );
}

const SPOKES = 5;

function WheelSchematic() {
  const spokes = Array.from({ length: SPOKES }, (_, i) => {
    const a = (i * 2 * Math.PI) / SPOKES - Math.PI / 2;
    const point = (r: number, offset: number) =>
      `${(200 + r * Math.cos(a + offset)).toFixed(1)} ${(200 + r * Math.sin(a + offset)).toFixed(1)}`;
    return `M${point(44, -0.32)} L${point(128, -0.12)} M${point(44, 0.32)} L${point(128, 0.12)}`;
  });
  const bolts = Array.from({ length: SPOKES }, (_, i) => {
    const a = (i * 2 * Math.PI) / SPOKES + Math.PI / SPOKES - Math.PI / 2;
    return [200 + 30 * Math.cos(a), 200 + 30 * Math.sin(a)];
  });

  return (
    <svg className="schematic" viewBox="0 0 400 400" aria-hidden="true">
      <g className="schematic-guides">
        <path d="M200 0V400M0 200H400" />
        <circle cx="200" cy="200" r="194" />
      </g>
      <g className="schematic-rotor">
        <circle cx="200" cy="200" r="182" />
        <circle className="schematic-tread" cx="200" cy="200" r="176" />
        <circle cx="200" cy="200" r="168" />
        <circle cx="200" cy="200" r="134" />
        <circle cx="200" cy="200" r="128" />
        <path d={spokes.join(" ")} />
        <circle cx="200" cy="200" r="44" />
        <circle cx="200" cy="200" r="16" />
        {bolts.map(([x, y], i) => (
          <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" />
        ))}
      </g>
      <g className="schematic-notes">
        <path d="M18 392H382M18 386V398M382 386V398" />
        <path d="M200 200L329 71" />
        <text x="334" y="66">R182</text>
        <text x="18" y="16">FIG.01</text>
        <text x="18" y="28">WHEEL / SEC A-A</text>
        <text x="200" y="386" textAnchor="middle">364</text>
      </g>
    </svg>
  );
}
