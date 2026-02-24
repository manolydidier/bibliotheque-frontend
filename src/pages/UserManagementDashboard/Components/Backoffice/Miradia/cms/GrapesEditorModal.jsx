import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import {
  FiSave,
  FiX,
  FiRepeat,
  FiMonitor,
  FiTablet,
  FiSmartphone,
  FiEye,
  FiMinus,
  FiPlus,
  FiLayers,
  FiGrid,
  FiSliders,
  FiTag,
  FiCode,
  FiRefreshCw,
  FiPlay,
  FiCornerUpLeft,
  FiMenu,
  FiChevronsLeft,
  FiChevronsRight,
  FiLock,
  FiUnlock,
  FiMoon,
  FiSun,
  FiImage,
  FiFileText,
  FiSearch,
  FiTrash2,
  FiCopy,
  FiArrowUp,
  FiArrowDown,
  FiPackage,
  FiDownload,
  FiEdit3,
  FiPlusCircle,
  FiRotateCcw,
  FiBookmark,
  FiZap,
  FiLayout,
  FiLink,
} from "react-icons/fi";

const TAILWIND_CANVAS_CSS =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production"
    ? "/assets/index.css"
    : "/src/index.css";

/* =====================
   LOCAL STORAGE KEYS
===================== */
const LS_KEY_AUTOSAVE = "mrd_cms_autosave_v2";
const LS_KEY_LIBRARY = "mrd_cms_library_v2";
const LS_KEY_SNAPSHOTS = "mrd_cms_snapshots_v2";

/* =====================
   UTIL
===================== */
function cx(...a) {
  return a.filter(Boolean).join(" ");
}
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function safeJsonParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? safeJsonParse(raw, fallback) : fallback;
  } catch {
    return fallback;
  }
}
function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =====================
   IMPORT HTML -> split HTML/CSS/JS
===================== */
function splitImportedHtml(rawHtml = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(rawHtml), "text/html");

  const styleTags = Array.from(doc.querySelectorAll("style"));
  const css = styleTags.map((s) => s.textContent || "").join("\n\n").trim();
  styleTags.forEach((s) => s.remove());

  const scriptTags = Array.from(doc.querySelectorAll("script"));
  const inlineScripts = scriptTags
    .filter((s) => !s.getAttribute("src"))
    .map((s) => s.textContent || "")
    .join("\n\n")
    .trim();
  scriptTags.forEach((s) => s.remove());

  const linkCss = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  linkCss.forEach((l) => l.remove());

  const html = (doc.body ? doc.body.innerHTML : doc.documentElement?.outerHTML || "").trim();
  return { html, css, js: inlineScripts };
}

