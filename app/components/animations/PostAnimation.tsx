"use client";

import AttentionAnimation from "./AttentionAnimation";
import ClipMatrixAnimation from "./ClipMatrixAnimation";
import { FigureLabel } from "./Figure";
import LossMaskAnimation from "./LossMaskAnimation";
import PatchifyAnimation from "./PatchifyAnimation";
import ProjectorAnimation from "./ProjectorAnimation";
import TokenBudgetAnimation from "./TokenBudgetAnimation";
import TwoStageAnimation from "./TwoStageAnimation";

const animations = {
  patchify: { component: PatchifyAnimation, number: "1.1", title: "From pixels to tokens" },
  "token-budget": { component: TokenBudgetAnimation, number: "1.2", title: "Resolution and token count" },
  attention: { component: AttentionAnimation, number: "1.3", title: "One row of self-attention" },
  projector: { component: ProjectorAnimation, number: "1.4", title: "Three projector designs" },
  "clip-matrix": { component: ClipMatrixAnimation, number: "2.1", title: "Contrastive matching" },
  "loss-mask": { component: LossMaskAnimation, number: "2.2", title: "Masking the labels" },
  "two-stage": { component: TwoStageAnimation, number: "2.3", title: "What each stage trains" },
};

export default function PostAnimation({ name }: { name: string }) {
  if (!Object.hasOwn(animations, name)) return null;

  const { component: Animation, number, title } = animations[name as keyof typeof animations];
  return (
    <FigureLabel.Provider value={{ number, title }}>
      <Animation />
    </FigureLabel.Provider>
  );
}
