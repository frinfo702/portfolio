// Page theme: the visitor's choice (data-theme on <html>, kept in localStorage) or, until they
// choose, the system setting. globals.css keys its colours off the same attribute and media query.

export type Theme = "light" | "dark";

const KEY = "theme";
const DARK = "(prefers-color-scheme: dark)";

// Runs inline in <head> before the first paint, so a saved choice never flashes the other theme.
export const themeInitScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia(DARK).matches ? "dark" : "light";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

export function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia(DARK);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}