/* =====================
   COLOR + THEME HELPERS
===================== */
function normalizeHex(input = "") {
  const s = String(input).trim();
  if (!s) return "";
  const raw = s.startsWith("#") ? s.slice(1) : s;
  if (raw.length === 3 && /^[0-9a-fA-F]{3}$/.test(raw)) {
    const full = raw.split("").map((c) => c + c).join("");
    return `#${full.toLowerCase()}`;
  }
  if (raw.length === 6 && /^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return s;
}
function isValidHex(input = "") {
  const s = normalizeHex(input);
  return /^#[0-9a-f]{6}$/.test(s);
}
function hexToRgbObj(hex) {
  const h = normalizeHex(hex);
  if (!isValidHex(h)) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}
function rgbToHex(r, g, b) {
  const to = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function rgbToHsl({ r, g, b }) {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rr:
        h = ((gg - bb) / d) % 6;
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
function hslToRgb({ h, s, l }) {
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;

  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (0 <= h && h < 60) [r1, g1, b1] = [c, x, 0];
  else if (60 <= h && h < 120) [r1, g1, b1] = [x, c, 0];
  else if (120 <= h && h < 180) [r1, g1, b1] = [0, c, x];
  else if (180 <= h && h < 240) [r1, g1, b1] = [0, x, c];
  else if (240 <= h && h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}
function luminance(hex) {
  const rgb = hexToRgbObj(hex);
  if (!rgb) return 0.5;
  const srgb = [rgb.r, rgb.g, rgb.b].map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}
function isNearNeutral(hex) {
  const rgb = hexToRgbObj(hex);
  if (!rgb) return true;
  const hsl = rgbToHsl(rgb);
  return hsl.s < 10 || hsl.l < 6 || hsl.l > 94;
}
function getHueSafe(hex, fallbackHue = 210) {
  const rgb = hexToRgbObj(hex);
  if (!rgb) return fallbackHue;
  const hsl = rgbToHsl(rgb);
  if (hsl.s < 6 || hsl.l > 92 || hsl.l < 8) return fallbackHue;
  return hsl.h;
}

/**
 * Scan CSS and return top hex colors (normalized) by frequency.
 * This is what makes the theme coherent with already-made articles/styles.
 */
function extractDominantHexColors(css = "", limit = 12) {
  const text = String(css || "");
  const re = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  const counts = new Map();
  let m;
  while ((m = re.exec(text))) {
    const c = normalizeHex(`#${m[1]}`);
    if (!isValidHex(c)) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  const arr = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  // keep neutrals but push them later
  const nonNeutral = arr.filter(([c]) => !isNearNeutral(c));
  const neutral = arr.filter(([c]) => isNearNeutral(c));

  const merged = [...nonNeutral, ...neutral].slice(0, limit).map(([c]) => c);
  return merged;
}

function deriveThemeFromPalette(palette = []) {
  // pick background: brightest neutral if exists else white
  const sortedByLum = [...palette].sort((a, b) => luminance(b) - luminance(a));
  const sortedDark = [...palette].sort((a, b) => luminance(a) - luminance(b));
  const brightNeutral = sortedByLum.find((c) => isNearNeutral(c) && luminance(c) > 0.85);
  const darkNeutral = sortedDark.find((c) => isNearNeutral(c) && luminance(c) < 0.2);

  const bg = brightNeutral || "#ffffff";
  const text = darkNeutral || "#0f172a";

  // pick primary/accent: first 2 non-neutral
  const colored = palette.filter((c) => !isNearNeutral(c));
  const primary = colored[0] || "#11528f";
  const accent = colored[1] || "#00a0d6";

  const hue = getHueSafe(primary, 210);

  // surface/border/muted derived harmonically
  const bgRgb = hexToRgbObj(bg);
  const bgHsl = bgRgb ? rgbToHsl(bgRgb) : { h: hue, s: 6, l: 98 };

  const surfaceRgb = hslToRgb({ h: bgHsl.h || hue, s: clamp(bgHsl.s + 3, 0, 12), l: clamp(bgHsl.l - 1.5, 92, 99) });
  const borderRgb = hslToRgb({ h: bgHsl.h || hue, s: clamp(bgHsl.s + 8, 0, 22), l: clamp(bgHsl.l - 8, 75, 92) });
  const mutedRgb = hslToRgb({ h: hue, s: 14, l: 38 });

  return {
    light: {
      "--mrd-bg": bg,
      "--mrd-surface": rgbToHex(surfaceRgb.r, surfaceRgb.g, surfaceRgb.b),
      "--mrd-text": text,
      "--mrd-muted": rgbToHex(mutedRgb.r, mutedRgb.g, mutedRgb.b),
      "--mrd-border": rgbToHex(borderRgb.r, borderRgb.g, borderRgb.b),
      "--mrd-primary": primary,
      "--mrd-accent": accent,
      "--mrd-success": "#22c55e",
      "--mrd-warning": "#f59e0b",
      "--mrd-danger": "#ef4444",
    },
  };
}

function deriveDarkFromLight(lightVars = {}) {
  const primaryHue = getHueSafe(lightVars["--mrd-primary"], 210);
  const accentHue = getHueSafe(lightVars["--mrd-accent"], primaryHue);

  const out = {};
  for (const [k, v] of Object.entries(lightVars)) {
    const nv = normalizeHex(v);
    const hue = getHueSafe(nv, k.includes("accent") ? accentHue : primaryHue);

    if (!isValidHex(nv)) {
      out[k] = v;
      continue;
    }

    if (k.includes("bg")) {
      const rgb = hslToRgb({ h: hue, s: 26, l: 8.5 });
      out[k] = rgbToHex(rgb.r, rgb.g, rgb.b);
      continue;
    }
    if (k.includes("surface")) {
      const rgb = hslToRgb({ h: hue, s: 22, l: 12 });
      out[k] = rgbToHex(rgb.r, rgb.g, rgb.b);
      continue;
    }
    if (k.includes("text")) {
      const rgb = hslToRgb({ h: hue, s: 14, l: 92 });
      out[k] = rgbToHex(rgb.r, rgb.g, rgb.b);
      continue;
    }
    if (k.includes("muted")) {
      const rgb = hslToRgb({ h: hue, s: 10, l: 68 });
      out[k] = rgbToHex(rgb.r, rgb.g, rgb.b);
      continue;
    }
    if (k.includes("border")) {
      const rgb = hslToRgb({ h: hue, s: 18, l: 22 });
      out[k] = rgbToHex(rgb.r, rgb.g, rgb.b);
      continue;
    }

    if (k.includes("primary")) {
      const rgb = hexToRgbObj(nv);
      const hsl = rgb ? rgbToHsl(rgb) : { h: hue, s: 55, l: 45 };
      const rgb2 = hslToRgb({ h: hsl.h || hue, s: clamp(Math.max(hsl.s, 55), 0, 100), l: clamp(Math.max(hsl.l, 52), 0, 100) });
      out[k] = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
      continue;
    }
    if (k.includes("accent")) {
      const rgb = hexToRgbObj(nv);
      const hsl = rgb ? rgbToHsl(rgb) : { h: accentHue, s: 55, l: 48 };
      const rgb2 = hslToRgb({ h: hsl.h || accentHue, s: clamp(Math.max(hsl.s, 55), 0, 100), l: clamp(Math.max(hsl.l, 50), 0, 100) });
      out[k] = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
      continue;
    }

    const rgb = hexToRgbObj(nv);
    const hsl = rgb ? rgbToHsl(rgb) : { h: hue, s: 30, l: 50 };
    const newL = clamp(100 - hsl.l * 0.85, 8, 92);
    const rgb2 = hslToRgb({ h: hue, s: clamp(hsl.s * 0.9, 10, 70), l: newL });
    out[k] = rgbToHex(rgb2.r, rgb2.g, rgb2.b);
  }

  out["--mrd-text"] = out["--mrd-text"] || "#e2e8f0";
  out["--mrd-muted"] = out["--mrd-muted"] || "#94a3b8";
  out["--mrd-border"] = out["--mrd-border"] || "#1f2937";
  out["--mrd-bg"] = out["--mrd-bg"] || "#0b1220";
  out["--mrd-surface"] = out["--mrd-surface"] || "#0f172a";
  return out;
}

/* =====================
   THEME IN CSS (markers)
===================== */
const MRD_THEME_START = "/* MRD_THEME_START */";
const MRD_THEME_END = "/* MRD_THEME_END */";

function parseVarsFromBlock(blockText = "") {
  const vars = {};
  const re = /(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(blockText))) vars[m[1]] = String(m[2]).trim();
  return vars;
}
function parseThemeFromCss(css = "") {
  const text = String(css || "");
  if (!text.includes(MRD_THEME_START) || !text.includes(MRD_THEME_END)) return null;

  const re = new RegExp(`${MRD_THEME_START}[\\s\\S]*?${MRD_THEME_END}`, "m");
  const match = text.match(re);
  if (!match) return null;

  const block = match[0];
  const rootMatch = block.match(/:root\s*\{([\s\S]*?)\}/m);
  const darkMatch = block.match(/html\.dark\s*\{([\s\S]*?)\}/m) || block.match(/\.dark\s*\{([\s\S]*?)\}/m);

  const light = rootMatch ? parseVarsFromBlock(rootMatch[1]) : {};
  const dark = darkMatch ? parseVarsFromBlock(darkMatch[1]) : {};
  if (!Object.keys(light).length && !Object.keys(dark).length) return null;

  return { light, dark };
}

/* =====================
   PRESETS
===================== */
const THEME_PRESETS = [
  {
    id: "miradia-classic",
    name: "Miradia Classic",
    light: {
      "--mrd-bg": "#ffffff",
      "--mrd-surface": "#ffffff",
      "--mrd-text": "#0f172a",
      "--mrd-muted": "#475569",
      "--mrd-border": "#e2e8f0",
      "--mrd-primary": "#11528f",
      "--mrd-accent": "#00a0d6",
      "--mrd-success": "#22c55e",
      "--mrd-warning": "#f59e0b",
      "--mrd-danger": "#ef4444",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    light: {
      "--mrd-primary": "#0ea5e9",
      "--mrd-accent": "#22c55e",
      "--mrd-bg": "#ffffff",
      "--mrd-text": "#0b1220",
      "--mrd-muted": "#475569",
      "--mrd-border": "#e2e8f0",
      "--mrd-surface": "#ffffff",
      "--mrd-success": "#22c55e",
      "--mrd-warning": "#f59e0b",
      "--mrd-danger": "#ef4444",
    },
  },
  {
    id: "forest",
    name: "Forest",
    light: {
      "--mrd-primary": "#16a34a",
      "--mrd-accent": "#0ea5e9",
      "--mrd-bg": "#ffffff",
      "--mrd-text": "#0f172a",
      "--mrd-muted": "#475569",
      "--mrd-border": "#e2e8f0",
      "--mrd-surface": "#ffffff",
      "--mrd-success": "#22c55e",
      "--mrd-warning": "#f59e0b",
      "--mrd-danger": "#ef4444",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    light: {
      "--mrd-primary": "#f97316",
      "--mrd-accent": "#ef4444",
      "--mrd-bg": "#ffffff",
      "--mrd-text": "#0f172a",
      "--mrd-muted": "#475569",
      "--mrd-border": "#e2e8f0",
      "--mrd-surface": "#ffffff",
      "--mrd-success": "#22c55e",
      "--mrd-warning": "#f59e0b",
      "--mrd-danger": "#ef4444",
    },
  },
];

/* =====================
   COLORS / QUICK PALETTE
===================== */
const FALLBACK_PALETTE = [
  "#11528f",
  "#00a0d6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#0f172a",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#e2e8f0",
  "#ffffff",
  "#000000",
];

const RESIZER = {
  tl: 0,
  tc: 1,
  tr: 0,
  cl: 1,
  cr: 1,
  bl: 0,
  bc: 1,
  br: 0,
  keyWidth: "width",
  keyHeight: "height",
};

const PRESET_CARD = `<div class="mrd-card"><h3>Titre</h3><p>Texte…</p></div>`;
const PRESET_BTN_PRIMARY = `<a class="mrd-btn mrd-primary" href="#">Bouton</a>`;
const PRESET_BTN_GHOST = `<a class="mrd-btn mrd-ghost" href="#">Bouton</a>`;
const PRESET_SECTION = `
<section class="mrd-section">
  <div class="mrd-wrap">
    <h2>Titre de section</h2>
    <p>Ton texte ici…</p>
  </div>
</section>
`;
const PRESET_GRID_2 = `
<div class="mrd-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
  ${PRESET_CARD}
  ${PRESET_CARD}
</div>
`;

const STARTER_HTML = `
<section class="mrd-hero">
  <div class="mrd-wrap">
    <p class="mrd-badge">MIRADIA • CMS</p>
    <h1>Page d’accueil</h1>
    <p class="mrd-lead">
      Double-clique pour éditer. Glisse un bloc depuis la gauche.
    </p>
    <div class="mrd-actions">
      <a class="mrd-btn mrd-primary" href="#contact">Nous contacter</a>
      <a class="mrd-btn mrd-ghost" href="#services">Voir les services</a>
    </div>
  </div>
</section>

<section class="mrd-section" id="services">
  <div class="mrd-wrap">
    <h2>Services</h2>
    <p>Exemple de section. Tu peux remplacer par tes contenus.</p>
    <div class="mrd-grid">
      <div class="mrd-card"><h3>Bloc 1</h3><p>Texte simple…</p></div>
      <div class="mrd-card"><h3>Bloc 2</h3><p>Texte simple…</p></div>
      <div class="mrd-card"><h3>Bloc 3</h3><p>Texte simple…</p></div>
    </div>
  </div>
</section>

<section class="mrd-section" id="contact">
  <div class="mrd-wrap">
    <h2>Contact</h2>
    <p>Email : <a class="mrd-link" href="mailto:contact@miradia.mg">contact@miradia.mg</a></p>
  </div>
</section>
`;

const STARTER_CSS = `
${MRD_THEME_START}
:root{
  --mrd-bg:#ffffff;
  --mrd-surface:#ffffff;
  --mrd-text:#0f172a;
  --mrd-muted:#475569;
  --mrd-border:#e2e8f0;
  --mrd-primary:#11528f;
  --mrd-accent:#00a0d6;
  --mrd-success:#22c55e;
  --mrd-warning:#f59e0b;
  --mrd-danger:#ef4444;
}
html.dark{
  --mrd-bg:#0b1220;
  --mrd-surface:#0f172a;
  --mrd-text:#e2e8f0;
  --mrd-muted:#94a3b8;
  --mrd-border:#1f2937;
  --mrd-primary:#00a0d6;
  --mrd-accent:#22c55e;
  --mrd-success:#22c55e;
  --mrd-warning:#f59e0b;
  --mrd-danger:#ef4444;
}
${MRD_THEME_END}

.mrd-wrap{max-width:1100px;margin:0 auto;padding:0 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto}
.mrd-hero{padding:64px 0;background:radial-gradient(1200px 600px at 20% 10%, rgba(0,160,214,.16), transparent 60%),radial-gradient(1000px 500px at 80% 20%, rgba(34,197,94,.12), transparent 55%),var(--mrd-bg)}
.mrd-badge{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--mrd-text);background:rgba(255,255,255,.72);padding:6px 10px;border-radius:999px;border:1px solid rgba(15,23,42,.08)}
.mrd-hero h1{margin:14px 0 8px;font-size:44px;line-height:1.06;color:var(--mrd-primary);letter-spacing:-.02em}
.mrd-lead{margin:0 0 18px;color:var(--mrd-muted);font-size:16px;max-width:70ch;line-height:1.65}
.mrd-actions{display:flex;gap:10px;flex-wrap:wrap}
.mrd-btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 14px;border-radius:14px;font-weight:900;text-decoration:none;border:1px solid rgba(15,23,42,.12)}
.mrd-primary{border:none;color:#fff;background:linear-gradient(90deg,var(--mrd-primary),var(--mrd-accent))}
.mrd-ghost{color:var(--mrd-text);background:rgba(255,255,255,.88)}
.mrd-section{padding:40px 0;background:var(--mrd-bg)}
.mrd-section h2{margin:0 0 10px;color:var(--mrd-text);letter-spacing:-.01em}
.mrd-section p{margin:0 0 12px;color:var(--mrd-muted);line-height:1.7}
.mrd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}
.mrd-card{border:1px solid rgba(15,23,42,.10);border-radius:18px;padding:16px;background:var(--mrd-surface);color:var(--mrd-text);box-shadow:0 10px 30px rgba(2,6,23,.06)}
.mrd-card h3{margin:0 0 6px;color:var(--mrd-text);font-size:14px;letter-spacing:-.01em}
.mrd-card p{margin:0;color:var(--mrd-muted);font-size:13px;line-height:1.6}
.mrd-link{color:var(--mrd-accent);font-weight:800;text-decoration:none}
.mrd-link:hover{text-decoration:underline}
@media (max-width:900px){ .mrd-grid{grid-template-columns:1fr 1fr;} }
@media (max-width:720px){
  .mrd-hero{padding:44px 0}
  .mrd-hero h1{font-size:32px}
  .mrd-grid{grid-template-columns:1fr}
}
`;

/* =====================
   UI CONSTANTS
===================== */
const BTN = "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition select-none";
const BTN_IDLE = "border-slate-200 bg-white hover:bg-slate-50 text-slate-700";
const BTN_PRIMARY = "border-transparent text-white";
const TAB = "px-3 py-2 rounded-xl text-xs font-bold border transition select-none flex items-center gap-2";
const TAB_ON = "bg-white border-slate-200 text-slate-900 shadow-sm";
const TAB_OFF = "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/60";

/* =====================
   DEFAULT SEO MODEL
===================== */
const DEFAULT_SEO = {
  title: "",
  description: "",
  keywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  canonical: "",
};

/* =====================
   MAIN COMPONENT
===================== */
export default function GrapesEditorModal({
  initialProject = "",
  initialHtml = "",
  initialCss = "",
  initialJs = "",
  onSave,
  onCancel,
  assetUploadHandler,
}) {
  const editorRef = useRef(null);

  const importInputRef = useRef(null);
  const assetInputRef = useRef(null);

  const canvasRef = useRef(null);
  const blocksRef = useRef(null);
  const layersRef = useRef(null);
  const stylesRef = useRef(null);
  const traitsRef = useRef(null);

  const jsTimerRef = useRef(null);
  const cssTimerRef = useRef(null);

  const [ready, setReady] = useState(false);

  // LEFT tabs
  const [leftTab, setLeftTab] = useState("blocks");
  // RIGHT tabs
  const [rightTab, setRightTab] = useState("styles");

  const [leftOpen, setLeftOpen] = useState(true);
  const [leftCompact, setLeftCompact] = useState(true);

  const [device, setDevice] = useState("Desktop");
  const [zoom, setZoom] = useState(100);

  const [codeTab, setCodeTab] = useState("css");
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState(String(initialJs || ""));

  const [liveCss, setLiveCss] = useState(true);
  const [liveJs, setLiveJs] = useState(false);

  const [selectedInfo, setSelectedInfo] = useState({ id: "", tag: "", name: "", path: [] });

  // Element quick actions
  const [isLocked, setIsLocked] = useState(false);

  // --- Color selectors (RE-ADDED)
  const [paletteMode, setPaletteMode] = useState("bg"); // bg | text | border
  const [colorAlpha, setColorAlpha] = useState(100);
  const [pickerColor, setPickerColor] = useState("#11528f");
  const [hexInput, setHexInput] = useState("#11528f");

  // Sizes
  const [sizeWidthPct, setSizeWidthPct] = useState(100);
  const [sizeHeightPx, setSizeHeightPx] = useState(200);

  // Theme
  const [themeEditMode, setThemeEditMode] = useState("light");
  const [themePreview, setThemePreview] = useState("light");

  const [themeVars, setThemeVars] = useState(() => {
    const parsed = parseThemeFromCss(String(initialCss || STARTER_CSS));
    if (parsed?.light) {
      const light = parsed.light;
      const dark = parsed.dark && Object.keys(parsed.dark).length ? parsed.dark : deriveDarkFromLight(light);
      return { light, dark };
    }
    return parseThemeFromCss(STARTER_CSS) || { light: {}, dark: {} };
  });

  // NEW: AutoTheme coherent based on CSS palette
  const [autoThemeCoherent, setAutoThemeCoherent] = useState(true);
  const [themeAutoInject, setThemeAutoInject] = useState(true);

  // NEW: colors detected in current CSS/articles
  const [detectedColors, setDetectedColors] = useState([]);

  // CMS pages/seo/assets/library/snapshots
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState("");
  const [pageNameDraft, setPageNameDraft] = useState("");
  const [seoDraft, setSeoDraft] = useState(DEFAULT_SEO);

  const [assets, setAssets] = useState([]);
  const [library, setLibrary] = useState(() => loadLS(LS_KEY_LIBRARY, []));
  const [libraryNameDraft, setLibraryNameDraft] = useState("");

  const [snapshots, setSnapshots] = useState(() => loadLS(LS_KEY_SNAPSHOTS, []));
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);

  const [blockSearch, setBlockSearch] = useState("");

  const safeProject = useMemo(() => {
    if (!initialProject) return null;
    try {
      const obj = JSON.parse(initialProject);
      return obj && typeof obj === "object" ? obj : null;
    } catch {
      return null;
    }
  }, [initialProject]);

  /* =====================
     EDITOR SYNC
  ===================== */
  const syncFromEditor = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const h = ed.getHtml() || "";
    const c = ed.getCss() || "";
    setHtmlCode(h);
    setCssCode(c);

    // Update detected colors from current CSS (articles already made)
    setDetectedColors(extractDominantHexColors(c, 12));
  }, []);

  const injectJsToCanvas = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const doc = ed.Canvas.getDocument();
      if (!doc) return;

      const old = doc.getElementById("mrd-js-runtime");
      if (old) old.remove();

      const code = String(jsCode || "").trim();
      if (!code) return;

      const s = doc.createElement("script");
      s.id = "mrd-js-runtime";
      s.type = "text/javascript";
      s.text = code;

      doc.body.appendChild(s);
    } catch {}
  }, [jsCode]);

  const applyToEditor = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;

    ed.setComponents(htmlCode || "");
    ed.setStyle(cssCode || "");

    setDetectedColors(extractDominantHexColors(cssCode, 12));
    if (liveJs) injectJsToCanvas();
  }, [htmlCode, cssCode, liveJs, injectJsToCanvas]);

  const setGjsDevice = useCallback((name) => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      ed.setDevice(name);
      setDevice(name);
    } catch {}
  }, []);

  const setCanvasZoom = useCallback((nextZoom) => {
    const ed = editorRef.current;
    if (!ed) return;
    const z = Math.max(30, Math.min(140, nextZoom));
    setZoom(z);
    try {
      const canvasBody = ed.Canvas.getBody();
      if (canvasBody) {
        canvasBody.style.transformOrigin = "top center";
        canvasBody.style.transform = `scale(${z / 100})`;
        canvasBody.style.width = z >= 100 ? "100%" : `${100 / (z / 100)}%`;
      }
    } catch {}
  }, []);

  /* =====================
     SELECTION + QUICK ACTIONS
  ===================== */
  const getSelected = () => editorRef.current?.getSelected?.();

  const quickDuplicate = () => {
    const ed = editorRef.current;
    const sel = getSelected();
    if (!ed || !sel) return;
    try {
      const cloned = sel.clone();
      sel.parent()?.append(cloned, { at: sel.index() + 1 });
      ed.select(cloned);
    } catch {}
  };

  const quickDelete = () => {
    const sel = getSelected();
    if (!sel) return;
    try {
      sel.remove();
    } catch {}
  };

  const quickMoveUp = () => {
    const sel = getSelected();
    if (!sel) return;
    try {
      const idx = sel.index();
      if (idx > 0) sel.parent()?.append(sel, { at: idx - 1 });
    } catch {}
  };

  const quickMoveDown = () => {
    const sel = getSelected();
    if (!sel) return;
    try {
      const idx = sel.index();
      sel.parent()?.append(sel, { at: idx + 1 });
    } catch {}
  };

  const quickWrapSection = () => {
    const ed = editorRef.current;
    const sel = getSelected();
    if (!ed || !sel) return;
    try {
      const html = sel.toHTML();
      ed.addComponents(`<section class="mrd-section"><div class="mrd-wrap">${html}</div></section>`);
      sel.remove();
      const comps = ed.getWrapper().components();
      ed.select(comps.at(comps.length - 1));
    } catch {}
  };

  const toggleLockSelected = useCallback(() => {
    const ed = editorRef.current;
    const sel = ed?.getSelected?.();
    if (!sel) return;

    const next = !Boolean(sel.get && sel.get("locked"));
    sel.set({
      locked: next,
      draggable: !next,
      hoverable: !next,
      selectable: true,
      resizable: next ? false : RESIZER,
    });

    setIsLocked(next);
  }, []);

  const updateSelectedInfo = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = ed.getSelected();
    if (!sel) {
      setSelectedInfo({ id: "", tag: "", name: "", path: [] });
      setIsLocked(false);
      return;
    }

    const path = [];
    let cur = sel;
    let guard = 0;
    while (cur && guard < 12) {
      const tag = cur.get("tagName") || "div";
      const name = cur.getName ? cur.getName() : "";
      const id = cur.getId ? cur.getId() : "";
      path.unshift({ tag, name, id });
      cur = cur.parent && cur.parent();
      guard++;
    }

    try {
      const lockedNow = Boolean(sel.get && sel.get("locked"));
      setIsLocked(lockedNow);

      if (!lockedNow) {
        sel.set({ resizable: RESIZER, draggable: true, hoverable: true, selectable: true });
      }

      const st = sel.getStyle ? sel.getStyle() : {};
      const w = String(st?.width || "").trim();
      const h = String(st?.height || "").trim();
      const wPct = w.endsWith("%") ? parseInt(w, 10) : null;
      const hPx = h.endsWith("px") ? parseInt(h, 10) : null;

      if (Number.isFinite(wPct)) setSizeWidthPct(Math.max(10, Math.min(100, wPct)));
      if (Number.isFinite(hPx)) setSizeHeightPx(Math.max(50, Math.min(900, hPx)));
    } catch {}

    setSelectedInfo({
      id: sel.getId ? sel.getId() : "",
      tag: sel.get("tagName") || "div",
      name: sel.getName ? sel.getName() : "",
      path,
    });
  }, []);

  const applyColorToSelected = useCallback((mode, hexColor, alphaPct = 100) => {
    const ed = editorRef.current;
    const sel = ed?.getSelected?.();
    if (!sel) return;

    const alpha = clamp(Number(alphaPct) / 100, 0, 1);
    const rgb = hexToRgbObj(hexColor);
    const color = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hexColor;

    if (mode === "bg") sel.addStyle({ "background-color": color });
    if (mode === "text") sel.addStyle({ color });
    if (mode === "border") sel.addStyle({ "border-color": color });

    try {
      const st = sel.getStyle ? sel.getStyle() : {};
      const w = String(st?.width || "").trim();
      const h = String(st?.height || "").trim();
      const wPct = w.endsWith("%") ? parseInt(w, 10) : null;
      const hPx = h.endsWith("px") ? parseInt(h, 10) : null;
      if (Number.isFinite(wPct)) setSizeWidthPct(Math.max(10, Math.min(100, wPct)));
      if (Number.isFinite(hPx)) setSizeHeightPx(Math.max(50, Math.min(900, hPx)));
      setIsLocked(Boolean(sel.get && sel.get("locked")));
    } catch {}
  }, []);

  const updateSize = useCallback((prop, value) => {
    const ed = editorRef.current;
    const sel = ed?.getSelected?.();
    if (!sel) return;
    sel.addStyle({ [prop]: value });
  }, []);

  /* =====================
     THEME BUILD/INJECT
  ===================== */
  const buildThemeCssBlock = useCallback(() => {
    const l = themeVars.light || {};
    const d = themeVars.dark || {};
    const toLines = (obj) =>
      Object.entries(obj)
        .map(([k, v]) => `  ${k}: ${String(v).trim()};`)
        .join("\n");
    return [
      MRD_THEME_START,
      ":root{",
      toLines(l),
      "}",
      "",
      "html.dark{",
      toLines(d),
      "}",
      MRD_THEME_END,
    ].join("\n");
  }, [themeVars]);

  const upsertThemeCssInto = useCallback((baseCss, themeCss) => {
    const css = String(baseCss || "");
    const hasStart = css.includes(MRD_THEME_START);
    const hasEnd = css.includes(MRD_THEME_END);

    if (hasStart && hasEnd) {
      const re = new RegExp(`${MRD_THEME_START}[\\s\\S]*?${MRD_THEME_END}`, "m");
      return css.replace(re, themeCss).trim();
    }
    return `${themeCss}\n\n${css}`.trim();
  }, []);

  const injectThemeCss = useCallback(() => {
    const themeCss = buildThemeCssBlock();
    setCssCode((prev) => upsertThemeCssInto(prev, themeCss));
  }, [buildThemeCssBlock, upsertThemeCssInto]);

  const applyThemePreviewToCanvas = useCallback((mode) => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const doc = ed.Canvas.getDocument();
      if (!doc) return;
      const root = doc.documentElement;
      if (!root) return;
      if (mode === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    } catch {}
  }, []);

  // NEW: rebuild coherent theme from current CSS palette (articles/styles already made)
  const rebuildThemeFromCss = useCallback(() => {
    const ed = editorRef.current;
    const css = ed ? ed.getCss() || "" : cssCode || "";
    const palette = extractDominantHexColors(css, 12);
    const base = deriveThemeFromPalette(palette);
    const light = { ...(themeVars.light || {}), ...(base.light || {}) };

    const dark = deriveDarkFromLight(light);
    setThemeVars({ light, dark });
    setDetectedColors(palette);

    if (themeAutoInject) {
      const block = [
        MRD_THEME_START,
        ":root{",
        Object.entries(light).map(([k, v]) => `  ${k}: ${String(v).trim()};`).join("\n"),
        "}",
        "",
        "html.dark{",
        Object.entries(dark).map(([k, v]) => `  ${k}: ${String(v).trim()};`).join("\n"),
        "}",
        MRD_THEME_END,
      ].join("\n");
      setCssCode((prev) => upsertThemeCssInto(prev, block));
    }
  }, [cssCode, themeAutoInject, themeVars.light, upsertThemeCssInto]);

  // AutoTheme coherent: whenever light vars change, keep dark consistent
  useEffect(() => {
    if (!autoThemeCoherent) return;
    setThemeVars((prev) => {
      const light = prev?.light || {};
      const dark = deriveDarkFromLight(light);
      return { ...prev, dark };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoThemeCoherent,
    themeVars.light?.["--mrd-bg"],
    themeVars.light?.["--mrd-surface"],
    themeVars.light?.["--mrd-text"],
    themeVars.light?.["--mrd-muted"],
    themeVars.light?.["--mrd-border"],
    themeVars.light?.["--mrd-primary"],
    themeVars.light?.["--mrd-accent"],
    themeVars.light?.["--mrd-success"],
    themeVars.light?.["--mrd-warning"],
    themeVars.light?.["--mrd-danger"],
  ]);

  useEffect(() => {
    if (!ready || !themeAutoInject) return;
    injectThemeCss();
  }, [themeVars, ready, themeAutoInject, injectThemeCss]);

  useEffect(() => {
    if (!ready) return;
    applyThemePreviewToCanvas(themePreview);
  }, [themePreview, ready, applyThemePreviewToCanvas]);

  /* =====================
     CMS: Pages helpers
  ===================== */
  const refreshPages = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const p = ed.Pages;
      if (!p) return;
      const all =
        p.getAll()?.map((pg) => ({
          id: pg.getId?.() || pg.id,
          name: pg.get("name") || pg.getId?.() || "Page",
        })) || [];
      setPages(all);

      const sel = p.getSelected?.();
      const activeId = sel?.getId?.() || sel?.id || "";
      setActivePageId(activeId);

      const seo = sel?.get?.("seo") || DEFAULT_SEO;
      setSeoDraft({ ...DEFAULT_SEO, ...seo });
      setPageNameDraft(sel?.get?.("name") || "");
    } catch {}
  }, []);

  const createPage = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const id = `page-${Date.now()}`;
      ed.Pages.add({
        id,
        name: `Nouvelle page`,
        component: `<section class="mrd-section"><div class="mrd-wrap"><h2>Nouvelle page</h2><p>Contenu…</p></div></section>`,
      });
      ed.Pages.select(id);
      refreshPages();
    } catch {}
  }, [refreshPages]);

  const selectPage = useCallback(
    (id) => {
      const ed = editorRef.current;
      if (!ed) return;
      try {
        ed.Pages.select(id);
        refreshPages();
      } catch {}
    },
    [refreshPages]
  );

  const renamePage = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const sel = ed.Pages.getSelected();
      if (!sel) return;
      const name = String(pageNameDraft || "").trim() || "Page";
      sel.set("name", name);
      refreshPages();
    } catch {}
  }, [pageNameDraft, refreshPages]);

  const deletePage = useCallback(
    (id) => {
      const ed = editorRef.current;
      if (!ed) return;
      try {
        const pg = ed.Pages.get(id);
        if (!pg) return;
        if (ed.Pages.getAll().length <= 1) return;
        pg.remove();
        refreshPages();
      } catch {}
    },
    [refreshPages]
  );

  const saveSeoToPage = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const sel = ed.Pages.getSelected();
      if (!sel) return;
      sel.set("seo", { ...DEFAULT_SEO, ...seoDraft });
    } catch {}
  }, [seoDraft]);

  /* =====================
     CMS: Assets
  ===================== */
  const refreshAssets = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const all =
        ed.AssetManager.getAll()?.map((a) => ({
          src: a.get("src"),
          name: a.get("name") || "",
        })) || [];
      setAssets(all);
    } catch {}
  }, []);

  const addAssetsFromFiles = useCallback(
    async (files) => {
      const ed = editorRef.current;
      if (!ed || !files?.length) return;

      if (assetUploadHandler) {
        try {
          const urls = await assetUploadHandler(Array.from(files));
          urls?.forEach((u) => ed.AssetManager.add({ src: u }));
          refreshAssets();
          return;
        } catch {}
      }

      const list = Array.from(files);
      for (const f of list) {
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const src = String(reader.result || "");
            ed.AssetManager.add({ src, name: f.name });
            resolve();
          };
          reader.onerror = resolve;
          reader.readAsDataURL(f);
        });
      }
      refreshAssets();
    },
    [assetUploadHandler, refreshAssets]
  );

  const insertImageToCanvas = useCallback((src) => {
    const ed = editorRef.current;
    if (!ed || !src) return;
    try {
      const sel = ed.getSelected();
      if (sel && (sel.get("tagName") || "").toLowerCase() === "img") {
        sel.addAttributes({ src });
        return;
      }
      ed.addComponents(`<img src="${src}" alt="image" style="max-width:100%;height:auto;border-radius:16px" />`);
    } catch {}
  }, []);

  /* =====================
     CMS: Library
  ===================== */
  const persistLibrary = useCallback((next) => {
    setLibrary(next);
    saveLS(LS_KEY_LIBRARY, next);
  }, []);

  const saveSelectionToLibrary = useCallback(() => {
    const ed = editorRef.current;
    const sel = ed?.getSelected?.();
    if (!ed || !sel) return;
    const name = String(libraryNameDraft || "").trim() || `Bloc ${new Date().toLocaleString()}`;
    const html = sel.toHTML?.() || "";
    const item = { id: `lib-${Date.now()}`, name, html };
    const next = [item, ...(library || [])].slice(0, 60);
    persistLibrary(next);
    setLibraryNameDraft("");

    try {
      ed.BlockManager.add(item.id, { label: `📦 ${item.name}`, category: "Bibliothèque", content: item.html });
    } catch {}
  }, [libraryNameDraft, library, persistLibrary]);

  const insertLibraryItem = useCallback((html) => {
    const ed = editorRef.current;
    if (!ed || !html) return;
    try {
      ed.addComponents(html);
    } catch {}
  }, []);

  const deleteLibraryItem = useCallback(
    (id) => {
      const next = (library || []).filter((x) => x.id !== id);
      persistLibrary(next);
    },
    [library, persistLibrary]
  );

  /* =====================
     Autosave & Snapshots
  ===================== */
  const makeProjectPayload = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return null;
    return {
      ts: Date.now(),
      project: ed.getProjectData(),
      js: jsCode || "",
      themePreview,
    };
  }, [jsCode, themePreview]);

  const doAutosave = useCallback(() => {
    const payload = makeProjectPayload();
    if (!payload) return;
    saveLS(LS_KEY_AUTOSAVE, payload);
  }, [makeProjectPayload]);

  const loadAutosave = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const payload = loadLS(LS_KEY_AUTOSAVE, null);
    if (!payload?.project) return;
    try {
      ed.loadProjectData(payload.project);
      setJsCode(payload.js || "");
      refreshPages();
      refreshAssets();
      syncFromEditor();
      applyThemePreviewToCanvas(payload.themePreview || "light");
    } catch {}
  }, [applyThemePreviewToCanvas, refreshAssets, refreshPages, syncFromEditor]);

  const createSnapshot = useCallback(() => {
    const payload = makeProjectPayload();
    if (!payload) return;
    const item = { id: `snap-${payload.ts}`, ts: payload.ts, project: payload.project, js: payload.js };
    const next = [item, ...(snapshots || [])].slice(0, 40);
    setSnapshots(next);
    saveLS(LS_KEY_SNAPSHOTS, next);
  }, [makeProjectPayload, snapshots]);

  const restoreSnapshot = useCallback(
    (id) => {
      const ed = editorRef.current;
      if (!ed) return;
      const item = (snapshots || []).find((s) => s.id === id);
      if (!item?.project) return;
      try {
        ed.loadProjectData(item.project);
        setJsCode(item.js || "");
        refreshPages();
        refreshAssets();
        syncFromEditor();
      } catch {}
    },
    [refreshAssets, refreshPages, snapshots, syncFromEditor]
  );

  const deleteSnapshot = useCallback(
    (id) => {
      const next = (snapshots || []).filter((s) => s.id !== id);
      setSnapshots(next);
      saveLS(LS_KEY_SNAPSHOTS, next);
    },
    [snapshots]
  );

  useEffect(() => {
    if (!ready || !autosaveEnabled) return;
    const t = setInterval(() => doAutosave(), 15000);
    return () => clearInterval(t);
  }, [ready, autosaveEnabled, doAutosave]);

  /* =====================
     EXPORT HTML (with SEO)
  ===================== */
  const buildExportHtml = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return "";

    const page = ed.Pages?.getSelected?.();
    const seo = page?.get?.("seo") || DEFAULT_SEO;
    const title = seo.title || page?.get?.("name") || "MIRADIA";
    const desc = seo.description || "";
    const keywords = seo.keywords || "";
    const canonical = seo.canonical || "";
    const ogTitle = seo.ogTitle || title;
    const ogDesc = seo.ogDescription || desc;
    const ogImage = seo.ogImage || "";

    const html = ed.getHtml() || "";
    const css = ed.getCss() || "";
    const js = String(jsCode || "").trim();

    const head = `
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(title)}</title>
${desc ? `<meta name="description" content="${escapeHtml(desc)}"/>` : ""}
${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}"/>` : ""}
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}"/>` : ""}

