import ClipMatrixAnimation from "./ClipMatrixAnimation";
import PatchifyAnimation from "./PatchifyAnimation";

const animations = {
  patchify: PatchifyAnimation,
  "clip-matrix": ClipMatrixAnimation,
};

export default function PostAnimation({ name }: { name: string }) {
  if (!Object.hasOwn(animations, name)) return null;

  const Animation = animations[name as keyof typeof animations];
  return <Animation />;
}
