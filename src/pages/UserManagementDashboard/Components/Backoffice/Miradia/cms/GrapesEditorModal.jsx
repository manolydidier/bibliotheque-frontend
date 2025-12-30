// src/pages/.../GrapesEditorModal.jsx
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
} from "react-icons/fi";

const TAILWIND_CANVAS_CSS =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production"
    ? "/assets/index.css"
    : "/src/index.css";

/* =====================
   ✅ IMPORT HTML -> split HTML/CSS/JS
   - <style>... => CSS
   - <script> inline => JS
   - supprime <link rel="stylesheet" href="/style.css"> (MIME text/html)
===================== */
function splitImportedHtml(rawHtml = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(rawHtml), "text/html");

  // CSS: collect <style>
  const styleTags = Array.from(doc.querySelectorAll("style"));
  const css = styleTags.map((s) => s.textContent || "").join("\n\n").trim();
  styleTags.forEach((s) => s.remove());

  // JS: collect inline <script> (no src)
  const scriptTags = Array.from(doc.querySelectorAll("script"));
  const inlineScripts = scriptTags
    .filter((s) => !s.getAttribute("src"))
    .map((s) => s.textContent || "")
    .join("\n\n")
    .trim();
  // Remove all scripts from imported HTML (inline + src)
  scriptTags.forEach((s) => s.remove());

  // Remove any stylesheet links (avoids /style.css -> text/html MIME error)
  const linkCss = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  linkCss.forEach((l) => l.remove());

  // Keep body content only
  const html = (doc.body ? doc.body.innerHTML : doc.documentElement?.outerHTML || "").trim();

  return { html, css, js: inlineScripts };
}