<meta property="og:title" content="${escapeHtml(ogTitle)}"/>
${ogDesc ? `<meta property="og:description" content="${escapeHtml(ogDesc)}"/>` : ""}
${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}"/>` : ""}
<meta property="og:type" content="website"/>

<style>${css}</style>
`.trim();

    const body = `
<div id="mrd-root">${html}</div>
${js ? `<script>${js}</script>` : ""}
`.trim();

    return `<!doctype html>
<html lang="fr">
<head>
${head}
</head>
<body>
${body}
</body>
</html>`;
  }, [jsCode]);

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =====================
     IMPORT HTML FILE
  ===================== */
  const importHtmlFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || "");
        const parts = splitImportedHtml(raw);

        setHtmlCode(parts.html);
        setCssCode(parts.css);
        setJsCode(parts.js);

        const parsed = parseThemeFromCss(parts.css);
        if (parsed?.light && Object.keys(parsed.light).length) {
          const dark = parsed.dark && Object.keys(parsed.dark).length ? parsed.dark : deriveDarkFromLight(parsed.light);
          setThemeVars({ light: parsed.light, dark });
        } else {
          // build coherent theme from found palette
          const palette = extractDominantHexColors(parts.css, 12);
          const base = deriveThemeFromPalette(palette);
          const light = base.light;
          const dark = deriveDarkFromLight(light);
          setThemeVars({ light, dark });
        }

        const ed = editorRef.current;
        if (ed) {
          ed.setComponents(parts.html || "");
          ed.setStyle(parts.css || "");
        }
        setDetectedColors(extractDominantHexColors(parts.css, 12));
        refreshPages();
        refreshAssets();
      };
      reader.readAsText(file);
    },
    [refreshAssets, refreshPages]
  );

  /* =====================
     INIT GrapesJS
  ===================== */
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!blocksRef.current || !layersRef.current || !stylesRef.current || !traitsRef.current) return;

    canvasRef.current.style.height = "100%";
    canvasRef.current.style.width = "100%";

    const ed = grapesjs.init({
      container: canvasRef.current,
      height: "100%",
      fromElement: false,
      panels: { defaults: [] },
      storageManager: false,

      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Tablet", width: "768px", widthMedia: "992px" },
          { name: "Mobile", width: "375px", widthMedia: "480px" },
        ],
      },

      blockManager: { appendTo: blocksRef.current },
      layerManager: { appendTo: layersRef.current },

      styleManager: {
        appendTo: stylesRef.current,
        sectors: [
          {
            name: "Colors",
            open: true,
            properties: [
              { property: "color", name: "Text color", type: "color" },
              { property: "background-color", name: "Background", type: "color" },
              { property: "border-color", name: "Border color", type: "color" },
              { property: "opacity", name: "Opacity", type: "slider", defaults: 1, min: 0, max: 1, step: 0.01 },
            ],
          },
          {
            name: "Typography",
            open: true,
            properties: [
              {
                property: "font-family",
                name: "Font",
                type: "select",
                defaults: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
                options: [
                  { id: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto", name: "Sans (system)" },
                  { id: "ui-serif, Georgia, Cambria, Times New Roman", name: "Serif" },
                  { id: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas", name: "Mono" },
                ],
              },
              { property: "font-size", name: "Size", type: "integer", units: ["px", "rem"], defaults: "16" },
              {
                property: "font-weight",
                name: "Weight",
                type: "select",
                defaults: "400",
                options: [
                  { id: "300", name: "300" },
                  { id: "400", name: "400" },
                  { id: "500", name: "500" },
                  { id: "600", name: "600" },
                  { id: "700", name: "700" },
                  { id: "800", name: "800" },
                  { id: "900", name: "900" },
                ],
              },
              { property: "line-height", name: "Line height", type: "integer", units: ["", "px"], defaults: "1.6" },
              { property: "letter-spacing", name: "Letter spacing", type: "integer", units: ["em", "px"], defaults: "0" },
              {
                property: "text-align",
                name: "Align",
                type: "select",
                defaults: "left",
                options: [
                  { id: "left", name: "Left" },
                  { id: "center", name: "Center" },
                  { id: "right", name: "Right" },
                  { id: "justify", name: "Justify" },
                ],
              },
              {
                property: "text-transform",
                name: "Transform",
                type: "select",
                defaults: "none",
                options: [
                  { id: "none", name: "None" },
                  { id: "uppercase", name: "Uppercase" },
                  { id: "lowercase", name: "Lowercase" },
                  { id: "capitalize", name: "Capitalize" },
                ],
              },
              {
                property: "text-decoration",
                name: "Decoration",
                type: "select",
                defaults: "none",
                options: [
                  { id: "none", name: "None" },
                  { id: "underline", name: "Underline" },
                  { id: "line-through", name: "Strike" },
                ],
              },
            ],
          },
          { name: "Spacing", open: false, properties: [{ property: "margin", name: "Margin" }, { property: "padding", name: "Padding" }, { property: "gap", name: "Gap" }] },
          { name: "Decorations", open: false, properties: [{ property: "border", name: "Border" }, { property: "border-radius", name: "Radius" }, { property: "box-shadow", name: "Shadow" }, { property: "filter", name: "Filter" }] },
          {
            name: "Size",
            open: false,
            properties: [
              { property: "width", name: "Width" },
              { property: "height", name: "Height" },
              { property: "max-width", name: "Max width" },
              { property: "min-height", name: "Min height" },
              {
                property: "overflow",
                name: "Overflow",
                type: "select",
                defaults: "visible",
                options: [
                  { id: "visible", name: "Visible" },
                  { id: "hidden", name: "Hidden" },
                  { id: "auto", name: "Auto" },
                  { id: "scroll", name: "Scroll" },
                ],
              },
            ],
          },
          {
            name: "Layout",
            open: false,
            properties: [
              {
                property: "display",
                name: "Display",
                type: "select",
                defaults: "block",
                options: [
                  { id: "block", name: "Block" },
                  { id: "inline-block", name: "Inline-block" },
                  { id: "flex", name: "Flex" },
                  { id: "grid", name: "Grid" },
                  { id: "none", name: "None" },
                ],
              },
              { property: "flex-direction", name: "Flex dir" },
              { property: "justify-content", name: "Justify" },
              { property: "align-items", name: "Align" },
              { property: "position", name: "Position" },
              { property: "top", name: "Top" },
              { property: "right", name: "Right" },
              { property: "bottom", name: "Bottom" },
              { property: "left", name: "Left" },
              { property: "z-index", name: "Z-index" },
            ],
          },
        ],
      },

      traitManager: { appendTo: traitsRef.current },

      canvas: { styles: [TAILWIND_CANVAS_CSS], scripts: [] },

      domComponents: {
        avoidInlineStyle: false,
        defaults: { resizable: RESIZER },
      },

      assetManager: { upload: false, autoAdd: true },
    });

    editorRef.current = ed;

    // Load initial
    if (safeProject) {
      ed.loadProjectData(safeProject);
    } else {
      const hasHtml = Boolean(String(initialHtml || "").trim());
      const hasCss = Boolean(String(initialCss || "").trim());
      ed.setComponents(hasHtml ? initialHtml : STARTER_HTML);
      ed.setStyle(hasCss ? initialCss : STARTER_CSS);
    }

    // library blocks restore
    try {
      const lib = loadLS(LS_KEY_LIBRARY, []);
      lib.forEach((item) => {
        ed.BlockManager.add(item.id, { label: `📦 ${item.name}`, category: "Bibliothèque", content: item.html });
      });
    } catch {}

    // blocks
    ed.BlockManager.add("mrd-hero", { label: "Hero MIRADIA", category: "MIRADIA", content: STARTER_HTML });
    ed.BlockManager.add("mrd-section", { label: "Section", category: "MIRADIA", content: PRESET_SECTION });
    ed.BlockManager.add("mrd-card", { label: "Card simple", category: "MIRADIA", content: PRESET_CARD });
    ed.BlockManager.add("mrd-btn-primary", { label: "Bouton (primary)", category: "MIRADIA", content: PRESET_BTN_PRIMARY });
    ed.BlockManager.add("mrd-btn-ghost", { label: "Bouton (ghost)", category: "MIRADIA", content: PRESET_BTN_GHOST });
    ed.BlockManager.add("mrd-grid-2", { label: "Grid 2 colonnes", category: "MIRADIA", content: PRESET_GRID_2 });

    // selection listeners
    const onSel = () => updateSelectedInfo();
    ed.on("component:selected", onSel);
    ed.on("component:update", onSel);
    ed.on("component:add", onSel);
    ed.on("component:remove", onSel);

    const finalizeLoad = () => {
      setReady(true);
      syncFromEditor();
      updateSelectedInfo();
      setGjsDevice("Desktop");
      setCanvasZoom(100);
      applyThemePreviewToCanvas(themePreview);
      refreshPages();
      refreshAssets();

      // detected colors from current CSS
      const currentCss = ed.getCss() || "";
      setDetectedColors(extractDominantHexColors(currentCss, 12));

      // auto coherent theme: if no theme block, rebuild
      const parsed = parseThemeFromCss(currentCss);
      if (!parsed?.light || !Object.keys(parsed.light).length) {
        if (autoThemeCoherent) rebuildThemeFromCss();
      } else {
        const dark = parsed.dark && Object.keys(parsed.dark).length ? parsed.dark : deriveDarkFromLight(parsed.light);
        setThemeVars({ light: parsed.light, dark });
      }

      if (liveJs && String(jsCode || "").trim()) injectJsToCanvas();
    };

    ed.on("load", finalizeLoad);
    const t = setTimeout(finalizeLoad, 250);

    return () => {
      clearTimeout(t);
      if (jsTimerRef.current) clearTimeout(jsTimerRef.current);
      if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
      try {
        ed.destroy();
      } catch {}
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live CSS
  useEffect(() => {
    if (!liveCss || !ready) return;
    if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
    cssTimerRef.current = setTimeout(() => {
      const ed = editorRef.current;
      if (!ed) return;
      try {
        ed.setStyle(cssCode || "");
      } catch {}
      setDetectedColors(extractDominantHexColors(cssCode, 12));
    }, 250);
    return () => cssTimerRef.current && clearTimeout(cssTimerRef.current);
  }, [cssCode, liveCss, ready]);

  // Live JS
  useEffect(() => {
    if (!liveJs || !ready) return;
    if (jsTimerRef.current) clearTimeout(jsTimerRef.current);
    jsTimerRef.current = setTimeout(() => injectJsToCanvas(), 350);
    return () => jsTimerRef.current && clearTimeout(jsTimerRef.current);
  }, [jsCode, liveJs, ready, injectJsToCanvas]);

  /* =====================
     BLOCK SEARCH FILTER
  ===================== */
  useEffect(() => {
    const root = blocksRef.current;
    if (!root) return;
    const q = String(blockSearch || "").trim().toLowerCase();
    const blocks = root.querySelectorAll(".gjs-block");
    blocks.forEach((b) => {
      const label = (b.querySelector(".gjs-block-label")?.textContent || "").toLowerCase();
      const show = !q || label.includes(q);
      b.style.display = show ? "" : "none";
    });
  }, [blockSearch, leftTab, ready]);

  /* =====================
     SAVE
  ===================== */
  const doSave = () => {
    const ed = editorRef.current;
    if (!ed) return;

    try {
      saveSeoToPage();
    } catch {}

    const projectObj = ed.getProjectData();
    const html = ed.getHtml();
    const css = ed.getCss();

    setHtmlCode(html || "");
    setCssCode(css || "");

    onSave?.({
      project: JSON.stringify(projectObj),
      html,
      css,
      js: jsCode || "",
    });
  };

  const doUndo = () => {
    try {
      editorRef.current?.runCommand("core:undo");
    } catch {}
  };
  const doRedo = () => {
    try {
      editorRef.current?.runCommand("core:redo");
    } catch {}
  };
  const togglePreview = () => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      ed.runCommand("core:preview");
    } catch {}
  };

  const selectionPathLabel = useMemo(() => {
    if (!selectedInfo?.path?.length) return "Aucune sélection";
    return selectedInfo.path.map((p) => (p.name ? `${p.tag}:${p.name}` : p.tag)).join("  ›  ");
  }, [selectedInfo]);

  const leftW = leftOpen ? (leftCompact ? 240 : 340) : 0;

  /* =====================
     COLOR SELECTOR ACTIONS
  ===================== */
  const applyPicker = (color) => {
    const c = normalizeHex(color);
    if (!isValidHex(c)) return;
    setPickerColor(c);
    setHexInput(c);
    applyColorToSelected(paletteMode, c, colorAlpha);
  };

  const applyHexInput = () => {
    const c = normalizeHex(hexInput);
    if (!isValidHex(c)) return;
    setPickerColor(c);
    applyColorToSelected(paletteMode, c, colorAlpha);
  };

  /* =====================
     THEME APPLY PRESET
  ===================== */
  const applyThemePreset = (preset) => {
    const light = { ...(themeVars.light || {}), ...(preset.light || {}) };
    const dark = autoThemeCoherent ? deriveDarkFromLight(light) : { ...(themeVars.dark || {}) };
    setThemeVars({ light, dark });
  };

  /* =====================
     UI
  ===================== */
  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      {/* TOP TOOLBAR */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <span className={cx("inline-block w-2 h-2 rounded-full", ready ? "bg-emerald-500" : "bg-amber-400")} />
          <span className="text-xs font-semibold text-slate-700">{ready ? "CMS Builder prêt" : "Chargement…"}</span>

          <div className="hidden md:flex items-center ml-3 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-600 truncate max-w-[520px]">
              <b>Sélection:</b> {selectionPathLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".html,text/html"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importHtmlFile(f);
              e.target.value = "";
            }}
          />

          <button type="button" onClick={() => importInputRef.current?.click()} className={cx(BTN, BTN_IDLE)} title="Importer un fichier HTML">
            <FiRefreshCw /> Import HTML
          </button>

          <button type="button" onClick={createSnapshot} className={cx(BTN, BTN_IDLE)} title="Créer une version (snapshot)">
            <FiBookmark /> Snapshot
          </button>

          <button type="button" onClick={() => setLeftOpen((v) => !v)} className={cx(BTN, BTN_IDLE)} title="Sidebar gauche">
            <FiMenu /> {leftOpen ? "Masquer" : "Afficher"}
          </button>

          <button
            type="button"
            onClick={() => setLeftCompact((v) => !v)}
            className={cx(BTN, BTN_IDLE, !leftOpen && "opacity-50 pointer-events-none")}
            title={leftCompact ? "Agrandir la sidebar" : "Réduire la sidebar"}
          >
            {leftCompact ? <FiChevronsRight /> : <FiChevronsLeft />}
            {leftCompact ? "Large" : "Compact"}
          </button>

          <button type="button" onClick={doUndo} className={cx(BTN, BTN_IDLE)} title="Undo">
            <FiCornerUpLeft /> Undo
          </button>
          <button type="button" onClick={doRedo} className={cx(BTN, BTN_IDLE)} title="Redo">
            <FiRepeat /> Redo
          </button>

          <div className="hidden sm:flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => setGjsDevice("Desktop")}
              className={cx(BTN, device === "Desktop" ? "border-sky-200 bg-sky-50 text-sky-700" : BTN_IDLE)}
              title="Desktop"
            >
              <FiMonitor />
            </button>
            <button
              type="button"
              onClick={() => setGjsDevice("Tablet")}
              className={cx(BTN, device === "Tablet" ? "border-sky-200 bg-sky-50 text-sky-700" : BTN_IDLE)}
              title="Tablet"
            >
              <FiTablet />
            </button>
            <button
              type="button"
              onClick={() => setGjsDevice("Mobile")}
              className={cx(BTN, device === "Mobile" ? "border-sky-200 bg-sky-50 text-sky-700" : BTN_IDLE)}
              title="Mobile"
            >
              <FiSmartphone />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 ml-1">
            <button type="button" onClick={() => setCanvasZoom(zoom - 10)} className={cx(BTN, BTN_IDLE)} title="Zoom -">
              <FiMinus />
            </button>
            <span className="text-xs font-bold text-slate-700 w-12 text-center">{zoom}%</span>
            <button type="button" onClick={() => setCanvasZoom(zoom + 10)} className={cx(BTN, BTN_IDLE)} title="Zoom +">
              <FiPlus />
            </button>
          </div>

          <button type="button" onClick={togglePreview} className={cx(BTN, BTN_IDLE)} title="Preview">
            <FiEye /> Preview
          </button>

          <button
            type="button"
            onClick={() => setThemePreview((p) => (p === "light" ? "dark" : "light"))}
            className={cx(BTN, BTN_IDLE)}
            title="Bascule Light/Dark dans le canvas"
          >
            {themePreview === "dark" ? <FiMoon /> : <FiSun />} {themePreview === "dark" ? "Dark" : "Light"}
          </button>

          <button type="button" onClick={onCancel} className={cx(BTN, BTN_IDLE)} title="Annuler">
            <FiX /> Annuler
          </button>

          <button
            type="button"
            onClick={doSave}
            className={cx(BTN, BTN_PRIMARY)}
            style={{ background: "linear-gradient(90deg,#11528f,#00a0d6)" }}
            title="Enregistrer"
          >
            <FiSave /> Enregistrer
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div
        className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr]"
        style={{
          gridTemplateColumns:
            typeof window !== "undefined" && window.innerWidth >= 1024 ? `${leftW}px 1fr 420px` : "1fr",
          transition: "grid-template-columns 220ms ease",
        }}
      >
        {/* LEFT SIDEBAR */}
        <aside
          className={cx("border-r bg-white min-h-0 flex flex-col overflow-hidden", !leftOpen && "opacity-0 pointer-events-none")}
          style={{ width: leftOpen ? "100%" : 0, transition: "opacity 160ms ease" }}
        >
          <div className={cx("border-b bg-white", leftCompact ? "p-1.5" : "p-2")}>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={() => setLeftTab("blocks")} className={cx(TAB, leftTab === "blocks" ? TAB_ON : TAB_OFF)} title="Blocs">
                <FiGrid /> {!leftCompact && "Blocs"}
              </button>
              <button type="button" onClick={() => setLeftTab("pages")} className={cx(TAB, leftTab === "pages" ? TAB_ON : TAB_OFF)} title="Pages">
                <FiFileText /> {!leftCompact && "Pages"}
              </button>
              <button type="button" onClick={() => setLeftTab("assets")} className={cx(TAB, leftTab === "assets" ? TAB_ON : TAB_OFF)} title="Assets">
                <FiImage /> {!leftCompact && "Assets"}
              </button>
              <button type="button" onClick={() => setLeftTab("library")} className={cx(TAB, leftTab === "library" ? TAB_ON : TAB_OFF)} title="Bibliothèque">
                <FiPackage /> {!leftCompact && "Library"}
              </button>
              <button type="button" onClick={() => setLeftTab("layers")} className={cx(TAB, leftTab === "layers" ? TAB_ON : TAB_OFF)} title="Layers">
                <FiLayers /> {!leftCompact && "Layers"}
              </button>
            </div>

            {leftTab === "blocks" && (
              <div className={cx("mt-2 flex items-center gap-2", leftCompact && "mt-1")}>
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-2 top-2.5 text-slate-400" />
                  <input
                    value={blockSearch}
                    onChange={(e) => setBlockSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="Rechercher un bloc…"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setBlockSearch("")}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <FiRotateCcw />
                </button>
              </div>
            )}

            <div className={cx("mt-2 flex items-center gap-2 flex-wrap", leftCompact && "mt-1")}>
              <button type="button" onClick={syncFromEditor} className={cx(BTN, BTN_IDLE)} title="Sync depuis canvas">
                <FiRefreshCw /> {!leftCompact && "Sync"}
              </button>

              <button type="button" onClick={loadAutosave} className={cx(BTN, BTN_IDLE)} title="Charger l’autosave localStorage">
                <FiZap /> {!leftCompact && "Autosave"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const html = buildExportHtml();
                  downloadTextFile("page.html", html, "text/html;charset=utf-8");
                }}
                className={cx(BTN, BTN_IDLE)}
                title="Exporter HTML complet"
              >
                <FiDownload /> {!leftCompact && "Export"}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <div className={cx(leftCompact ? "p-1.5" : "p-2")}>
              {/* BLOCKS */}
              <div className={cx(leftTab === "blocks" ? "block" : "hidden")}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 mb-2">
                  <div className="text-[11px] font-extrabold text-slate-800">Couleurs détectées (articles/styles)</div>
                  <div className="text-[10px] text-slate-600 mt-1">
                    Clique une couleur ➜ appliquée à l’élément sélectionné (selon Fond/Texte/Bordure).
                  </div>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {(detectedColors.length ? detectedColors : FALLBACK_PALETTE).slice(0, 12).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => applyPicker(c)}
                        className="w-7 h-7 rounded-lg border border-slate-200 shadow-sm"
                        style={{ background: c }}
                        title={`Utiliser ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <div ref={blocksRef} className="mrd-gjs blocks-mount" />
              </div>

              {/* PAGES */}
              <div className={cx(leftTab === "pages" ? "block" : "hidden")}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-extrabold text-slate-900">Pages</div>
                    <button
                      type="button"
                      onClick={createPage}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold hover:bg-slate-50 inline-flex items-center gap-1"
                    >
                      <FiPlusCircle /> Ajouter
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {pages.map((p) => (
                      <div
                        key={p.id}
                        className={cx(
                          "flex items-center justify-between gap-2 rounded-xl border px-2 py-2",
                          p.id === activePageId ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"
                        )}
                      >
                        <button type="button" onClick={() => selectPage(p.id)} className="min-w-0 text-left flex-1" title="Ouvrir">
                          <div className="text-[11px] font-extrabold text-slate-900 truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{p.id}</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActivePageId(p.id);
                            selectPage(p.id);
                            setRightTab("seo");
                          }}
                          className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                          title="SEO"
                        >
                          <FiLink />
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePage(p.id)}
                          className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                          title="Supprimer"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 border-t pt-3">
                    <div className="text-[11px] font-bold text-slate-700">Renommer la page active</div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        value={pageNameDraft}
                        onChange={(e) => setPageNameDraft(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        placeholder="Nom de page"
                      />
                      <button
                        type="button"
                        onClick={renamePage}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 hover:bg-slate-100 inline-flex items-center gap-2"
                      >
                        <FiEdit3 /> OK
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-extrabold text-slate-900">Versions</div>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-semibold">
                      <input checked={autosaveEnabled} onChange={(e) => setAutosaveEnabled(e.target.checked)} type="checkbox" />
                      Autosave
                    </label>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-500">Autosave (15s) + Snapshots manuels.</div>

                  <div className="mt-3 space-y-2">
                    {(snapshots || []).map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-extrabold text-slate-900 truncate">{new Date(s.ts).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{s.id}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => restoreSnapshot(s.id)}
                            className="px-2 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                            title="Restaurer"
                          >
                            <FiRotateCcw />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSnapshot(s.id)}
                            className="px-2 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                            title="Supprimer"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!snapshots?.length && <div className="text-[11px] text-slate-500">Aucune version pour l’instant.</div>}
                  </div>
                </div>
              </div>

              {/* ASSETS */}
              <div className={cx(leftTab === "assets" ? "block" : "hidden")}>
                <input
                  ref={assetInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) addAssetsFromFiles(files);
                    e.target.value = "";
                  }}
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-extrabold text-slate-900">Assets (Images)</div>
                    <button
                      type="button"
                      onClick={() => assetInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold hover:bg-slate-50 inline-flex items-center gap-1"
                    >
                      <FiPlusCircle /> Upload
                    </button>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-500">
                    Clique une image pour l’insérer dans la page (ou remplacer une image sélectionnée).
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {assets.map((a, idx) => (
                      <button
                        key={`${a.src}-${idx}`}
                        type="button"
                        onClick={() => insertImageToCanvas(a.src)}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm"
                        title="Insérer"
                      >
                        <img src={a.src} alt={a.name || "asset"} className="w-full h-20 object-cover" />
                      </button>
                    ))}
                    {!assets.length && <div className="text-[11px] text-slate-500 col-span-3">Aucun asset. Upload une image.</div>}
                  </div>
                </div>
              </div>

              {/* LIBRARY */}
              <div className={cx(leftTab === "library" ? "block" : "hidden")}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 mb-3">
                  <div className="text-[12px] font-extrabold text-slate-900">Bibliothèque (réutilisable)</div>
                  <div className="text-[10px] text-slate-500 mt-1">Sélectionne un élément ➜ Sauver ➜ Réutiliser.</div>

                  <div className="flex items-center gap-2 mt-3">
                    <input
                      value={libraryNameDraft}
                      onChange={(e) => setLibraryNameDraft(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Nom du bloc…"
                    />
                    <button
                      type="button"
                      onClick={saveSelectionToLibrary}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2"
                      title="Sauver la sélection"
                    >
                      <FiBookmark /> Sauver
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {library.map((it) => (
                    <div key={it.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-extrabold text-slate-900 truncate">{it.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{it.id}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => insertLibraryItem(it.html)}
                            className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                            title="Insérer"
                          >
                            <FiPlus />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLibraryItem(it.id)}
                            className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
                            title="Supprimer"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-600 font-mono max-h-20 overflow-auto">
                        {it.html.slice(0, 240)}
                        {it.html.length > 240 ? "…" : ""}
                      </div>
                    </div>
                  ))}
                  {!library.length && <div className="text-[11px] text-slate-500">Aucun bloc en bibliothèque.</div>}
                </div>
              </div>

              {/* LAYERS */}
              <div className={cx(leftTab === "layers" ? "block" : "hidden")}>
                <div ref={layersRef} className="mrd-gjs layers-mount" />
              </div>
            </div>
          </div>
        </aside>

        {/* CANVAS */}
        <main className="min-h-0 bg-slate-100 relative">
          {!leftOpen && (
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              className="absolute left-2 top-2 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              title="Afficher la sidebar"
            >
              <FiMenu /> CMS
            </button>
          )}

          {/* Quick selection actions floating */}
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
            <button type="button" onClick={quickDuplicate} className={cx(BTN, BTN_IDLE)} title="Dupliquer">
              <FiCopy />
            </button>
            <button type="button" onClick={quickDelete} className={cx(BTN, BTN_IDLE)} title="Supprimer">
              <FiTrash2 />
            </button>
            <button type="button" onClick={quickMoveUp} className={cx(BTN, BTN_IDLE)} title="Monter">
              <FiArrowUp />
            </button>
            <button type="button" onClick={quickMoveDown} className={cx(BTN, BTN_IDLE)} title="Descendre">
              <FiArrowDown />
            </button>
            <button type="button" onClick={quickWrapSection} className={cx(BTN, BTN_IDLE)} title="Wrap dans une section">
              <FiLayout />
            </button>
            <button
              type="button"
              onClick={toggleLockSelected}
              className={cx(BTN, BTN_IDLE, isLocked && "border-amber-200 bg-amber-50 text-amber-700")}
              title="Lock/Unlock"
            >
              {isLocked ? <FiUnlock /> : <FiLock />}
            </button>
          </div>

          <div className="h-full w-full">
            <div ref={canvasRef} className="h-full w-full" />
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="border-l bg-white min-h-0 flex flex-col">
          <div className="p-2 border-b bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={() => setRightTab("styles")} className={cx(TAB, rightTab === "styles" ? TAB_ON : TAB_OFF)}>
                <FiSliders /> Styles
              </button>
              <button type="button" onClick={() => setRightTab("traits")} className={cx(TAB, rightTab === "traits" ? TAB_ON : TAB_OFF)}>
                <FiTag /> Props
              </button>
              <button type="button" onClick={() => setRightTab("code")} className={cx(TAB, rightTab === "code" ? TAB_ON : TAB_OFF)}>
                <FiCode /> Code
              </button>
              <button type="button" onClick={() => setRightTab("theme")} className={cx(TAB, rightTab === "theme" ? TAB_ON : TAB_OFF)}>
                {themePreview === "dark" ? <FiMoon /> : <FiSun />} Thème
              </button>
              <button type="button" onClick={() => setRightTab("seo")} className={cx(TAB, rightTab === "seo" ? TAB_ON : TAB_OFF)} title="SEO par page">
                <FiLink /> SEO
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-600">
              <b>Élément :</b>{" "}
              {selectedInfo?.tag ? (
                <span className="font-semibold text-slate-800">
                  {selectedInfo.tag}
                  {selectedInfo.name ? ` • ${selectedInfo.name}` : ""}
                </span>
              ) : (
                <span className="text-slate-500">aucun</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {/* STYLES TAB (with full color selectors restored) */}
            <div className={cx(rightTab === "styles" ? "block" : "hidden")}>
              <div className="p-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 mb-3">
                  <div className="text-[12px] font-extrabold text-slate-900">🎨 Sélecteurs de couleurs</div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {["bg", "text", "border"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaletteMode(m)}
                        className={cx(
                          "px-2.5 py-1 rounded-lg border text-[11px] font-semibold",
                          paletteMode === m ? "bg-white border-slate-200 text-slate-900" : "bg-slate-100 border-slate-200 text-slate-600"
                        )}
                      >
                        {m === "bg" ? "Fond" : m === "text" ? "Texte" : "Bordure"}
                      </button>
                    ))}
                    <span className="ml-auto text-[11px] font-extrabold text-slate-900">{colorAlpha}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={colorAlpha}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setColorAlpha(v);
                      applyColorToSelected(paletteMode, pickerColor, v);
                    }}
                    className="w-full mt-2"
                  />

                  {/* Color picker + hex input */}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="color"
                      value={isValidHex(pickerColor) ? pickerColor : "#11528f"}
                      onChange={(e) => applyPicker(e.target.value)}
                      className="h-10 w-14 rounded-xl border border-slate-200 bg-white"
                      title="Color picker"
                    />
                    <input
                      value={hexInput}
                      onChange={(e) => setHexInput(e.target.value)}
                      onBlur={applyHexInput}
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      placeholder="#RRGGBB"
                    />
                    <button
                      type="button"
                      onClick={applyHexInput}
                      className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-800 hover:bg-slate-50"
                    >
                      OK
                    </button>
                  </div>

                  {/* Detected colors (from articles already made) */}
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-slate-700">Couleurs détectées (CSS actuel)</div>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {(detectedColors.length ? detectedColors : FALLBACK_PALETTE).slice(0, 12).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => applyPicker(c)}
                          className="w-7 h-7 rounded-lg border border-slate-200 shadow-sm"
                          style={{ background: c }}
                          title={`Utiliser ${c}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* width/height */}
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">Largeur ({sizeWidthPct}%)</div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={sizeWidthPct}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSizeWidthPct(v);
                        updateSize("width", `${v}%`);
                      }}
                      className="w-full"
                    />

                    <div className="text-[11px] font-bold text-slate-700 mt-2 mb-1">Hauteur ({sizeHeightPx}px)</div>
                    <input
                      type="range"
                      min="50"
                      max="900"
                      value={sizeHeightPx}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSizeHeightPx(v);
                        updateSize("height", `${v}px`);
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Quick theme bottom */}
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-extrabold text-slate-800">Bas de l’édition • Thème auto cohérent</div>
                      <button
                        type="button"
                        onClick={() => setRightTab("theme")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold hover:bg-slate-50"
                      >
                        Ouvrir
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <label className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
                        <input type="checkbox" checked={autoThemeCoherent} onChange={(e) => setAutoThemeCoherent(e.target.checked)} />
                        AutoTheme cohérent
                      </label>

                      <label className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
                        <input type="checkbox" checked={themeAutoInject} onChange={(e) => setThemeAutoInject(e.target.checked)} />
                        Sync CSS
                      </label>

                      <button
                        type="button"
                        onClick={rebuildThemeFromCss}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2"
                        title="Reconstruire le thème à partir du CSS existant"
                      >
                        <FiRefreshCw /> Rebuild from CSS
                      </button>
                    </div>
                  </div>
                </div>

                <div ref={stylesRef} className="mrd-gjs styles-mount" />
              </div>
            </div>

            {/* TRAITS TAB */}
            <div className={cx(rightTab === "traits" ? "block" : "hidden")}>
              <div className="p-2">
                <div className="text-[11px] text-slate-500 mb-2">Attributs (href, id, class…).</div>
                <div ref={traitsRef} className="mrd-gjs traits-mount" />
              </div>
            </div>

            {/* CODE TAB */}
            {rightTab === "code" && (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCodeTab("html")} className={cx(TAB, codeTab === "html" ? TAB_ON : TAB_OFF)}>
                    HTML
                  </button>
                  <button type="button" onClick={() => setCodeTab("css")} className={cx(TAB, codeTab === "css" ? TAB_ON : TAB_OFF)}>
                    CSS
                  </button>
                  <button type="button" onClick={() => setCodeTab("js")} className={cx(TAB, codeTab === "js" ? TAB_ON : TAB_OFF)}>
                    JS
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    <input type="checkbox" checked={liveCss} onChange={(e) => setLiveCss(e.target.checked)} />
                    Live CSS
                  </label>

                  <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    <input type="checkbox" checked={liveJs} onChange={(e) => setLiveJs(e.target.checked)} />
                    Live JS
                  </label>

                  <button type="button" onClick={injectJsToCanvas} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold hover:bg-slate-50 inline-flex items-center gap-1">
                    <FiPlay /> Exécuter
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const html = buildExportHtml();
                      downloadTextFile("page.html", html, "text/html;charset=utf-8");
                      downloadTextFile("styles.css", cssCode || "", "text/css;charset=utf-8");
                      downloadTextFile("script.js", jsCode || "", "text/javascript;charset=utf-8");
                    }}
                    className={cx(BTN, BTN_IDLE)}
                    title="Télécharger HTML/CSS/JS"
                  >
                    <FiDownload /> Download
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={syncFromEditor} className={cx(BTN, BTN_IDLE)} title="Récupère HTML/CSS depuis le canvas">
                    <FiRefreshCw /> Sync
                  </button>
                  <button type="button" onClick={applyToEditor} className={cx(BTN, BTN_IDLE)} title="Applique HTML/CSS au canvas">
                    Appliquer
                  </button>
                </div>

                {codeTab === "html" && (
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="h-[420px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    placeholder="HTML…"
                  />
                )}

                {codeTab === "css" && (
                  <textarea
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className="h-[420px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    placeholder="CSS…"
                  />
                )}

                {codeTab === "js" && (
                  <textarea
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    className="h-[420px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    placeholder={`// JS…`}
                  />
                )}
              </div>
            )}

            {/* THEME TAB (auto coherent + presets + rebuild) */}
            {rightTab === "theme" && (
              <div className="p-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-extrabold text-slate-900">🌗 Thème (cohérent)</div>
                    <button type="button" onClick={injectThemeCss} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold hover:bg-slate-50">
                      Sync CSS
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => setThemeEditMode("light")} className={cx("px-2.5 py-1 rounded-lg border text-[11px] font-semibold", themeEditMode === "light" ? "bg-white" : "bg-slate-100")}>
                      Light
                    </button>
                    <button type="button" onClick={() => setThemeEditMode("dark")} className={cx("px-2.5 py-1 rounded-lg border text-[11px] font-semibold", themeEditMode === "dark" ? "bg-white" : "bg-slate-100")}>
                      Dark
                    </button>

                    <label className="ml-auto flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
                      <input type="checkbox" checked={autoThemeCoherent} onChange={(e) => setAutoThemeCoherent(e.target.checked)} />
                      AutoTheme cohérent
                    </label>

                    <label className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
                      <input type="checkbox" checked={themeAutoInject} onChange={(e) => setThemeAutoInject(e.target.checked)} />
                      Sync CSS
                    </label>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={rebuildThemeFromCss}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2"
                      title="Reconstruire le thème à partir du CSS existant"
                    >
                      <FiRefreshCw /> Rebuild from CSS
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemePreview((p) => (p === "light" ? "dark" : "light"))}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2"
                      title="Preview Light/Dark"
                    >
                      {themePreview === "dark" ? <FiMoon /> : <FiSun />} Preview
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-slate-700">Presets</div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {THEME_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyThemePreset(p)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <div className="text-[11px] font-extrabold text-slate-900">{p.name}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="w-5 h-5 rounded-lg border border-slate-200" style={{ background: p.light["--mrd-primary"] }} />
                            <span className="w-5 h-5 rounded-lg border border-slate-200" style={{ background: p.light["--mrd-accent"] }} />
                            <span className="text-[10px] text-slate-500 font-mono">{p.light["--mrd-primary"]}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 border-t pt-3">
                    <div className="text-[11px] font-bold text-slate-700 mb-2">Vars ({themeEditMode})</div>

                    {Object.keys(themeVars?.[themeEditMode] || {}).length === 0 && (
                      <div className="text-[11px] text-slate-500">
                        Pas de variables détectées. Clique <b>Rebuild from CSS</b> pour créer un thème cohérent.
                      </div>
                    )}

                    <div className="space-y-2">
                      {Object.entries(themeVars?.[themeEditMode] || {}).map(([key, value]) => {
                        const disabled = autoThemeCoherent && themeEditMode === "dark";
                        const safe = isValidHex(value) ? value : normalizeHex(value) || "#000000";
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <div className="w-[140px] text-[11px] font-semibold text-slate-700 truncate">{key}</div>

                            <input
                              type="color"
                              value={isValidHex(safe) ? safe : "#000000"}
                              disabled={disabled}
                              onChange={(e) => {
                                const v = e.target.value;
                                setThemeVars((prev) => ({
                                  ...prev,
                                  [themeEditMode]: { ...(prev?.[themeEditMode] || {}), [key]: v },
                                }));
                              }}
                              className="h-8 w-10 rounded-lg border border-slate-200 bg-white disabled:opacity-70"
                              title={`${key}`}
                            />

                            <input
                              value={value}
                              disabled={disabled}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setThemeVars((prev) => ({
                                  ...prev,
                                  [themeEditMode]: { ...(prev?.[themeEditMode] || {}), [key]: raw },
                                }));
                              }}
                              onBlur={() => {
                                const v = normalizeHex(themeVars?.[themeEditMode]?.[key] || "");
                                if (isValidHex(v)) {
                                  setThemeVars((prev) => ({
                                    ...prev,
                                    [themeEditMode]: { ...(prev?.[themeEditMode] || {}), [key]: v },
                                  }));
                                }
                              }}
                              className="h-8 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-70"
                              placeholder="#RRGGBB"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {autoThemeCoherent && themeEditMode === "dark" && (
                      <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2">
                        Dark est recalculé automatiquement (AutoTheme cohérent). Décoche pour modifier Dark à la main.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="text-[11px] font-extrabold text-slate-900">Couleurs détectées (référence)</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Ces couleurs viennent de ton CSS actuel (donc cohérent avec tes articles déjà faits).
                  </div>
                  <div className="grid grid-cols-8 gap-2 mt-2">
                    {(detectedColors.length ? detectedColors : FALLBACK_PALETTE).slice(0, 16).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          // update primary/accent quickly
                          setThemeVars((prev) => {
                            const light = { ...(prev.light || {}), "--mrd-primary": c };
                            const dark = autoThemeCoherent ? deriveDarkFromLight(light) : prev.dark || {};
                            return { ...prev, light, dark };
                          });
                        }}
                        className="w-7 h-7 rounded-lg border border-slate-200 shadow-sm"
                        style={{ background: c }}
                        title={`Set primary = ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SEO TAB */}
            {rightTab === "seo" && (
              <div className="p-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[12px] font-extrabold text-slate-900">SEO (page active)</div>
                  <div className="text-[10px] text-slate-500 mt-1">Export HTML inclut les metas.</div>

                  <div className="mt-3 space-y-2">
                    {[
                      { key: "title", label: "Title" },
                      { key: "description", label: "Description" },
                      { key: "keywords", label: "Keywords" },
                      { key: "canonical", label: "Canonical" },
                      { key: "ogTitle", label: "OG Title" },
                      { key: "ogDescription", label: "OG Desc" },
                      { key: "ogImage", label: "OG Image URL" },
                    ].map((f) => (
                      <div key={f.key} className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-700">{f.label}</div>
                        <input
                          value={seoDraft[f.key] || ""}
                          onChange={(e) => setSeoDraft((p) => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                          placeholder={f.label}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveSeoToPage}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-extrabold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2"
                    >
                      <FiSave /> Sauver SEO
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const html = buildExportHtml();
                        downloadTextFile("page.html", html, "text/html;charset=utf-8");
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-extrabold text-slate-800 hover:bg-slate-100 inline-flex items-center gap-2"
                    >
                      <FiDownload /> Export page
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-2 border-t bg-white flex items-center justify-between">
            <button type="button" onClick={doUndo} className={cx(BTN, BTN_IDLE)} title="Undo">
              <FiCornerUpLeft />
            </button>
            <button type="button" onClick={doRedo} className={cx(BTN, BTN_IDLE)} title="Redo">
              <FiRepeat />
            </button>
            <button type="button" onClick={togglePreview} className={cx(BTN, BTN_IDLE)} title="Preview">
              <FiEye />
            </button>
            <button type="button" onClick={doSave} className={cx(BTN, BTN_PRIMARY)} style={{ background: "linear-gradient(90deg,#11528f,#00a0d6)" }} title="Enregistrer">
              <FiSave />
            </button>
          </div>
        </aside>
      </div>

      {/* PRO SKIN */}
      <style>{`
        .mrd-gjs .gjs-one-bg { background: transparent !important; }
        .mrd-gjs .gjs-two-color { color: #0f172a !important; }
        .mrd-gjs .gjs-three-bg { background: #fff !important; }
        .mrd-gjs .gjs-four-color { color: #64748b !important; }

        .blocks-mount .gjs-block{
          border-radius: 14px !important;
          border: 1px solid rgba(15,23,42,.12) !important;
          box-shadow: 0 6px 18px rgba(2,6,23,.06) !important;
          padding: 12px !important;
          background: #fff !important;
        }
        .blocks-mount .gjs-block:hover{
          transform: translateY(-1px);
          box-shadow: 0 10px 26px rgba(2,6,23,.10) !important;
        }
        .blocks-mount .gjs-block-label{
          font-size: 12px !important;
          font-weight: 900 !important;
          color: #0f172a !important;
        }
        .blocks-mount .gjs-blocks-c{
          padding: 8px !important;
          gap: 10px !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
        }

        .layers-mount .gjs-layer{ border-radius: 12px !important; }
        .layers-mount .gjs-layer-title{ font-size: 12px !important; font-weight: 800 !important; }

        .styles-mount .gjs-sm-sector,
        .traits-mount .gjs-trt-trait{
          border: 1px solid rgba(15,23,42,.10) !important;
          border-radius: 16px !important;
          margin-bottom: 10px !important;
          overflow: hidden !important;
          background: #fff !important;
        }
        .styles-mount .gjs-sm-title{
          font-weight: 900 !important;
          font-size: 12px !important;
          color: #0f172a !important;
        }
        .styles-mount .gjs-sm-properties{ padding: 10px 10px 12px !important; }
        .traits-mount .gjs-label{
          font-size: 11px !important;
          font-weight: 900 !important;
          color: #0f172a !important;
        }
        .traits-mount input, .traits-mount select, .traits-mount textarea{
          border-radius: 12px !important;
          border: 1px solid rgba(15,23,42,.12) !important;
          padding: 8px 10px !important;
          font-size: 12px !important;
        }

        .gjs-cv-canvas{ background: #f1f5f9 !important; }
      `}</style>
    </div>
  );
}
