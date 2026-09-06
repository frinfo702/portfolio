import SiteFrame from "./components/SiteFrame";

export default function Home() {
  return (
    <SiteFrame active="about">
      <section className="intro-section">
        <p>
          I&apos;m a software engineer and computer-vision researcher based in
          Japan. I&apos;m currently studying Information Science and Engineering at{" "}
          <a href="https://www.ritsumei.ac.jp/" target="_blank" rel="noreferrer">
            Ritsumeikan University
          </a>
          , where I work on diffusion models, open-vocabulary detection, and
          deep learning.
        </p>
        <p>
          I&apos;ve worked at{" "}
          <a href="https://www.pixiv.co.jp/" target="_blank" rel="noreferrer">
            pixiv
          </a>
          ,{" "}
          <a href="https://www.cyberagent.co.jp/" target="_blank" rel="noreferrer">
            CyberAgent
          </a>
          , and{" "}
          <a href="https://plaid.co.jp/" target="_blank" rel="noreferrer">
            PLAID
          </a>
          , building backend systems, infrastructure, and agentic
          systems with exceptional teammates.
        </p>
        <p>
          I mostly write Go and Scala for production, and Python and PyTorch
          for research. I also enjoy building things from first principles,
          such as <a href="https://github.com/frinfo702/mompiler">mompiler</a>,
          a small C compiler. See my <a href="/resume/kenichiro_goto.pdf">resume</a>{" "}
          for more detail. I write about software, machine learning, and
          learning here.
        </p>
      </section>
    </SiteFrame>
  );
}
