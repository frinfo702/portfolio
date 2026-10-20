import { useRef, useState } from "react";
import { lerp, phase } from "./canvas";

export type Chapter = {
  label: string;
  start: number;
  end: number;
  // Pre-rendered HTML (KaTeX allowed) explaining what this chapter shows.
  note: string;
};

export function useChapters(chapters: Chapter[]) {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);

  const update = (time: number) => {
    chapters.forEach((chapter, index) => {
      const fill = fills.current[index];
      if (fill) {
        fill.style.transform = `scaleX(${phase(time, chapter.start, chapter.end)})`;
      }
    });
    let next = 0;
    chapters.forEach((chapter, index) => {
      if (time >= chapter.start) next = index;
    });
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
  };

  return { active, fills, update };
}

type Props = {
  chapters: Chapter[];
  active: number;
  fills: ReturnType<typeof useChapters>["fills"];
  loop: { seek: (time: number) => void; setPaused: (paused: boolean) => void };
};

export function ChapterBar({ chapters, active, fills, loop }: Props) {
  const [paused, setPaused] = useState(false);

  const select = (index: number) => {
    const chapter = chapters[index];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Without motion, jump to the frame where the chapter has played out.
    loop.seek(reduce ? lerp(chapter.start, chapter.end, 0.85) : chapter.start + 0.01);
  };

  return (
    <div className="chapter-bar">
      <button
        type="button"
        className="chapter-toggle"
        aria-label={paused ? "Play" : "Pause"}
        onClick={() => {
          loop.setPaused(!paused);
          setPaused(!paused);
        }}
      >
        {paused ? "▶" : "❚❚"}
      </button>
      <ol>
        {chapters.map((chapter, index) => (
          <li key={chapter.label}>
            <button
              type="button"
              aria-current={index === active ? "step" : undefined}
              onClick={() => select(index)}
            >
              <span className="chapter-track">
                <span
                  className="chapter-fill"
                  ref={(node) => {
                    fills.current[index] = node;
                  }}
                />
              </span>
              <span className="chapter-label">
                <span className="chapter-index">{index + 1}</span>
                {chapter.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ChapterNote({ chapter }: { chapter: Chapter }) {
  return (
    <p key={chapter.label} className="chapter-note" aria-live="polite">
      <span className="chapter-note-title">{chapter.label}</span>
      <span dangerouslySetInnerHTML={{ __html: chapter.note }} />
    </p>
  );
}
