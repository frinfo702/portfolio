import { useId } from "react";
import { SOCIAL_LINKS } from "../../../lib/external-links";

const icons = {
  linkedin: "M20.4 20.5h-3.5v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1a3.7 3.7 0 0 1 3.4-1.9c3.6 0 4.2 2.4 4.2 5.5v6.3ZM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1Zm1.8 13.1H3.6V9h3.5v11.5Z",
  github: "M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.6 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z",
  email: "M3 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H3Zm0 2h18l-9 6L3 6Zm0 2.4 9 6 9-6V18H3V8.4Z",
};
const labels = { linkedin: "LinkedIn", github: "GitHub", email: "Email" };
const order = ["linkedin", "github", "email"] as const;

export default function SocialLights() {
  const waterId = useId();
  return (
    <nav className="phase-socials" aria-label="Social links">
      <svg width="0" height="0" className="phase-filter" aria-hidden="true">
        <defs>
          <filter id={waterId} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025 0.22" numOctaves="2" seed="8" result="water" />
            <feDisplacementMap in="SourceGraphic" in2="water" scale="4" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.35 0.6" />
          </filter>
        </defs>
      </svg>
      {order.map((label) => {
        const link = SOCIAL_LINKS.find((item) => item.label === label);
        if (!link) return null;
        return (
          <a key={label} className="phase-social" href={link.href} aria-label={labels[label]} {...(label !== "email" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            <svg className="phase-social-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={icons[label]} /></svg>
            <svg className="phase-social-reflection" viewBox="-4 -4 32 32" aria-hidden="true"><g filter={`url(#${waterId})`}><path d={icons[label]} /></g></svg>
          </a>
        );
      })}
    </nav>
  );
}
