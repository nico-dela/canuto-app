export const A11Y_STORAGE_KEY = "canuto-a11y";

export type TextSize = "default" | "large" | "xlarge";
export type ContrastMode = "default" | "high" | "dark";

export type A11ySettings = {
  contrast: ContrastMode;
  textSize: TextSize;
  reduceMotion: boolean;
  dyslexiaFont: boolean;
  underlineLinks: boolean;
  bigTargets: boolean;
  strongFocus: boolean;
  simplified: boolean;
  colorBlind: boolean;
};

export const DEFAULT_A11Y: A11ySettings = {
  contrast: "default",
  textSize: "default",
  reduceMotion: false,
  dyslexiaFont: false,
  underlineLinks: false,
  bigTargets: false,
  strongFocus: false,
  simplified: false,
  colorBlind: false,
};

export function parseA11ySettings(raw: unknown): A11ySettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_A11Y };
  const o = raw as Partial<A11ySettings>;
  return {
    contrast:
      o.contrast === "high" || o.contrast === "dark" || o.contrast === "default"
        ? o.contrast
        : "default",
    textSize:
      o.textSize === "large" || o.textSize === "xlarge" || o.textSize === "default"
        ? o.textSize
        : "default",
    reduceMotion: Boolean(o.reduceMotion),
    dyslexiaFont: Boolean(o.dyslexiaFont),
    underlineLinks: Boolean(o.underlineLinks),
    bigTargets: Boolean(o.bigTargets),
    strongFocus: Boolean(o.strongFocus),
    simplified: Boolean(o.simplified),
    colorBlind: Boolean(o.colorBlind),
  };
}

export function readA11ySettings(): A11ySettings {
  if (typeof window === "undefined") return { ...DEFAULT_A11Y };
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_A11Y,
        reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        contrast: window.matchMedia("(prefers-contrast: more)").matches
          ? "high"
          : "default",
      };
    }
    return parseA11ySettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_A11Y };
  }
}

export function applyA11ySettings(settings: A11ySettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.a11yContrast = settings.contrast;
  root.dataset.a11yText = settings.textSize;
  root.dataset.a11yMotion = settings.reduceMotion ? "reduce" : "ok";
  root.dataset.a11yFont = settings.dyslexiaFont ? "dyslexia" : "default";
  root.dataset.a11yLinks = settings.underlineLinks ? "underline" : "default";
  root.dataset.a11yTargets = settings.bigTargets ? "big" : "default";
  root.dataset.a11yFocus = settings.strongFocus ? "strong" : "default";
  root.dataset.a11ySimple = settings.simplified ? "on" : "off";
  root.dataset.a11yColor = settings.colorBlind ? "cb" : "default";
}

export function saveA11ySettings(settings: A11ySettings) {
  applyA11ySettings(settings);
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Inline bootstrap — runs before paint to avoid flash */
export const A11Y_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(A11Y_STORAGE_KEY)};var r=localStorage.getItem(k);var s=r?JSON.parse(r):null;var d=document.documentElement;var motion=!s&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;var contrast=!s&&window.matchMedia("(prefers-contrast: more)").matches?"high":"default";var c=s&&(s.contrast==="high"||s.contrast==="dark"||s.contrast==="default")?s.contrast:contrast;var t=s&&(s.textSize==="large"||s.textSize==="xlarge"||s.textSize==="default")?s.textSize:"default";d.dataset.a11yContrast=c;d.dataset.a11yText=t;d.dataset.a11yMotion=(s?!!s.reduceMotion:motion)?"reduce":"ok";d.dataset.a11yFont=s&&s.dyslexiaFont?"dyslexia":"default";d.dataset.a11yLinks=s&&s.underlineLinks?"underline":"default";d.dataset.a11yTargets=s&&s.bigTargets?"big":"default";d.dataset.a11yFocus=s&&s.strongFocus?"strong":"default";d.dataset.a11ySimple=s&&s.simplified?"on":"off";d.dataset.a11yColor=s&&s.colorBlind?"cb":"default";}catch(e){}})();`;