/* =====================
   AJOUTS — Palette / Resize / Presets
===================== */
const COLOR_PALETTE = [
  "#11528f", // Miradia
  "#00a0d6",
  "#0f172a",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#e2e8f0",
  "#ffffff",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
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
const PRESET_GRID_4 = `
<div class="mrd-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
  ${PRESET_CARD}
  ${PRESET_CARD}
  ${PRESET_CARD}
  ${PRESET_CARD}
</div>
`;

// =====================
// STARTER (exemple)
// =====================
const STARTER_HTML = `
<section class="mrd-hero">
  <div class="mrd-wrap">
    <p class="mrd-badge">MIRADIA • CMS</p>
    <h1>Section éditable (GrapesJS)</h1>
    <p class="mrd-lead">
      Double-clique ici pour modifier le texte. Tu peux aussi glisser des blocs depuis "Blocs".
    </p>
    <div class="mrd-actions">
      <a class="mrd-btn mrd-primary" href="#contact">Nous contacter</a>
      <a class="mrd-btn mrd-ghost" href="#services">Voir les services</a>
    </div>
  </div>
</section>

<section class="mrd-section" id="services">
  <div class="mrd-wrap">
    <h2>À propos</h2>
    <p>
      Cette zone est un exemple. Remplace par tes contenus (cards, images, etc.).
    </p>
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
    <p>Exemple de lien : <a class="mrd-link" href="mailto:contact@miradia.mg">contact@miradia.mg</a></p>
  </div>
</section>
`;

const STARTER_CSS = `
.mrd-wrap{max-width:980px;margin:0 auto;padding:0 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto}
.mrd-hero{padding:64px 0;background:radial-gradient(1200px 600px at 20% 10%, #e0f2fe, transparent 60%),radial-gradient(1000px 500px at 80% 20%, #dbeafe, transparent 55%),#fff}
.mrd-badge{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.08em;color:#0f172a;background:#e0f2fe;padding:6px 10px;border-radius:999px}
.mrd-hero h1{margin:14px 0 8px;font-size:40px;line-height:1.1;color:#11528f}
.mrd-lead{margin:0 0 18px;color:#334155;font-size:16px;max-width:64ch}
.mrd-actions{display:flex;gap:10px;flex-wrap:wrap}
.mrd-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:14px;font-weight:800;text-decoration:none;border:1px solid rgba(15,23,42,.12)}
.mrd-primary{border:none;color:#fff;background:linear-gradient(90deg,#11528f,#00a0d6)}
.mrd-ghost{color:#0f172a;background:rgba(255,255,255,.85)}
.mrd-section{padding:36px 0;background:#fff}
.mrd-section h2{margin:0 0 10px;color:#0f172a}
.mrd-section p{margin:0 0 12px;color:#475569;line-height:1.6}
.mrd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
.mrd-card{border:1px solid rgba(15,23,42,.12);border-radius:16px;padding:14px;background:#fff}
.mrd-card h3{margin:0 0 6px;color:#0f172a;font-size:14px}
.mrd-card p{margin:0;color:#475569;font-size:13px}
.mrd-link{color:#00a0d6;font-weight:700;text-decoration:none}
.mrd-link:hover{text-decoration:underline}
@media (max-width:720px){
  .mrd-hero{padding:44px 0}
  .mrd-hero h1{font-size:30px}
  .mrd-grid{grid-template-columns:1fr}
}
`;

/* =====================
   UTILITAIRES (AJOUT)
===================== */
function cx(...a) {
  return a.filter(Boolean).join(" ");
}
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** ✅ HEX -> rgba(...) avec alpha (0..1) */
function hexToRgba(hex, alpha = 1) {
  const h = String(hex || "").replace("#", "").trim();
  if (h.length !== 3 && h.length !== 6) return hex;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = clamp(alpha, 0, 1);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const BTN =
  "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition select-none";
const BTN_IDLE = "border-slate-200 bg-white hover:bg-slate-50 text-slate-700";
const BTN_PRIMARY = "border-transparent text-white";
const TAB =
  "px-3 py-2 rounded-xl text-xs font-bold border transition select-none flex items-center gap-2";
const TAB_ON = "bg-white border-slate-200 text-slate-900 shadow-sm";
const TAB_OFF = "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/60";

/* =====================
   ✅ Illustration (AJOUT)
   - côté gauche (Blocs)
===================== */
const LeftBlocksIllustration = ({ compact }) => {
  if (compact) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 mb-3 overflow-hidden relative">
      <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-sky-100 blur-2xl opacity-70" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-emerald-100 blur-2xl opacity-60" />

      <div className="flex items-start gap-3 relative z-[1]">
        <div className="shrink-0 w-12 h-12 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center">
          {/* SVG "blocks" */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7.5C4 6.119 5.119 5 6.5 5h4C11.881 5 13 6.119 13 7.5v3C13 11.881 11.881 13 10.5 13h-4C5.119 13 4 11.881 4 10.5v-3Z"
              stroke="#0ea5e9"
              strokeWidth="1.6"
            />
            <path
              d="M11 15.5c0-1.381 1.119-2.5 2.5-2.5h4c1.381 0 2.5 1.119 2.5 2.5v3c0 1.381-1.119 2.5-2.5 2.5h-4c-1.381 0-2.5-1.119-2.5-2.5v-3Z"
              stroke="#22c55e"
              strokeWidth="1.6"
            />
            <path
              d="M13.5 6h4C18.881 6 20 7.119 20 8.5v1.5"
              stroke="#11528f"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M4 18.5V17c0-1.657 1.343-3 3-3h1.5"
              stroke="#11528f"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-slate-900">
            Glisse un bloc pour construire la section
          </div>
          <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            Astuce : clique un élément dans la page ➜ change ses styles à droite (couleur + transparence + taille).
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
              Blocs
            </span>
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              Sections
            </span>
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              Cards
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function GrapesEditorModal({
  initialProject = "",
  initialHtml = "",
  initialCss = "",
  initialJs = "",
  onSave,
  onCancel,
}) {
  const editorRef = useRef(null);

  // ✅ input import HTML
  const importInputRef = useRef(null);

  // Containers (React UI)
  const canvasRef = useRef(null);
  const blocksRef = useRef(null);
  const layersRef = useRef(null);
  const stylesRef = useRef(null);
  const traitsRef = useRef(null);

  const jsTimerRef = useRef(null);
  const cssTimerRef = useRef(null);

  const [ready, setReady] = useState(false);

  // Side tabs
  const [leftTab, setLeftTab] = useState("blocks"); // blocks | layers
  const [rightTab, setRightTab] = useState("styles"); // styles | traits | code

  // Left sidebar open/compact
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftCompact, setLeftCompact] = useState(true);

  // Devices + zoom
  const [device, setDevice] = useState("Desktop");
  const [zoom, setZoom] = useState(100);

  // Code panels
  const [codeTab, setCodeTab] = useState("css"); // html | css | js
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState(String(initialJs || ""));

  // Options
  const [liveCss, setLiveCss] = useState(true);
  const [liveJs, setLiveJs] = useState(false); // par défaut OFF (sécurité)

  // Selection info
  const [selectedInfo, setSelectedInfo] = useState({
    id: "",
    tag: "",
    name: "",
    path: [],
  });

  /* ===== AJOUTS UI: palette + size sliders + lock ===== */
  const [paletteMode, setPaletteMode] = useState("bg"); // bg | text | border
  const [colorAlpha, setColorAlpha] = useState(100); // ✅ AJOUT: transparence 0..100
  const [sizeWidthPct, setSizeWidthPct] = useState(100);
  const [sizeHeightPx, setSizeHeightPx] = useState(200);
  const [isLocked, setIsLocked] = useState(false);

  const safeProject = useMemo(() => {
    if (!initialProject) return null;
    try {
      const obj = JSON.parse(initialProject);
      return obj && typeof obj === "object" ? obj : null;
    } catch {
      return null;
    }
  }, [initialProject]);

  const syncFromEditor = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    setHtmlCode(ed.getHtml() || "");
    setCssCode(ed.getCss() || "");
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

    if (liveJs) injectJsToCanvas();
  }, [htmlCode, cssCode, liveJs, injectJsToCanvas]);

  const insertExample = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;

    ed.addComponents(STARTER_HTML);
    const currentCss = (ed.getCss() || "").trim();
    if (!currentCss) ed.setStyle(STARTER_CSS);

    syncFromEditor();
    try {
      ed.runCommand("core:open-blocks");
    } catch {}
  }, [syncFromEditor]);

  /* ===== Presets rapides ===== */
  const insertPreset = useCallback(
    (presetHtml, presetCss = "") => {
      const ed = editorRef.current;
      if (!ed) return;
      ed.addComponents(presetHtml);
      if (presetCss) {
        const currentCss = (ed.getCss() || "").trim();
        ed.setStyle(`${currentCss}\n${presetCss}`.trim());
      }
      syncFromEditor();
    },
    [syncFromEditor]
  );

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

  /* ===== appliquer couleurs / sizes / lock ===== */
  const applyColorToSelected = useCallback(
    (mode, hexColor, alphaPct = 100) => {
      const ed = editorRef.current;
      const sel = ed?.getSelected?.();
      if (!sel) return;

      const alpha = clamp(Number(alphaPct) / 100, 0, 1);
      const color = hexToRgba(hexColor, alpha);

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
    },
    []
  );

  const updateSize = useCallback((prop, value) => {
    const ed = editorRef.current;
    const sel = ed?.getSelected?.();
    if (!sel) return;
    sel.addStyle({ [prop]: value });
  }, []);

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

  /* =====================
     ✅ Import HTML file
  ===================== */
  const importHtmlFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const parts = splitImportedHtml(raw);

      setHtmlCode(parts.html);
      setCssCode(parts.css);
      setJsCode(parts.js);

      const ed = editorRef.current;
      if (ed) {
        ed.setComponents(parts.html || "");
        ed.setStyle(parts.css || "");
      }
    };
    reader.readAsText(file);
  }, []);

  // INIT GrapesJS (builder-like layout)
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!blocksRef.current || !layersRef.current || !stylesRef.current || !traitsRef.current) {
      return;
    }

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
            name: "Typography",
            open: true,
            buildProps: [
              "font-family",
              "font-size",
              "font-weight",
              "letter-spacing",
              "color",
              "line-height",
              "text-align",
              "text-decoration",
            ],
          },
          { name: "Spacing", open: false, buildProps: ["margin", "padding"] },
          { name: "Size", open: false, buildProps: ["width", "height", "max-width", "min-height"] },
          {
            name: "Decorations",
            open: false,
            buildProps: ["background-color", "background", "border", "border-radius", "box-shadow", "opacity"],
          },
          {
            name: "Layout",
            open: false,
            buildProps: [
              "display",
              "flex-direction",
              "justify-content",
              "align-items",
              "gap",
              "position",
              "top",
              "left",
              "right",
              "bottom",
              "z-index",
            ],
          },
        ],
      },
      traitManager: { appendTo: traitsRef.current },

      canvas: { styles: [TAILWIND_CANVAS_CSS], scripts: [] },

      domComponents: {
        avoidInlineStyle: false,
        defaults: {
          resizable: RESIZER,
        },
      },
    });

    editorRef.current = ed;

    if (safeProject) {
      ed.loadProjectData(safeProject);
    } else {
      const hasHtml = Boolean(String(initialHtml || "").trim());
      const hasCss = Boolean(String(initialCss || "").trim());
      ed.setComponents(hasHtml ? initialHtml : STARTER_HTML);
      ed.setStyle(hasCss ? initialCss : STARTER_CSS);
    }

    // Custom blocks (MIRADIA)
    ed.BlockManager.add("mrd-hero", {
      label: "Hero MIRADIA",
      category: "MIRADIA",
      content: STARTER_HTML,
    });

    ed.BlockManager.add("mrd-section", {
      label: "Section",
      category: "MIRADIA",
      content: PRESET_SECTION,
    });

    ed.BlockManager.add("mrd-card", {
      label: "Card simple",
      category: "MIRADIA",
      content: PRESET_CARD,
    });

    ed.BlockManager.add("mrd-btn-primary", {
      label: "Bouton (primary)",
      category: "MIRADIA",
      content: PRESET_BTN_PRIMARY,
    });

    ed.BlockManager.add("mrd-btn-ghost", {
      label: "Bouton (ghost)",
      category: "MIRADIA",
      content: PRESET_BTN_GHOST,
    });

    ed.BlockManager.add("mrd-grid-2", {
      label: "Grid 2 colonnes",
      category: "MIRADIA",
      content: PRESET_GRID_2,
    });

    ed.BlockManager.add("mrd-grid-3", {
      label: "Grid 3 colonnes",
      category: "MIRADIA",
      content: `
        <div class="mrd-grid">
          <div class="mrd-card"><h3>Col 1</h3><p>Texte…</p></div>
          <div class="mrd-card"><h3>Col 2</h3><p>Texte…</p></div>
          <div class="mrd-card"><h3>Col 3</h3><p>Texte…</p></div>
        </div>
      `,
    });

    ed.BlockManager.add("mrd-grid-4", {
      label: "Grid 4 colonnes",
      category: "MIRADIA",
      content: PRESET_GRID_4,
    });

    ed.BlockManager.add("mrd-footer", {
      label: "Footer simple",
      category: "MIRADIA",
      content: `
        <footer style="padding:28px 0;border-top:1px solid rgba(15,23,42,.12)">
          <div class="mrd-wrap">
            <p style="margin:0;color:#64748b;font-size:14px">© ${new Date().getFullYear()} MIRADIA — Tous droits réservés</p>
          </div>
        </footer>
      `,
    });

    const onSel = () => updateSelectedInfo();
    ed.on("component:selected", onSel);
    ed.on("component:update", onSel);
    ed.on("component:add", onSel);
    ed.on("component:remove", onSel);

    ed.on("load", () => {
      setReady(true);
      syncFromEditor();
      updateSelectedInfo();
      setGjsDevice("Desktop");
      setCanvasZoom(100);
      if (liveJs && String(jsCode || "").trim()) injectJsToCanvas();
      try {
        ed.runCommand("core:open-blocks");
      } catch {}
    });

    const t = setTimeout(() => {
      setReady(true);
      syncFromEditor();
      updateSelectedInfo();
    }, 250);

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

  // LIVE CSS
  useEffect(() => {
    if (!liveCss || !ready) return;
    if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
    cssTimerRef.current = setTimeout(() => {
      const ed = editorRef.current;
      if (!ed) return;
      try {
        ed.setStyle(cssCode || "");
      } catch {}
    }, 250);
    return () => cssTimerRef.current && clearTimeout(cssTimerRef.current);
  }, [cssCode, liveCss, ready]);

  // LIVE JS
  useEffect(() => {
    if (!liveJs || !ready) return;
    if (jsTimerRef.current) clearTimeout(jsTimerRef.current);
    jsTimerRef.current = setTimeout(() => injectJsToCanvas(), 350);
    return () => jsTimerRef.current && clearTimeout(jsTimerRef.current);
  }, [jsCode, liveJs, ready, injectJsToCanvas]);

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

  const doSave = () => {
    const ed = editorRef.current;
    if (!ed) return;

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

  const selectionPathLabel = useMemo(() => {
    if (!selectedInfo?.path?.length) return "Aucune sélection";
    return selectedInfo.path
      .map((p) => (p.name ? `${p.tag}:${p.name}` : p.tag))
      .join("  ›  ");
  }, [selectedInfo]);

  const leftW = leftOpen ? (leftCompact ? 220 : 320) : 0;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      {/* ===================== TOP TOOLBAR ===================== */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "inline-block w-2 h-2 rounded-full",
              ready ? "bg-emerald-500" : "bg-amber-400"
            )}
          />
          <span className="text-xs font-semibold text-slate-700">
            {ready ? "Builder prêt" : "Chargement…"}
          </span>

          <div className="hidden md:flex items-center ml-3 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-600 truncate max-w-[520px]">
              <b>Sélection:</b> {selectionPathLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ✅ Import HTML hidden input */}
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

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className={cx(BTN, BTN_IDLE)}
            title="Importer un fichier HTML (réparti en HTML/CSS/JS)"
          >
            <FiRefreshCw /> Import HTML
          </button>

          {/* LEFT SIDEBAR toggle + compact */}
          <button
            type="button"
            onClick={() => setLeftOpen((v) => !v)}
            className={cx(BTN, BTN_IDLE)}
            title={leftOpen ? "Masquer la sidebar gauche" : "Afficher la sidebar gauche"}
          >
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

          {/* Undo/redo */}
          <button type="button" onClick={doUndo} className={cx(BTN, BTN_IDLE)} title="Undo">
            <FiCornerUpLeft /> Undo
          </button>
          <button type="button" onClick={doRedo} className={cx(BTN, BTN_IDLE)} title="Redo">
            <FiRepeat /> Redo
          </button>

          {/* Devices */}
          <div className="hidden sm:flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => setGjsDevice("Desktop")}
              className={cx(
                BTN,
                device === "Desktop"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : BTN_IDLE
              )}
              title="Desktop"
            >
              <FiMonitor />
            </button>
            <button
              type="button"
              onClick={() => setGjsDevice("Tablet")}
              className={cx(
                BTN,
                device === "Tablet"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : BTN_IDLE
              )}
              title="Tablet"
            >
              <FiTablet />
            </button>
            <button
              type="button"
              onClick={() => setGjsDevice("Mobile")}
              className={cx(
                BTN,
                device === "Mobile"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : BTN_IDLE
              )}
              title="Mobile"
            >
              <FiSmartphone />
            </button>
          </div>

          {/* Zoom */}
          <div className="hidden md:flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => setCanvasZoom(zoom - 10)}
              className={cx(BTN, BTN_IDLE)}
              title="Zoom -"
            >
              <FiMinus />
            </button>
            <span className="text-xs font-bold text-slate-700 w-12 text-center">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setCanvasZoom(zoom + 10)}
              className={cx(BTN, BTN_IDLE)}
              title="Zoom +"
            >
              <FiPlus />
            </button>
          </div>

          {/* Preview */}
          <button
            type="button"
            onClick={togglePreview}
            className={cx(BTN, BTN_IDLE)}
            title="Preview"
          >
            <FiEye /> Preview
          </button>

          {/* Cancel/Save */}
          <button
            type="button"
            onClick={onCancel}
            className={cx(BTN, BTN_IDLE)}
            title="Annuler"
          >
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

      {/* ===================== MAIN LAYOUT ===================== */}
      <div
        className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr]"
        style={{
          gridTemplateColumns:
            typeof window !== "undefined" && window.innerWidth >= 1024
              ? `${leftW}px 1fr 360px`
              : "1fr",
          transition: "grid-template-columns 220ms ease",
        }}
      >
        {/* ============ LEFT SIDEBAR ============ */}
        <aside
          className={cx(
            "border-r bg-white min-h-0 flex flex-col overflow-hidden",
            !leftOpen && "opacity-0 pointer-events-none"
          )}
          style={{
            width: leftOpen ? "100%" : 0,
            transition: "opacity 160ms ease",
          }}
        >
          <div className={cx("border-b bg-white", leftCompact ? "p-1.5" : "p-2")}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLeftTab("blocks")}
                className={cx(TAB, leftTab === "blocks" ? TAB_ON : TAB_OFF)}
                title="Blocs"
              >
                <FiGrid /> {!leftCompact && "Blocs"}
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("layers")}
                className={cx(TAB, leftTab === "layers" ? TAB_ON : TAB_OFF)}
                title="Layers"
              >
                <FiLayers /> {!leftCompact && "Layers"}
              </button>
            </div>

            {/* presets rapides */}
            <div className={cx("mt-2 flex items-center gap-2 flex-wrap", leftCompact && "mt-1")}>
              <button
                type="button"
                onClick={insertExample}
                className={cx(BTN, BTN_IDLE)}
                title="Ajouter un exemple"
              >
                <FiPlus /> {!leftCompact && "+ Exemple"}
              </button>
              <button
                type="button"
                onClick={syncFromEditor}
                className={cx(BTN, BTN_IDLE)}
                title="Sync depuis canvas"
              >
                <FiRefreshCw /> {!leftCompact && "Sync"}
              </button>

              {!leftCompact && (
                <>
                  <button
                    type="button"
                    onClick={() => insertPreset(PRESET_SECTION)}
                    className={cx(BTN, BTN_IDLE)}
                    title="Ajouter une section"
                  >
                    + Section
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPreset(PRESET_CARD)}
                    className={cx(BTN, BTN_IDLE)}
                    title="Ajouter une card"
                  >
                    + Card
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPreset(PRESET_BTN_PRIMARY)}
                    className={cx(BTN, BTN_IDLE)}
                    title="Ajouter un bouton"
                  >
                    + Bouton
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <div className={cx(leftCompact ? "p-1.5" : "p-2")}>
              <div className={cx(leftTab === "blocks" ? "block" : "hidden")}>
                {/* ✅ AJOUT: illustration à gauche (Blocs) */}
                <LeftBlocksIllustration compact={leftCompact} />

                {!leftCompact && (
                  <div className="text-[11px] text-slate-500 mb-2">
                    Glisse-dépose un bloc dans la page (style Divi/Elementor).
                  </div>
                )}
                <div ref={blocksRef} className="mrd-gjs blocks-mount" />
              </div>

              <div className={cx(leftTab === "layers" ? "block" : "hidden")}>
                {!leftCompact && (
                  <div className="text-[11px] text-slate-500 mb-2">
                    Structure (DOM). Clique un élément pour le sélectionner.
                  </div>
                )}
                <div ref={layersRef} className="mrd-gjs layers-mount" />
              </div>
            </div>
          </div>
        </aside>

        {/* ============ CANVAS ============ */}
        <main className="min-h-0 bg-slate-100 relative">
          {!leftOpen && (
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              className="absolute left-2 top-2 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              title="Afficher la sidebar"
            >
              <FiMenu /> Blocs
            </button>
          )}

          <div className="h-full w-full">
            <div ref={canvasRef} className="h-full w-full" />
          </div>
        </main>

        {/* ============ RIGHT SIDEBAR ============ */}
        <aside className="border-l bg-white min-h-0 flex flex-col">
          <div className="p-2 border-b bg-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRightTab("styles")}
                className={cx(TAB, rightTab === "styles" ? TAB_ON : TAB_OFF)}
              >
                <FiSliders /> Styles
              </button>
              <button
                type="button"
                onClick={() => setRightTab("traits")}
                className={cx(TAB, rightTab === "traits" ? TAB_ON : TAB_OFF)}
              >
                <FiTag /> Props
              </button>
              <button
                type="button"
                onClick={() => setRightTab("code")}
                className={cx(TAB, rightTab === "code" ? TAB_ON : TAB_OFF)}
              >
                <FiCode /> Code
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
            <div className={cx(rightTab === "styles" ? "block" : "hidden")}>
              <div className="p-2">
                <div className="text-[11px] text-slate-500 mb-2">
                  Styles : typo, spacing, size, layout…
                </div>

                {/* Palette / Taille / Lock */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-extrabold text-slate-800">
                      🎨 Palette & 📐 Taille
                    </div>

                    <button
                      type="button"
                      onClick={toggleLockSelected}
                      className={cx(
                        "px-2.5 py-1 rounded-lg border text-[11px] font-semibold bg-white hover:bg-slate-50 inline-flex items-center gap-1",
                        isLocked ? "border-amber-200 text-amber-700" : "border-slate-200 text-slate-700"
                      )}
                      title={isLocked ? "Déverrouiller l’élément" : "Verrouiller l’élément"}
                    >
                      {isLocked ? <FiUnlock /> : <FiLock />}
                      {isLocked ? "Unlock" : "Lock"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setPaletteMode("bg")}
                      className={cx(
                        "px-2.5 py-1 rounded-lg border text-[11px] font-semibold",
                        paletteMode === "bg"
                          ? "bg-white border-slate-200 text-slate-900"
                          : "bg-slate-100 border-slate-200 text-slate-600"
                      )}
                    >
                      Fond
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaletteMode("text")}
                      className={cx(
                        "px-2.5 py-1 rounded-lg border text-[11px] font-semibold",
                        paletteMode === "text"
                          ? "bg-white border-slate-200 text-slate-900"
                          : "bg-slate-100 border-slate-200 text-slate-600"
                      )}
                    >
                      Texte
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaletteMode("border")}
                      className={cx(
                        "px-2.5 py-1 rounded-lg border text-[11px] font-semibold",
                        paletteMode === "border"
                          ? "bg-white border-slate-200 text-slate-900"
                          : "bg-slate-100 border-slate-200 text-slate-600"
                      )}
                    >
                      Bordure
                    </button>
                  </div>

                  {/* ✅ AJOUT: slider de transparence */}
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-slate-700">
                        Transparence couleur
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-slate-900 w-10 text-right">
                          {colorAlpha}%
                        </span>
                        <span
                          className="w-6 h-6 rounded-lg border border-slate-200"
                          style={{
                            background:
                              `linear-gradient(45deg, rgba(15,23,42,.08) 25%, transparent 25%),` +
                              `linear-gradient(-45deg, rgba(15,23,42,.08) 25%, transparent 25%),` +
                              `linear-gradient(45deg, transparent 75%, rgba(15,23,42,.08) 75%),` +
                              `linear-gradient(-45deg, transparent 75%, rgba(15,23,42,.08) 75%),` +
                              `linear-gradient(90deg, ${hexToRgba("#00a0d6", colorAlpha / 100)}, ${hexToRgba(
                                "#11528f",
                                colorAlpha / 100
                              )})`,
                            backgroundSize: "10px 10px, 10px 10px, 10px 10px, 10px 10px, 100% 100%",
                            backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px, 0 0",
                          }}
                          title="Preview alpha"
                        />
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={colorAlpha}
                      onChange={(e) => setColorAlpha(Number(e.target.value))}
                      className="w-full mt-2"
                    />

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {[100, 85, 70, 50, 30, 15].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setColorAlpha(v)}
                          className={cx(
                            "px-2 py-1 rounded-lg border text-[10px] font-bold",
                            v === colorAlpha
                              ? "bg-sky-50 border-sky-200 text-sky-700"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                          title={`Mettre ${v}%`}
                        >
                          {v}%
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500">
                      100% = opaque • 0% = transparent (rgba)
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2 mt-3">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => applyColorToSelected(paletteMode, c, colorAlpha)}
                        className="w-7 h-7 rounded-lg border border-slate-200 shadow-sm"
                        style={{ background: c }}
                        title={`${c} • alpha ${colorAlpha}%`}
                      />
                    ))}
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">
                      Largeur ({sizeWidthPct}%)
                    </div>
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

                    <div className="text-[11px] font-bold text-slate-700 mt-2 mb-1">
                      Hauteur ({sizeHeightPx}px)
                    </div>
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

                    <div className="mt-2 text-[10px] text-slate-500">
                      ✅ Redimensionnement souris : sélectionne l’élément puis tire les poignées.
                    </div>
                  </div>
                </div>

                <div ref={stylesRef} className="mrd-gjs styles-mount" />
              </div>
            </div>

            <div className={cx(rightTab === "traits" ? "block" : "hidden")}>
              <div className="p-2">
                <div className="text-[11px] text-slate-500 mb-2">
                  Attributs/props (href, id, classes, etc.) de l’élément sélectionné.
                </div>
                <div ref={traitsRef} className="mrd-gjs traits-mount" />
              </div>
            </div>

            {rightTab === "code" && (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeTab("html")}
                    className={cx(TAB, codeTab === "html" ? TAB_ON : TAB_OFF)}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeTab("css")}
                    className={cx(TAB, codeTab === "css" ? TAB_ON : TAB_OFF)}
                  >
                    CSS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeTab("js")}
                    className={cx(TAB, codeTab === "js" ? TAB_ON : TAB_OFF)}
                  >
                    JS
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={liveCss}
                      onChange={(e) => setLiveCss(e.target.checked)}
                    />
                    Live CSS
                  </label>

                  <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={liveJs}
                      onChange={(e) => setLiveJs(e.target.checked)}
                    />
                    Live JS (test)
                  </label>

                  <button
                    type="button"
                    onClick={injectJsToCanvas}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold hover:bg-slate-50 inline-flex items-center gap-1"
                    title="Injecte le JS dans le canvas pour tester"
                  >
                    <FiPlay /> Exécuter
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={syncFromEditor}
                    className={cx(BTN, BTN_IDLE)}
                    title="Récupère HTML/CSS depuis le canvas"
                  >
                    <FiRefreshCw /> Sync
                  </button>
                  <button
                    type="button"
                    onClick={applyToEditor}
                    className={cx(BTN, BTN_IDLE)}
                    title="Applique HTML/CSS au canvas"
                  >
                    Appliquer
                  </button>
                </div>

                {codeTab === "html" && (
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="h-[420px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    placeholder="Colle ton HTML ici…"
                  />
                )}

                {codeTab === "css" && (
                  <textarea
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className="h-[420px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    placeholder="Colle ton CSS ici…"
                  />
                )}

                {codeTab === "js" && (
                  <textarea
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    className="h-[420px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    placeholder={`// Colle ton JS ici…\n// Exemple:\n// console.log("hello");`}
                  />
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                  <b>Sécurité</b> : JS injecté = test. En prod, protège (rôles, CSP,
                  validation, whitelist…).
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
            <button
              type="button"
              onClick={doSave}
              className={cx(BTN, BTN_PRIMARY)}
              style={{ background: "linear-gradient(90deg,#11528f,#00a0d6)" }}
              title="Enregistrer"
            >
              <FiSave />
            </button>
          </div>
        </aside>
      </div>

      {/* ===================== PRO SKIN (Grapes UI) ===================== */}
      <style>{`
        .mrd-gjs .gjs-one-bg { background: transparent !important; }
        .mrd-gjs .gjs-two-color { color: #0f172a !important; }
        .mrd-gjs .gjs-three-bg { background: #fff !important; }
        .mrd-gjs .gjs-four-color { color: #64748b !important; }

        /* Blocks */
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
          font-weight: 800 !important;
          color: #0f172a !important;
        }
        .blocks-mount .gjs-blocks-c{
          padding: 8px !important;
          gap: 10px !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
        }

        /* Layers */
        .layers-mount .gjs-layer{
          border-radius: 12px !important;
        }
        .layers-mount .gjs-layer-title{
          font-size: 12px !important;
          font-weight: 700 !important;
        }

        /* Styles / Traits */
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
        .styles-mount .gjs-sm-properties{
          padding: 10px 10px 12px !important;
        }
        .traits-mount .gjs-label{
          font-size: 11px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
        }
        .traits-mount input, .traits-mount select, .traits-mount textarea{
          border-radius: 12px !important;
          border: 1px solid rgba(15,23,42,.12) !important;
          padding: 8px 10px !important;
          font-size: 12px !important;
        }

        .gjs-cv-canvas{
          background: #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
}
