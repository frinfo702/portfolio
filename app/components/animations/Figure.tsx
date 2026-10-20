"use client";

import { createContext, useContext, type ReactNode } from "react";

export const FigureLabel = createContext({ number: "", title: "" });

type Props = {
  children: ReactNode;
  // Shows the key for the two embedding spaces when the figure uses both tints.
  spaces?: boolean;
};

// The shared plate every article figure sits on: numbered header, color key,
// then the figure's own controls, canvas, and caption.
export function Figure({ children, spaces = false }: Props) {
  const { number, title } = useContext(FigureLabel);
  return (
    <figure className="post-animation">
      <header className="figure-head">
        <span className="figure-number">Fig {number}</span>
        <span className="figure-title">{title}</span>
        {spaces && (
          <span className="figure-key" aria-hidden="true">
            <span className="figure-key-vision">encoder</span>
            <span className="figure-key-text">LLM</span>
          </span>
        )}
      </header>
      {children}
    </figure>
  );
}
